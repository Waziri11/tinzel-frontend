import { test, expect } from '@playwright/test';
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../tinzel-backend/package.json', import.meta.url));
const sharp = require('sharp');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('browser uploads preserve covers, PDFs and review images and use lossless compressed parts', async ({ page, request }) => {
  const fixture = await (await request.post('http://127.0.0.1:5078/__test__/upload-fixtures')).json();
  await page.goto('/');
  const png = await sharp(randomBytes(1400 * 1200 * 3), { raw: { width: 1400, height: 1200, channels: 3 } }).png().toBuffer();
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(12 * 1024 * 1024, 32), Buffer.from('\n%%EOF')]);
  let compressed = 0, batches = 0;
  page.on('request', r => { if (r.url().includes('/batches/')) batches++; if (/\/(chunks|batches)\//.test(r.url()) && r.headers()['content-encoding'] === 'gzip') compressed++; });
  const output = await page.evaluate(async ({ fixture, png, pdf }) => {
    const { api, proofApi } = await import('/src/services/api.js');
    const { transferDraft } = await import('/src/services/draftUpload.js');
    const bytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
    const image = new File([bytes(png)], 'original.png', { type: 'image/png' });
    const document = new File([bytes(pdf)], 'original.pdf', { type: 'application/pdf' });
    const cover = await api.admin.uploadCover(fixture.adminToken, image);
    const readyDraft = await transferDraft({ token: fixture.designerToken, staffId: fixture.designerId,
      orderId: fixture.draftId, file: document, metadata: { expectedVersion: 0 }, signal: new AbortController().signal, deferSubmission: true });
    const form = new FormData(); form.append('printFile', document); form.append('quantity', '1');
    await api.designer.uploadPrintDocument(fixture.designerToken, fixture.printId, form);
    const reader = proofApi(fixture.adminToken, fixture.reviewId, 1);
    const attachment = await reader.uploadAttachment(image, crypto.randomUUID());
    const original = await reader.attachmentFile(attachment.id, false);
    const hash = async buffer => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))].map(b => b.toString(16).padStart(2,'0')).join('');
    return { coverUrl: cover.coverUrl, readyDraft: readyDraft.readyForReview, attachmentHash: await hash(await original.arrayBuffer()), type: original.type };
  }, { fixture, png: png.toString('base64'), pdf: pdf.toString('base64') });
  expect(sha(await (await request.get(output.coverUrl)).body())).toBe(sha(png));
  expect(output.attachmentHash).toBe(sha(png)); expect(output.type).toBe('image/png'); expect(output.readyDraft).toBe(true);
  for (const id of [fixture.draftId, fixture.printId]) {
    const result = await (await request.get(`http://127.0.0.1:5078/__test__/upload-digest/${id}`)).json();
    expect(result.sha256).toBe(sha(pdf)); expect(result.size).toBe(pdf.length);
  }
  expect(compressed).toBeGreaterThanOrEqual(4); expect(batches).toBeGreaterThanOrEqual(6);
});

test('small files use the fast path and a lost response resumes without a duplicate upload', async ({ page, request }) => {
  const fixture = await (await request.post('http://127.0.0.1:5078/__test__/upload-fixtures')).json();
  await page.goto('/');
  const png = await sharp(randomBytes(400 * 300 * 3), { raw: { width: 400, height: 300, channels: 3 } }).png().toBuffer();
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(1500000, 32), Buffer.from('\n%%EOF')]);
  let dropped = false, uploadedParts = 0, wholeUploads = 0;
  page.on('request', r => { if (/\/(chunks|batches)\//.test(r.url())) uploadedParts++; if (r.url().endsWith('/whole')) wholeUploads++; });
  await page.route('**/api/staff/file-uploads/whole', async route => {
    if (dropped) return route.continue();
    dropped = true; const response = await route.fetch(); expect(response.ok()).toBe(true);
    await route.abort('failed');
  });
  const output = await page.evaluate(async ({ fixture, png, pdf }) => {
    const { api } = await import('/src/services/api.js');
    const { transferDraft } = await import('/src/services/draftUpload.js');
    const bytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
    const image = new File([bytes(png)], 'small.png', { type: 'image/png' });
    const document = new File([bytes(pdf)], 'small.pdf', { type: 'application/pdf' });
    const cover = await api.admin.uploadCover(fixture.adminToken, image);
    const draft = await transferDraft({ token: fixture.designerToken, staffId: fixture.designerId, orderId: fixture.draftId,
      file: document, metadata: { expectedVersion: 0 }, deferSubmission: true });
    const form = new FormData(); form.append('printFile', document); form.append('quantity', '1');
    await api.designer.uploadPrintDocument(fixture.designerToken, fixture.printId, form);
    return { coverUrl: cover.coverUrl, ready: draft.readyForReview };
  }, { fixture, png: png.toString('base64'), pdf: pdf.toString('base64') });
  expect(dropped).toBe(true); expect(wholeUploads).toBe(3); expect(uploadedParts).toBe(0); expect(output.ready).toBe(true);
  expect(sha(await (await request.get(output.coverUrl)).body())).toBe(sha(png));
  for (const id of [fixture.draftId, fixture.printId]) {
    const saved = await (await request.get(`http://127.0.0.1:5078/__test__/upload-digest/${id}`)).json();
    expect(saved.sha256).toBe(sha(pdf)); expect(saved.size).toBe(pdf.length);
  }
});
