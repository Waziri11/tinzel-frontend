import { test, expect, openClientReview } from './fixtures.js';

const wav = Buffer.alloc(16044);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(16000, 40);
const audioFile = { name: 'changes.wav', mimeType: 'audio/wav', buffer: wav };

async function setup(page, { lang = 'en', pending = false, failure = false } = {}) {
  await page.addInitScript(language => localStorage.setItem('tinzel_language', language), lang);
  const state = {
    approvals: [], revisions: [], failed: false,
    annotations: pending ? [{ _id: 'comment-1', page: 1, version: 2, kind: 'area', text: 'Please change this photo.', authorName: 'Test Customer',
      createdAt: '2026-11-09T08:00:00Z', rects: [{ x: .2, y: .3, width: .4, height: .2 }], reviewStatus: 'private',
      attachments: [{ id: 'audio-1', name: 'Page voice note', contentType: 'audio/wav' }] }] : [],
    order: { _id: 'mobile-client', trackingId: 'TNZ-TEST', clientName: 'Test Customer', clientPreferredLanguage: lang,
      status: 'client_review', currentDraftVersion: 2, draftVersions: [1, 2].map(versionNumber => ({ versionNumber, managerReview: { status: 'approved' } })), revisionRequests: [] },
  };
  await page.route('**/api/client/order', route => route.fulfill({ json: { order: state.order } }));
  await page.route('**/api/proofs/client/**', route => {
    const url = new URL(route.request().url());
    const version = Number(url.pathname.split('/')[4]);
    if (url.pathname.includes('/attachments/')) return route.fulfill({ contentType: 'audio/wav', body: wav });
    if (url.pathname.includes('/annotations/')) { state.annotations = []; return route.fulfill({ json: { annotations: [] } }); }
    if (url.pathname.includes('/pages/')) return url.searchParams.has('text')
      ? route.fulfill({ json: { width: 600, height: 800, geometryVersion: 3, text: [], imageRegions: [] } })
      : route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/><text x="60" y="100" font-size="24">Your magazine</text></svg>' });
    return route.fulfill({ json: { state: 'ready', pageCount: 2, pages: [1, 2].map(page => ({ page, width: 600, height: 800 })),
      canComment: version === 2 && state.order.status === 'client_review', annotations: version === 2 ? state.annotations : [] } });
  });
  await page.route('**/api/client/approve-draft', route => {
    state.approvals.push(route.request().postDataJSON()); state.order.status = 'client_approved'; state.order.approvedVersionNumber = 2;
    return route.fulfill({ json: { order: state.order } });
  });
  await page.route('**/api/client/request-revision', route => {
    state.revisions.push({ type: route.request().headers()['content-type'], body: route.request().postDataBuffer()?.toString() || '' });
    if (failure && !state.failed) { state.failed = true; return route.fulfill({ status: 503, json: { message: 'Please check your request status.' } }); }
    state.annotations = state.annotations.map(annotation => ({ ...annotation, submittedAt: new Date().toISOString() }));
    state.order.status = 'revision_requested';
    return route.fulfill({ json: { order: state.order } });
  });
  await page.goto('/track');
  await expect(page.getByAltText('Magazine page 1', { exact: true })).toBeVisible();
  return state;
}

for (const width of [320, 390, 440]) test(`client mobile review combines saved comments and notes at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 844 });
  const state = await setup(page, { pending: true });
  await expect.poll(() => page.locator('.pdf-book').evaluate(reader => reader.scrollWidth <= reader.clientWidth + 2)).toBe(true);
  await expect(page.getByRole('button', { name: 'Approve for printing', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  expect((await page.locator('.proof-stage').boundingBox()).height).toBeGreaterThan(550);
  await page.screenshot({ path: info.outputPath(`client-reader-${width}.png`) });
  await page.getByRole('button', { name: 'Comments (1)', exact: true }).click();
  const comments = page.getByRole('dialog', { name: 'Comments · 1', exact: true });
  await comments.getByRole('button', { name: 'Listen to audio comment', exact: true }).click();
  await expect.poll(() => comments.locator('audio').evaluate(audio => audio.readyState)).toBeGreaterThan(0);
  await comments.getByRole('button', { name: 'Review & send (1)', exact: true }).click();
  const review = page.getByRole('dialog', { name: 'Review magazine', exact: true });
  await expect(comments).toHaveCount(0);
  await expect(review.getByRole('button', { name: 'Approve for printing', exact: true })).toBeDisabled();
  await page.screenshot({ path: info.outputPath(`client-review-${width}.png`) });
  await review.getByRole('button', { name: 'Add a note or voice message', exact: true }).click();
  await review.getByLabel('Written feedback 1', { exact: true }).fill('Please keep the headings consistent.');
  await review.getByRole('button', { name: 'Close review', exact: true }).click();
  await openClientReview(page);
  await expect(review.getByLabel('Written feedback 1', { exact: true })).toHaveValue('Please keep the headings consistent.');
  await page.screenshot({ path: info.outputPath(`client-notes-${width}.png`) });
  await review.getByRole('button', { name: 'Send my changes', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Send these changes to Tinzel?' });
  await expect(confirmation).toBeInViewport();
  expect(state.revisions).toHaveLength(0);
  await confirmation.getByRole('button', { name: 'Send my changes', exact: true }).click();
  await expect.poll(() => state.revisions.length).toBe(1);
  expect(JSON.parse(state.revisions[0].body)).toMatchObject({ expectedVersion: 2, items: [{ text: 'Please keep the headings consistent.', pageReference: '' }] });
  await expect(review).toHaveCount(0);
  await expect(page.locator('.pdf-book.is-expanded')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Review magazine', exact: true })).toHaveCount(0);
});

for (const lang of ['en', 'sw']) test(`client mobile approval works in fullscreen and prompts for delivery in ${lang}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page, { lang });
  await page.getByRole('button', { name: lang === 'en' ? 'Fullscreen' : 'Skrini nzima', exact: true }).click();
  await openClientReview(page);
  const approve = lang === 'en' ? 'Approve for printing' : 'Idhinisha uchapishaji';
  await page.getByRole('button', { name: approve, exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: lang === 'en' ? 'Approve this magazine for printing?' : 'Uidhinishe jarida hili kwa uchapishaji?' });
  await expect(confirmation.getByRole('button', { name: approve, exact: true })).toBeInViewport();
  expect(state.approvals).toHaveLength(0);
  await confirmation.getByRole('button', { name: approve, exact: true }).click();
  await expect.poll(() => state.approvals.length).toBe(1);
  await expect(page.locator('.pdf-book.is-expanded')).toHaveCount(0);
  await expect(page.locator('#delivery-location')).toBeFocused();
});

