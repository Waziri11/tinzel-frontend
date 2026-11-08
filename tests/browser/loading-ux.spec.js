import { test, expect, chooseEnglish } from './fixtures.js';
import fs from 'node:fs';

const photo = (name, size = 150000) => ({ name, mimeType: 'image/jpeg', buffer: Buffer.alloc(size, 42) });
async function openForm(page, sw = false) {
  await page.addInitScript(lang=>localStorage.setItem('tinzel_language',lang),sw?'sw':'en');
  await page.goto('/catalogue/upload-performance-test?step=photos');
  await expect(page.locator('#upload-first')).toBeAttached();
}

test('catalogue skeleton appears during navigation and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route('**/api/public/forms', async (route) => { await gate; await route.continue(); });
  try {
    await page.goto('/'); await chooseEnglish(page);
    await page.getByText('New Magazine Order', { exact: true }).click();
    await expect(page.locator('.page-skeleton[aria-busy="true"]')).toBeVisible();
    await expect(page.locator('.page-skeleton__grid.is-catalogue')).toBeVisible();
    await expect(page.locator('.page-skeleton__block').first()).toHaveCSS('animation-name', 'none');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { release(); }
  await expect(page.getByText('Upload Performance Test', { exact: true })).toBeVisible();
  await expect(page.locator('.page-skeleton')).toHaveCount(0);
});

