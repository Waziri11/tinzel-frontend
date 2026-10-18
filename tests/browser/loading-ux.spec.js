import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const photo = (name, size = 150000) => ({ name, mimeType: 'image/jpeg', buffer: Buffer.alloc(size, 42) });
async function openForm(page, sw = false) {
  await page.goto('/');
  await page.getByRole('button', { name: sw ? 'Kiswahili SW' : 'English EN' }).click();
  await page.getByText(sw ? 'Oda Mpya ya Jarida' : 'New Magazine Order', { exact: true }).click();
  await page.getByText('Upload Performance Test', { exact: true }).click();
  await expect(page.locator('#upload-first')).toBeAttached();
}

test('branded catalogue loading respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route('**/api/public/forms', async (route) => { await gate; await route.continue(); });
  try {
    await page.goto('/'); await page.getByRole('button', { name: 'English EN' }).click();
    await page.getByText('New Magazine Order', { exact: true }).click();
    await expect(page.getByText('Finding the right edition for your story.')).toBeVisible();
    await expect(page.locator('.tinzel-loading .tinzel-mark img')).toHaveCSS('animation-name', 'none');
  } finally { release(); }
  await expect(page.getByText('Upload Performance Test', { exact: true })).toBeVisible();
});

test('upload stays interactive, confirms before 100%, collapses successes and shows real save stages', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let releaseComplete, releaseSubmit;
  const completionGate = new Promise((resolve) => { releaseComplete = resolve; });
  const submitGate = new Promise((resolve) => { releaseSubmit = resolve; });
  let completionHeld = false;
  await page.route('**/complete', async (route) => { completionHeld = true; await completionGate; await route.continue(); });
  await page.route('**/submit', async (route) => { await submitGate; await route.continue(); });
  try {
    await openForm(page);
    await page.locator('#upload-first').setInputFiles(photo('story.jpg', 2200000));
    await expect.poll(() => completionHeld).toBe(true);
    await expect(page.getByText('Confirming your photo…')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Overall photo upload' })).toHaveAttribute('value', '99');
    await expect(page.getByText('Your photos are ready', { exact: true })).toHaveCount(0);
    await page.locator('#magazine-client-name').fill('My Tinzel Story');
    await page.getByPlaceholder('e.g. +255712345678').fill('+255700000007');
    await expect(page.getByRole('link', { name: 'Return to upload progress' })).toBeVisible();
    await page.locator('#photo-progress').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('uploading-mobile.png') });
    releaseComplete();
    await expect(page.getByText('Photos ready: 1/1', { exact: true })).toBeVisible();
    await expect(page.getByText('Your photos are ready', { exact: true })).toBeVisible();
    await expect.poll(() => page.locator('.tinzel-upload__completed').evaluate((element) => element.open)).toBe(false);
    await expect(page.getByText('Upload recovery saved', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Return to upload progress' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Continue with your details' }).click();
    await expect(page.locator('#magazine-client-name')).toBeFocused();
    await page.getByRole('button', { name: /Continue.*Pay/i }).click();
    await expect(page.getByRole('heading', { name: 'Saving your order' })).toBeVisible();
    await expect(page.getByText('Your order has been saved', { exact: true })).toHaveCount(0);
    releaseSubmit();
    await expect(page.getByText('Your order has been saved', { exact: true })).toBeVisible();
    await expect(page.getByText('Your order has been saved', { exact: true })).toBeInViewport();
    await expect(page.getByText('Do not pay this test order.')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('order-saved-mobile.png') });
  } finally { releaseComplete(); releaseSubmit(); }
});

test('slow transfers explain the wait without invented time estimates', async ({ page }) => {
  let release, held = false;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route('**/chunks/*', async (route) => { held = true; await gate; await route.continue(); });
  try {
    await page.clock.install(); await openForm(page);
    await page.locator('#upload-first').setInputFiles(photo('waiting.jpg'));
    await expect.poll(() => held).toBe(true);
    await page.clock.fastForward(21000);
    await expect(page.getByText(/This is taking longer than usual/)).toBeVisible();
    await expect(page.locator('#magazine-client-name')).toBeEnabled();
  } finally { release(); }
  await expect(page.getByText('Photos ready: 1/1', { exact: true })).toBeVisible();
});

