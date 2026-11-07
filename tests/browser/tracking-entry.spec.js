import { test, expect } from '@playwright/test';

async function prepare(page, reference) {
  await page.addInitScript(reference => {
    localStorage.setItem('tinzel_language', 'en');
    if (reference) localStorage.setItem('tinzel_tracking_reference', reference);
    window.trackingExpiryEvents = 0;
    window.addEventListener('tinzel:client:unauthorized', () => window.trackingExpiryEvents++);
  }, reference);
}

test('first visit opens tracking without a sign-in error or session-expiry event', async ({ page }) => {
  await prepare(page);
  await page.goto('/track');
  await expect(page.locator('#track-login-id')).toBeVisible();
  await expect(page.locator('#track-login-whatsapp')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(() => window.trackingExpiryEvents)).toBe(0);
});

for (const status of [401, 403]) {
  test(`unavailable previous access (${status}) returns quietly to tracking details`, async ({ page }) => {
    await prepare(page, 'SUB-PHONE-BROWSER-9998');
    const otpRequests = [];
    page.on('request', request => {
      if (request.url().endsWith('/api/client/request-otp')) otpRequests.push(request.postDataJSON());
    });
    await page.route('**/api/client/order', route => route.fulfill({ status, json: { message: 'Please sign in again' } }));
    await page.goto('/track');
    await expect(page.locator('#track-login-id')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await page.evaluate(() => window.trackingExpiryEvents)).toBe(0);
    expect(otpRequests.every(body => body.resumeOnly === true)).toBe(true);
    if (status === 401) expect(await page.evaluate(() => localStorage.getItem('tinzel_tracking_reference'))).toBeNull();
  });
}

test('a service failure remains visible instead of looking like missing customer access', async ({ page }) => {
  await prepare(page);
  await page.route('**/api/client/order', route => route.fulfill({ status: 503, json: { message: 'Tracking is temporarily unavailable. Please try again.' } }));
  await page.goto('/track');
  await expect(page.getByRole('alert')).toContainText('Tracking is temporarily unavailable. Please try again.');
});

test('active tracking expiry asks for tracking details instead of a staff sign-in', async ({ page }) => {
  await prepare(page);
  await page.goto('/track');
  await expect(page.locator('#track-login-id')).toBeVisible();
  await page.evaluate(async () => {
    const { api } = await import('/src/services/api.js');
    await api.client.getOrder('cookie').catch(() => {});
  });
  await expect(page.getByRole('alert')).toContainText('Please enter your tracking details to verify access again.');
  expect(await page.evaluate(() => window.trackingExpiryEvents)).toBe(1);
});
