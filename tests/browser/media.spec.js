import { test, expect } from '@playwright/test';

async function openForm(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'English EN' }).click();
  await page.getByText('New Magazine Order', { exact: true }).click();
  await page.getByText('Upload Performance Test', { exact: true }).click();
  await expect(page.locator('#upload-first')).toBeAttached();
}
const photo = (name, size = 1200000) => ({ name, mimeType: 'image/jpeg', buffer: Buffer.alloc(size, 42) });

test('rapid selections share two transfers, preserve completed uploads after refresh, and submit metadata only', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let active = 0, peak = 0, chunkRequests = 0, submitBytes = 0;
  await page.route('**/chunks/*', async (route) => {
    active++; chunkRequests++; peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 120));
    try { await route.continue(); } finally { active--; }
  });
  page.on('request', (r) => { if (r.url().endsWith('/submit')) { submitBytes = r.postDataBuffer()?.length; expect(r.headers()['content-type']).toContain('application/json'); } });
  await openForm(page);
  await page.locator('input[type="text"]').first().fill('Browser Upload Test');
  await page.getByPlaceholder('e.g. +255712345678').fill('+255700000001');
  await page.locator('#upload-first').setInputFiles([photo('first.jpg', 5 * 1024 * 1024 + 10), photo('second.jpg')]);
  await page.locator('#upload-second').setInputFiles([photo('third.jpg'), photo('fourth.jpg')]);
  await expect(page.getByText('Photos ready: 4/4')).toBeVisible({ timeout: 30000 });
  expect(peak).toBeLessThanOrEqual(2);
  const previousRequests = chunkRequests;
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('tinzel:uploads:v2:upload-performance-test'))?.items.filter((i) => i.photo).length)).toBe(4);
  await page.reload();
  await page.getByRole('button', { name: 'English EN' }).click();
  await page.getByText('New Magazine Order', { exact: true }).click();
  await page.getByText('Upload Performance Test', { exact: true }).click();
  await expect(page.getByText('Photos ready: 4/4')).toBeVisible();
  await expect(page.locator('input[type="text"]').first()).toHaveValue('Browser Upload Test');
  expect(chunkRequests).toBe(previousRequests);
  await page.getByRole('button', { name: /Continue.*Pay/i }).click();
  await expect(page.getByText('Do not pay this test order.')).toBeVisible();
  expect(submitBytes).toBeLessThan(5000);
  expect(errors).toEqual([]);
});

test('interrupted file can be retried; completed files stay complete on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const network = await page.context().newCDPSession(page);
  await network.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1250000, uploadThroughput: 250000 });
  let failing = true;
  await page.route('**/chunks/1', async (route) => {
    if (failing) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporary connection failure', retryable: true }) });
    else await route.continue();
  });
  await openForm(page);
  await page.locator('#upload-first').setInputFiles(photo('interrupted.jpg', 2200000));
  await page.locator('#upload-second').setInputFiles(photo('completed.jpg', 100000));
  await expect(page.getByRole('button', { name: 'Retry photo' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Photos ready: 1/2')).toBeVisible();
  failing = false;
  await page.getByRole('button', { name: 'Retry photo' }).click();
  await expect(page.getByText('Photos ready: 2/2')).toBeVisible({ timeout: 30000 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/media-mobile.png', fullPage: true });
});

test('refresh restores a partial upload and reselection sends only missing parts', async ({ page }) => {
  let failing = true, firstParts = 0;
  await page.route('**/chunks/*', async (route) => {
    if (route.request().url().endsWith('/chunks/0')) firstParts++;
    if (failing && route.request().url().endsWith('/chunks/1')) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Offline', retryable: true }) });
    else await route.continue();
  });
  await openForm(page);
  const file = photo('resume.jpg', 2200000);
  await page.locator('#upload-first').setInputFiles(file);
  await expect(page.getByRole('button', { name: 'Retry photo' })).toBeVisible({ timeout: 30000 });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('tinzel:uploads:v2:upload-performance-test'))?.items[0]?.state)).toBe('failed');
  failing = false;
  await openForm(page);
  await expect(page.getByText(/Reselect this file below to resume/)).toBeVisible();
  await page.locator('#upload-first').setInputFiles(file);
  await expect(page.getByText('Photos ready: 1/1')).toBeVisible();
  expect(firstParts).toBe(1);
});
