import { test, expect } from '@playwright/test';

test('soft flutter follows pending actions and prevents duplicate requests', async ({ page }) => {
  await page.goto('/tests/loading-harness.html');
  const button = page.getByRole('button', { name: 'Save changes' });
  const before = await button.boundingBox();
  await button.click();
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute('aria-busy', 'true');
  expect((await button.boundingBox()).width).toBeCloseTo(before.width, 0);
  await expect(button.locator('.soft-flutter')).toBeVisible();
  await button.evaluate(el => el.click());
  await expect(page.locator('output')).toHaveText('1');
  const animation = await button.locator('.soft-flutter').evaluate(el => getComputedStyle(el, '::before').animationName);
  expect(animation).toBe('soft-flutter-frames');
  await page.evaluate(() => window.finishAction());
  await expect(button).toBeEnabled();
  await expect(button.locator('.soft-flutter')).toHaveCount(0);
});

test('reduced motion uses a static butterfly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tests/loading-harness.html');
  await page.getByRole('button', { name: 'Save changes' }).click();
  const result = await page.locator('.soft-flutter').evaluate(el => ({
    animation: getComputedStyle(el, '::before').animationName,
    image: getComputedStyle(el).backgroundImage,
  }));
  expect(result.animation).toBe('none');
  expect(result.image).toContain('soft-flutter-poster.webp');
  await page.evaluate(() => window.finishAction());
});

test('PDF downloads show transfer progress and only complete after the response arrives', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await page.route('**/api/public/forms', route => route.fulfill({ json: { forms: [] } }));
  await page.goto('/');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/security/orders/loading-test/download/print', async route => {
    await gate;
    await route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.7\nloading fixture', headers: { 'Content-Length': '24' } });
  });
  await page.evaluate(() => {
    window.transferPromise = import('/src/services/api.js').then(api => api.downloadFile('/api/security/orders/loading-test/download/print', 'fixture.pdf'));
    window.transferPromise.catch(() => {});
  });
  try {
    const panel = page.getByRole('complementary', { name: 'File transfers' });
    await expect(panel.getByRole('progressbar')).toBeVisible();
    await expect(panel.getByRole('progressbar')).not.toHaveAttribute('value');
    await expect(panel.locator('.soft-flutter')).toHaveCount(0);
    const download = page.waitForEvent('download');
    release();
    await download;
    await expect(panel.getByText('File ready — check your downloads')).toBeVisible();
    await expect(panel.getByRole('progressbar')).toHaveAttribute('value', '100');
  } finally { release(); }
});

test('file uploads keep an indeterminate confirmation bar until the server accepts them', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await page.route('**/api/public/forms', route => route.fulfill({ json: { forms: [] } }));
  await page.goto('/');
  await page.route('**/api/csrf/staff', route => route.fulfill({ json: { csrf: 'a'.repeat(48) } }));
  let release, received = false;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/admin/forms/upload-cover', async route => {
    received = true;
    expect(route.request().headers()['x-csrf-token']).toBe('a'.repeat(48));
    expect(route.request().headers().authorization).toBeUndefined();
    await gate;
    await route.fulfill({ json: { coverUrl: '/test-cover.webp' } });
  });
  await page.evaluate(() => {
    window.transferPromise = Promise.all([import('/src/services/api.js'), import('/src/services/fileTransfers.js')]).then(([{ api }, { runTransfer }]) =>
      runTransfer({ key: 'test-cover', name: 'cover.webp', kind: 'upload' }, context => api.admin.uploadCover('cookie', new File([new Uint8Array(10000)], 'cover.webp', { type: 'image/webp' }), context)));
    window.transferPromise.catch(() => {});
  });
  try {
    await expect.poll(() => received).toBe(true);
    const panel = page.getByRole('complementary', { name: 'File transfers' });
    await expect(panel.getByRole('progressbar')).toBeVisible();
    await expect(panel.getByText('Upload confirmed')).toHaveCount(0);
    await expect(panel.getByRole('progressbar')).not.toHaveAttribute('value');
    await page.setViewportSize({ width: 390, height: 844 });
    const bounds = await panel.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: 'test-results/loading-upload-mobile.png', fullPage: true });
    release();
    await expect(panel.getByText('Upload confirmed')).toBeVisible();
  } finally { release(); }
});

test('keyboard submission shows flutter only on the submitted action', async ({ page }) => {
  await page.goto('/tests/loading-harness.html');
  await page.getByLabel('Form value').fill('example');
  await page.getByLabel('Form value').press('Enter');
  await expect(page.getByRole('button', { name: 'Submit form' }).locator('.soft-flutter')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unrelated action' }).locator('.soft-flutter')).toHaveCount(0);
  await page.evaluate(() => window.finishForm());
  await expect(page.getByRole('button', { name: 'Submit form' })).toBeEnabled();
  await expect(page.locator('.soft-flutter')).toHaveCount(0);
});

test('multipart uploads recover a rotated CSRF token once and stop on server rejection', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await page.route('**/api/public/forms', route => route.fulfill({ json: { forms: [] } }));
  await page.goto('/');
  let lookups = 0, uploads = 0;
  await page.route('**/api/csrf/staff', route => route.fulfill({ json: { csrf: (++lookups === 1 ? 'a' : 'b').repeat(48) } }));
  await page.route('**/api/admin/forms/upload-cover', route => {
    uploads++;
    expect(route.request().headers()['x-csrf-token']).toBe((uploads === 1 ? 'a' : 'b').repeat(48));
    return route.fulfill({ status: uploads === 1 ? 403 : 413, json: uploads === 1 ? { errorCode: 'CSRF_TOKEN_INVALID' } : { message: 'Cover exceeds the size limit' } });
  });
  await page.evaluate(async () => {
    const [{ api }, { runTransfer }] = await Promise.all([import('/src/services/api.js'), import('/src/services/fileTransfers.js')]);
    await runTransfer({ key: 'rejected-cover', name: 'large.webp', kind: 'upload' }, context => api.admin.uploadCover('cookie', new File(['fixture'], 'large.webp', { type: 'image/webp' }), context)).catch(() => {});
  });
  expect(uploads).toBe(2);
  expect(lookups).toBe(2);
  const panel = page.getByRole('complementary', { name: 'File transfers' });
  await expect(panel.getByRole('alert')).toContainText('Cover exceeds the size limit');
  await expect(panel.locator('.transfer-progress')).toHaveAttribute('aria-busy', 'false');
  await expect(panel.getByText('Upload confirmed')).toHaveCount(0);
  await expect(panel.getByRole('progressbar')).not.toHaveAttribute('value', '100');
});
