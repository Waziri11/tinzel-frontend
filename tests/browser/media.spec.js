import { test, expect, chooseEnglish } from './fixtures.js';

async function openForm(page) {
  await page.addInitScript(()=>localStorage.setItem('tinzel_language','en'));
  await page.goto('/catalogue/upload-performance-test?step=photos');
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
  await page.getByRole('button',{name:'1 Your details'}).click();
  await page.locator('#magazine-client-name').fill('Browser Upload Test');
  await page.getByPlaceholder('e.g. +255712345678').fill('+255700000001');
  await page.getByRole('button',{name:'3 Photographs'}).click();
  await page.locator('#upload-first').setInputFiles([photo('first.jpg', 5 * 1024 * 1024 + 10), photo('second.jpg')]);
  await page.locator('#upload-second').setInputFiles([photo('third.jpg'), photo('fourth.jpg')]);
  await expect(page.getByText('Photos ready: 2/2').first()).toBeVisible({ timeout: 30000 });
  expect(peak).toBeLessThanOrEqual(2);
  const previousRequests = chunkRequests;
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('tinzel:uploads:v2:upload-performance-test'))?.items.filter((i) => i.photo).length)).toBe(4);
  await page.reload();
  await chooseEnglish(page);

  await expect(page.getByText('Photos ready: 2/2').first()).toBeVisible();
  await page.getByRole('button',{name:'1 Your details'}).click();
  await expect(page.locator('#magazine-client-name')).toHaveValue('Browser Upload Test');
  expect(chunkRequests).toBe(previousRequests);
  await page.getByRole('button',{name:'4 Review'}).click();
  await expect(page.locator('body')).not.toContainText(/SUB-|Submission ID|Namba.*Uwasilishaji/);
  await page.getByRole('button', { name: /Continue.*Pay/i }).click();
  await expect(page.getByText('Do not pay this test order.')).toBeVisible();
  await expect(page.locator('.payment-page')).toContainText('Browser Upload Test');
  await expect(page.locator('body')).not.toContainText(/SUB-|Submission ID|Namba.*Uwasilishaji/);
  await page.getByRole('button', { name: 'SW', exact: true }).click();
  await expect(page.locator('body')).not.toContainText(/SUB-|Submission ID|Namba.*Uwasilishaji/);
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
  await expect(page.locator('[data-field-id=second]').getByText('Photos ready: 1/1')).toBeVisible();
  await expect(page.locator('[data-field-id=first]').getByText('Photos ready: 0/1')).toBeVisible();
  failing = false;
  await page.getByRole('button', { name: 'Retry photo' }).click();
  await expect(page.locator('[data-field-id=first]').getByText('Photos ready: 1/1')).toBeVisible({ timeout: 30000 });
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

test('each field owns its progress and confirmed previews survive refresh and removal', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const pixels = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAFAAAAA8CAIAAAB+RarbAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAqUlEQVRoge3XURFEMQhDUSxec09M1a2J7fDRM4MASCAJc76eqlnvwMBhOCudG45oRaXZ0tk2ScEjSSvRMlk6z0O+pW/fMNhSNyCYdcgx3FUIZh1yDIfhrHRuOKIVlWZL54Ga9Q4MHIaz0rnhiFZUmi2dbZMUPJK0Ei2TpfM85Fv69g2DLXUDglmHHMNdhWDWIcdwGM5K54YjWlFptnQeqFnvwMBhuD9C8AMRv4yDZC5PnQAAAABJRU5ErkJggg==', 'base64');
  const image = name => ({ name, mimeType: 'image/png', buffer: pixels });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/complete', async route => { await gate; await route.continue(); });
  await openForm(page);
  const first = page.locator('[data-field-id=first]');
  const second = page.locator('[data-field-id=second]');
  try {
    await page.locator('#upload-first').setInputFiles(image('first.png'));
    await expect(first.getByText('Confirming your photo…')).toBeVisible();
    await expect.poll(() => first.getByRole('progressbar').first().evaluate(bar => bar.value)).toBeLessThan(100);
    await expect(first.getByRole('img')).toHaveCount(0);
    await expect(second.locator('.photo-field__status')).toHaveCount(0);
    await expect(page.locator('.tinzel-upload, .tinzel-upload__dock')).toHaveCount(0);
    await page.locator('#upload-second').setInputFiles(image('second.png'));
    await expect(second.getByText('Confirming your photo…')).toBeVisible();
  } finally { release(); }
  for (const field of [first, second]) {
    await field.scrollIntoViewIfNeeded();
    await expect(field.getByText('Photos uploaded successfully')).toBeVisible();
    await expect(field.getByRole('progressbar')).toHaveCount(0);
    await expect(field.getByRole('img')).toBeVisible();
    await expect.poll(() => field.getByRole('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  await expect(first.getByRole('img')).toHaveAttribute('alt', 'first.png');
  await expect(second.getByRole('img')).toHaveAttribute('alt', 'second.png');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('tinzel:uploads:v2:upload-performance-test'))?.items.filter(i => i.photo).length)).toBe(2);
  await page.reload();
  await first.scrollIntoViewIfNeeded();
  await expect.poll(() => first.getByRole('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await second.scrollIntoViewIfNeeded();
  await expect.poll(() => second.getByRole('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await first.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('inline-photo-success-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: '4 Review', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Upload Performance Test', exact: true })).toBeInViewport();
  const reviewFirst = page.locator('.order-review').getByRole('region', { name: 'first photos', exact: true });
  const reviewSecond = page.locator('.order-review').getByRole('region', { name: 'second photos', exact: true });
  for (const [question, name] of [[reviewFirst, 'first.png'], [reviewSecond, 'second.png']]) {
    await question.scrollIntoViewIfNeeded();
    await expect(question.getByRole('img')).toHaveCount(1);
    await expect(question.getByRole('img')).toHaveAttribute('alt', name);
    await expect.poll(() => question.getByRole('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  await page.reload();
  await reviewSecond.scrollIntoViewIfNeeded();
  await expect.poll(() => reviewSecond.getByRole('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await reviewFirst.scrollIntoViewIfNeeded();
  await expect.poll(() => reviewFirst.getByRole('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('review-question-photos-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await first.getByRole('button', { name: 'Remove first.png', exact: true }).click();
  await expect(first.getByRole('img')).toHaveCount(0);
  await expect(first.locator('.photo-field__status')).toHaveCount(0);
  await expect(second.getByRole('img')).toBeVisible();
  await page.getByRole('button', { name: '4 Review', exact: true }).click();
  await expect(reviewFirst.getByText('No photos added.')).toBeVisible();
  await expect(reviewFirst.getByRole('img')).toHaveCount(0);
  await expect(reviewSecond.getByText('second.png', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
