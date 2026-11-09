import { test, expect } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { securityLogin } from './security-login.js';

const wav = Buffer.alloc(16044);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(16000, 40);

// Real API + disposable database: exercise the gap between page attachments and return audio.
for (const source of ['manager', 'client']) test(`${source} page audio reaches the designer returns list and correction checklist`, async ({ page, request }, info) => {
  await page.setViewportSize({ width: source === 'client' ? 390 : 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  const seed = await request.post(`http://127.0.0.1:${process.env.SECURITY_TEST_SINK_PORT || 5078}/__test__/comment-audio-order?source=${source}`);
  expect(seed.ok()).toBe(true);
  const { orderId, clientToken } = await seed.json();
  const token = source === 'client' ? clientToken : await securityLogin(page.request, 'manager');
  const headers = { Authorization: `Bearer ${token}`, Cookie: '' };
  const proofPath = `/api/proofs/${source === 'client' ? 'client' : `staff/${orderId}`}/1`;
  await expect.poll(async () => (await (await request.get(proofPath, { headers })).json()).pageCount).toBeGreaterThan(0);
  const reserved = await request.post(`${proofPath}/attachments`, { headers, data: { clientId: randomUUID(), name: 'correction.wav', size: wav.length, contentType: 'audio/wav' } });
  expect(reserved.ok()).toBe(true);
  const { id } = await reserved.json();
  expect((await request.put(`${proofPath}/attachments/${id}/chunks/0`, { headers: { ...headers, 'Content-Type': 'application/octet-stream' }, data: wav })).ok()).toBe(true);
  expect((await request.post(`${proofPath}/attachments/${id}/complete`, { headers, data: {} })).ok()).toBe(true);
  expect((await request.post(`${proofPath}/annotations`, { headers, data: { clientMutationId: randomUUID(), page: 1, kind: 'area',
    rects: [{ x: .1, y: .1, width: .2, height: .2 }], text: source === 'client' ? 'Please follow my voice note' : '', attachmentIds: [id] } })).ok()).toBe(true);
  const returned = await request.post(source === 'client' ? '/api/client/request-revision' : `/api/manager/orders/${orderId}/review-draft`, {
    headers, data: { expectedVersion: 1, items: [], ...(source === 'manager' ? { action: 'return_to_designer', feedback: '' } : {}) },
  });
  expect(returned.ok(), await returned.text()).toBe(true);
  await securityLogin(page.request, 'designer');
  await page.goto('/staff/returns');
  await page.getByRole('textbox', { name: 'Search returned magazines', exact: true }).fill(`AUDIO-RETURN-${orderId}`);
  await page.getByRole('textbox', { name: 'Search returned magazines', exact: true }).press('Enter');
  const card = page.getByRole('row').filter({ hasText: `Audio return ${source}` });
  await expect(card).toHaveCount(1);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Play audio feedback', exact: true }).click();
  const player = card.getByLabel('Audio feedback', { exact: true });
  await expect.poll(() => player.evaluate(audio => audio.readyState)).toBeGreaterThan(0);
  expect(await player.evaluate(audio => audio.duration)).toBe(1);
  await card.screenshot({ path: info.outputPath(`return-audio-${source}.png`) });
  await page.goto(`/staff/design/orders/${orderId}`);
  await page.getByRole('tab', { name: 'Corrections', exact: true }).click();
  const checklist = page.locator('.fix-round');
  const played = page.waitForResponse(response => response.url().includes(`/orders/${orderId}/revisions/`) && response.url().endsWith('/audio'));
  await checklist.getByRole('button', { name: 'Play audio feedback', exact: true }).click();
  expect((await played).status()).toBe(200);
  const checklistPlayer = checklist.getByLabel('Audio feedback', { exact: true });
  await expect.poll(() => checklistPlayer.evaluate(audio => audio.readyState)).toBeGreaterThan(0);
  const receivedHash = await checklistPlayer.evaluate(async audio => {
    const bytes = await (await fetch(audio.src)).arrayBuffer();
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  });
  expect(receivedHash).toBe(createHash('sha256').update(wav).digest('hex'));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
