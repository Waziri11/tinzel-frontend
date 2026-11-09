import { readFileSync } from 'node:fs';
import { test, expect, chooseEnglish } from './fixtures.js';

const thumbnail = readFileSync(new URL('../../../tinzel-backend/tests/fixtures/review-reference.png', import.meta.url));
const originals = [
  { id: 'image-1', name: 'Replacement portrait.png', contentType: 'image/webp', bytes: readFileSync(new URL('../../public/brand/soft-flutter-poster.webp', import.meta.url)), filename: 'Replacement portrait.webp' },
  { id: 'image-2', name: 'Cover reference.jpeg', contentType: 'image/jpeg', bytes: readFileSync(new URL('../../public/brand/magazine-cover-sample.jpg', import.meta.url)), filename: 'Cover reference.jpg' },
];

async function setup(page) {
  const requests = [], failures = new Set();
  let nextDownloadGate;
  const annotations = originals.map((image, i) => ({
    _id: `annotation-${i + 1}`, page: 1, displayNumber: i + 1, kind: 'area',
    rects: [{ x: .1, y: .1 + i * .3, width: .2, height: .2 }],
    text: `Use the attached ${i ? 'cover' : 'portrait'}`, authorName: i ? 'Customer' : 'Manager',
    source: i ? 'client' : 'manager', createdAt: '2026-11-09T06:00:00Z', submittedAt: '2026-11-09T06:01:00Z',
    attachments: [{ id: image.id, name: image.name, contentType: image.contentType }],
  }));
  const order = { _id: 'order-1', clientName: 'Test customer', formTitle: 'Magazine', status: 'revision_requested',
    currentDraftVersion: 1, draftVersions: [{ _id: 'draft-1', versionNumber: 1, uploadedAt: '2026-11-09T05:00:00Z' }],
    revisionRequests: [], uploadedPhotos: [] };
  await page.addInitScript(() => {
    localStorage.setItem('tinzel_language', 'en');
    localStorage.setItem('tinzel_staff_token', 'designer-download-test');
  });
  await page.route('**/api/staff/me', route => route.fulfill({ json: { user: { _id: 'designer-1', name: 'Test Designer', role: 'designer', preferredLanguage: 'en', isActive: true } } }));
  await page.route('**/api/designer/orders/order-1', route => route.fulfill({ json: { order, auditLogs: [] } }));
  await page.route('**/api/proofs/staff/order-1/1**', async route => {
    const request = route.request(), url = new URL(request.url());
    expect(request.method()).toBe('GET');
    if (url.pathname.includes('/attachments/')) {
      const id = url.pathname.split('/').at(-1);
      const asset = originals.find(image => image.id === id);
      expect(asset).toBeTruthy();
      if (url.searchParams.has('thumbnail')) return route.fulfill({ contentType: 'image/png', body: thumbnail });
      requests.push(id);
      const gate = nextDownloadGate; nextDownloadGate = undefined;
      if (gate) await gate;
      if (failures.delete(id)) return route.fulfill({ status: 503, json: { message: 'Image download interrupted' } });
      return route.fulfill({ contentType: asset.contentType, body: asset.bytes });
    }
    if (url.pathname.includes('/pages/')) {
      if (url.searchParams.has('text')) return route.fulfill({ json: { width: 600, height: 800, text: [] } });
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/></svg>' });
    }
    return route.fulfill({ json: { state: 'ready', pageCount: 1, pages: [{ page: 1 }], annotations, canComment: false } });
  });
  await page.goto('/staff/design/orders/order-1');
  await chooseEnglish(page);
  await page.getByRole('button', { name: 'Comments (2)', exact: true }).click();
  await expect(page.getByRole('button', { name: `Download image: ${originals[0].name}`, exact: true })).toBeVisible();
  return { requests, failures, holdNextDownload() { let release; nextDownloadGate = new Promise(resolve => { release = resolve; }); return release; } };
}

async function verifyDownload(page, button, asset) {
  const downloaded = page.waitForEvent('download');
  await button.click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe(asset.filename);
  expect(await download.failure()).toBeNull();
  expect(readFileSync(await download.path())).toEqual(asset.bytes);
}

for (const width of [1280, 320]) {
  test(`designer downloads each comment's full image from its card and preview at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const { requests } = await setup(page);
    for (const asset of originals) await verifyDownload(page, page.getByRole('button', { name: `Download image: ${asset.name}`, exact: true }), asset);
    expect(requests).toEqual(['image-1', 'image-2']);
    await page.getByRole('button', { name: `Open image: ${originals[0].name}`, exact: true }).click();
    const viewer = page.getByRole('dialog', { name: 'Attached image', exact: true });
    await expect(viewer.getByRole('img')).toBeVisible();
    await verifyDownload(page, viewer.getByRole('button', { name: `Download image: ${originals[0].name}`, exact: true }), originals[0]);
    expect(await viewer.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await viewer.screenshot({ path: testInfo.outputPath('image-preview-download.png') });
    await viewer.getByRole('button', { name: 'Close image', exact: true }).click();
    await expect(viewer).toHaveCount(0);
    const comments = page.getByRole('complementary', { name: 'Magazine comments', exact: true });
    expect(await comments.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await comments.screenshot({ path: testInfo.outputPath('comment-image-downloads.png') });
  });
}

test('an interrupted image download offers retry and prevents duplicate downloads while loading', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { requests, failures, holdNextDownload } = await setup(page);
  failures.add('image-1');
  const release = holdNextDownload();
  await page.getByRole('button', { name: `Download image: ${originals[0].name}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Downloading…: ${originals[0].name}`, exact: true })).toBeDisabled();
  release();
  await expect(page.getByRole('alert').filter({ hasText: 'Image could not download. Please try again.' })).toBeVisible();
  await verifyDownload(page, page.getByRole('button', { name: `Retry download: ${originals[0].name}`, exact: true }), originals[0]);
  await expect(page.getByText('Image could not download. Please try again.')).toHaveCount(0);
  expect(requests).toEqual(['image-1', 'image-1']);
});