test('client mobile notes and audio survive closing, short screens and a failed request', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page, { failure: true });
  await openClientReview(page);
  const review = page.getByRole('dialog', { name: 'Review magazine', exact: true });
  await review.getByRole('button', { name: 'Request changes', exact: true }).click();
  await review.getByLabel('Written feedback 1', { exact: true }).fill('Keep this message.');
  await review.locator('input[type="file"]').setInputFiles(audioFile);
  await expect(review.getByLabel('Preview audio feedback')).toBeVisible();
  await review.getByRole('button', { name: 'Close review', exact: true }).click();
  await openClientReview(page);
  await expect(review.getByLabel('Written feedback 1', { exact: true })).toHaveValue('Keep this message.');
  await expect(review.getByLabel('Preview audio feedback')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 430 });
  await review.getByRole('button', { name: 'Send my changes', exact: true }).scrollIntoViewIfNeeded();
  await expect(review.getByRole('button', { name: 'Close review', exact: true })).toBeInViewport();
  await expect(review.getByRole('button', { name: 'Send my changes', exact: true })).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  await review.getByRole('button', { name: 'Send my changes', exact: true }).click();
  await page.getByRole('dialog', { name: 'Send these changes to Tinzel?' }).getByRole('button', { name: 'Send my changes', exact: true }).click();
  await expect(review.getByText('Please check your request status.')).toBeVisible();
  await expect(review.getByRole('button', { name: 'Send my changes', exact: true })).toBeDisabled();
  await review.getByRole('button', { name: 'Check decision status', exact: true }).click();
  await expect(review.getByLabel('Written feedback 1', { exact: true })).toHaveValue('Keep this message.');
  await expect(review.getByLabel('Preview audio feedback')).toBeVisible();
  await page.screenshot({ path: info.outputPath('client-audio-retry.png') });
  await review.getByRole('button', { name: 'Send my changes', exact: true }).click();
  await page.getByRole('dialog', { name: 'Send these changes to Tinzel?' }).getByRole('button', { name: 'Send my changes', exact: true }).click();
  await expect.poll(() => state.revisions.length).toBe(2);
  expect(state.revisions[1].type).toContain('multipart/form-data');
  expect(state.revisions[1].body).toContain('changes.wav');
});

test('client mobile saved-only changes can be sent and historical versions stay read-only', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page, { pending: true });
  await page.getByLabel('Magazine version', { exact: true }).selectOption('1');
  await openClientReview(page);
  const review = page.getByRole('dialog', { name: 'Review magazine', exact: true });
  await expect(review.getByRole('button', { name: 'Approve for printing', exact: true })).toBeDisabled();
  await expect(review.getByRole('button', { name: 'Request changes', exact: true })).toBeDisabled();
  await review.getByRole('button', { name: 'Close review', exact: true }).click();
  await page.getByLabel('Magazine version', { exact: true }).selectOption('2');
  await openClientReview(page);
  await review.getByRole('button', { name: 'Send my changes (1)', exact: true }).click();
  await page.getByRole('dialog', { name: 'Send these changes to Tinzel?' }).getByRole('button', { name: 'Send my changes', exact: true }).click();
  await expect.poll(() => state.revisions.length).toBe(1);
  expect(JSON.parse(state.revisions[0].body)).toMatchObject({ items: [], expectedVersion: 2 });
});