test('unavailable browser storage does not claim recovery was saved', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('tinzel:uploads:')) throw new DOMException('Storage full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await openForm(page);
  await page.locator('#upload-first').setInputFiles(photo('storage.jpg'));
  await expect(page.getByText('Photos ready: 1/1', { exact: true })).toBeVisible();
  await expect(page.getByText('Keep this page open', { exact: true })).toBeVisible();
  await expect(page.getByText('Upload recovery saved', { exact: true })).toHaveCount(0);
});

test('upload milestones are localized in Kiswahili', async ({ page }) => {
  await openForm(page, true);
  await page.locator('#upload-first').setInputFiles(photo('hadithi.jpg'));
  await expect(page.getByText('Picha zako ziko tayari', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Endelea na taarifa zako' })).toBeVisible();
});

test('staff can refresh pending previews and browse while an archive prepares', async ({ page }, testInfo) => {
  test.setTimeout(30000);
  // UI contract test only: synthetic staff/session and mocked job states, no real account.
  const order = { _id: 'ux-order', trackingId: 'TNZ-UX-TEST', submissionId: 'SUB-UX', clientName: 'UX Test', clientWhatsApp: '0000000000',
    status: 'in_design', formTitle: 'Test Edition', updatedAt: new Date().toISOString(),
    uploadedPhotos: [{ url: '/ux-original.jpg', thumbnailUrl: '/ux-thumbnail.webp', originalName: 'story.jpg', folderName: 'My story' }], draftVersions: [] };
  const other = { ...order, _id: 'ux-other', trackingId: 'TNZ-OTHER', uploadedPhotos: [] };
  const json = (route, data) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  await page.addInitScript(() => localStorage.setItem('tinzel_staff_token', 'synthetic-ui-test'));
  await page.route('**/api/staff/me', (route) => json(route, { user: { _id: 'ux-staff', name: 'Test Designer', role: 'designer', isActive: true } }));
  await page.route((url) => url.pathname === '/api/designer/orders', (route) => json(route, { orders: [order, other] }));
  await page.route('**/api/designer/orders/ux-order', (route) => json(route, { order }));
  await page.route('**/api/designer/orders/ux-other', (route) => json(route, { order: other }));
  let previewReady = false, jobReady = false, archiveRequests = [];
  await page.route('**/ux-thumbnail.webp*', (route) => previewReady
    ? route.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(new URL('../../public/brand/magazine-cover-sample.jpg', import.meta.url)) })
    : route.fulfill({ status: 404, body: 'Preview pending' }));
  await page.route('**/api/designer/orders/*/photo-folder-download', (route) => {
    archiveRequests.push(route.request().url());
    return json(route, { state: jobReady ? 'ready' : 'queued', jobId: 'ux-job', url: '/ux-download.zip' });
  });
  await page.route('**/api/designer/orders/ux-order/media-jobs/ux-job', (route) => json(route, { state: jobReady ? 'ready' : 'running', jobId: 'ux-job', url: '/ux-download.zip' }));
  await page.route('**/ux-download.zip', (route) => route.fulfill({ contentType: 'application/zip', headers: { 'Content-Disposition': 'attachment; filename="ux-test.zip"' }, body: 'Synthetic UI download' }));
  await page.goto('/'); await page.getByRole('button', { name: 'English EN' }).click();
  await page.getByRole('button', { name: /Login/ }).click();
  await page.getByText('TNZ-UX-TEST', { exact: true }).click();
  await page.getByRole('button', { name: 'Download folder ZIP', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByText('Preview pending', { exact: true })).toBeVisible();
  previewReady = true;
  await page.getByRole('button', { name: 'Refresh preview for story.jpg' }).click();
  await expect(page.locator('.tinzel-preview-placeholder')).toHaveCount(0);
  await page.getByRole('button', { name: 'Download folder ZIP', exact: true }).click();
  await expect(page.getByText('Preparing your photo folder', { exact: true })).toBeVisible();
  await page.getByText('TNZ-OTHER', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'TNZ-OTHER' })).toBeVisible();
  const downloading = page.waitForEvent('download'); jobReady = true; await downloading;
  await expect(page.getByText('Your photo folder is ready', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('folder-ready-desktop.png') });
  const secondDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download again', exact: true }).click(); await secondDownload;
  expect(archiveRequests).toHaveLength(2);
  expect(archiveRequests.every((url) => url.includes('/ux-order/'))).toBe(true);
});