test('side upload panel stays interactive, confirms before previews and shows real save stages', async ({ page }, testInfo) => {
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
    const activity = page.getByRole('complementary', { name: 'Photo uploads', exact: true });
    await activity.getByRole('button', { name: 'Expand photo uploads' }).click();
    await expect(page.getByText('Confirming your photo…')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: /^Photo upload progress:/ })).toHaveAttribute('value', '99');
    await expect(page.locator('[data-field-id=first] .photo-field__gallery')).toHaveCount(0);
    await expect(page.locator('[data-field-id=first]').getByRole('progressbar')).toHaveCount(0);
    await activity.getByRole('button', { name: 'Minimize photo uploads' }).click();
    await page.getByRole('button',{name:'1 Your details'}).click();
    await expect(activity).toBeVisible();
    await expect(activity.getByRole('button', { name: 'Expand photo uploads' })).toHaveAttribute('aria-expanded', 'false');
    await page.locator('#magazine-client-name').fill('My Tinzel Story');
    await page.getByPlaceholder('e.g. +255712345678').fill('+255700000007');
    await page.getByRole('button',{name:'3 Photographs'}).click();
    await page.locator('[data-field-id=first]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('uploading-mobile.png') });
    releaseComplete();
    await expect(page.getByText('Photos ready: 1/1', { exact: true })).toBeVisible();
    await expect(activity.getByText('Photos uploaded · 1/1', { exact: true })).toBeVisible();
    await expect(page.locator('[data-field-id=first] .photo-field__preview')).toBeVisible();
    await expect(page.locator('[data-field-id=second] .photo-field__status')).toHaveCount(0);
    await expect(page.locator('.tinzel-upload')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Return to upload progress' })).toHaveCount(0);
    await page.getByRole('button',{name:'4 Review',exact:true}).click();
    await page.getByRole('button', { name: /Continue.*Pay/i }).click();
    await expect(page.getByRole('button', { name: /Saving your order/ })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Your photos are taking longer', exact: true })).toBeVisible();
    await expect(page.getByText('Completed photos are saved. Wait for the remaining files, or retry any that fail.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '1 Your details', exact: true }).click();
    await expect(page.locator('#magazine-client-name')).toBeEnabled();
  } finally { release(); }
  await page.getByRole('button', { name: '3 Photographs', exact: true }).click();
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
  await expect(page.getByText('Picha zimepakiwa · 1/1', { exact: true })).toBeVisible();
  await expect(page.locator('[data-field-id=first] .photo-field__preview')).toBeVisible();
});

test('staff can refresh pending previews and browse while an archive prepares', async ({ page }, testInfo) => {
  test.setTimeout(30000);
  // UI contract test only: synthetic staff/session and mocked job states, no real account.
  const order = { _id: 'ux-order', trackingId: 'TNZ-UX-TEST', submissionId: 'SUB-UX', clientName: 'UX Test', clientWhatsApp: '0000000000',
    status: 'in_design', formTitle: 'Test Edition', updatedAt: new Date().toISOString(),
    uploadedPhotos: [{ url: '/ux-original.jpg', thumbnailUrl: '/ux-thumbnail.webp', originalName: 'story.jpg', folderName: 'My story' }], draftVersions: [] };
  const other = { ...order, _id: 'ux-other', trackingId: 'TNZ-OTHER', clientName: 'Other UX Test', uploadedPhotos: [] };
  const json = (route, data) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  await page.addInitScript(() => localStorage.setItem('tinzel_staff_token', 'synthetic-ui-test'));
  await page.route('**/api/staff/me', (route) => json(route, { user: { _id: 'ux-staff', name: 'Test Designer', role: 'designer', isActive: true,preferredLanguage:'en' } }));
  await page.route((url) => url.pathname === '/api/designer/orders', (route) => {
    const orders = new URL(route.request().url()).searchParams.get('column') === 'new' ? [order, other] : [];
    return json(route, { orders, total: orders.length, page: 1, pageCount: 1 });
  });
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
  await page.goto('/staff/design'); await chooseEnglish(page);
  await page.getByRole('button', { name: 'Open UX Test', exact: true }).click();
  await page.getByRole('tab',{name:'Client content'}).click();
  await page.getByRole('button', { name: 'Download folder ZIP', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByText('Preview pending', { exact: true })).toBeVisible();
  previewReady = true;
  await page.getByRole('button', { name: 'Refresh preview: story.jpg', exact: true }).click();
  await expect(page.locator('.tinzel-preview-placeholder')).toHaveCount(0);
  await page.getByRole('button', { name: 'Download folder ZIP', exact: true }).click();
  await page.getByRole('button', { name: 'Design Orders', exact: true }).click();
  await page.getByRole('button', { name: 'Open Other UX Test', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Other UX Test', exact: true })).toBeVisible();
  const downloading = page.waitForEvent('download'); jobReady = true; await downloading;
  await page.screenshot({ path: testInfo.outputPath('folder-ready-desktop.png') });
  expect(archiveRequests).toHaveLength(1);
  expect(archiveRequests.every((url) => url.includes('/ux-order/'))).toBe(true);
});


test('form skeleton gives way to a fetch error instead of remaining busy', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/public/forms/skeleton-error', async route => {
    await gate;
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporarily unavailable' }) });
  });
  try {
    await page.goto('/catalogue/skeleton-error');
    await expect(page.locator('.page-skeleton__field').first()).toBeVisible();
  } finally { release(); }
  await expect(page.locator('.page-skeleton')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'We could not open this edition', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeEnabled();
});


for (const scenario of [
  { role: 'designer', path: '/staff/design', api: '**/api/designer/orders', variant: '.page-skeleton__row', data: { orders: [] } },
  { role: 'manager', path: '/staff/pre-design', api: '**/api/manager/orders?*', variant: '.page-skeleton__summary', data: { orders: [], summary: {}, statusCounts: {}, pageCount: 1, total: 0 } },
]) {
  test(`${scenario.role} skeleton covers delayed workspace data`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tinzel_language', 'en');
      localStorage.setItem('tinzel_staff_token', 'skeleton-test');
    });
    await page.route('**/api/staff/me', route => route.fulfill({ json: { user: {
      _id: 'skeleton-user', name: 'Skeleton User', role: scenario.role, preferredLanguage: 'en', isActive: true,
    } } }));
    await page.route('**/api/notifications/history?*', route => route.fulfill({ json: { notifications: [], unreadCount: 0 } }));
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route(scenario.api, async route => { await gate; await route.fulfill({ json: scenario.data }); });
    try {
      await page.goto(scenario.path);
      await expect(page.locator(scenario.variant).first()).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { release(); }
    await expect(page.locator('.page-skeleton')).toHaveCount(0);
  });
}
