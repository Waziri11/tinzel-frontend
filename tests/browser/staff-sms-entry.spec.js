import { test, expect } from './fixtures.js';

const browserName = process.env.PLAYWRIGHT_BROWSER || 'chromium';
test.use({
  browserName,
  channel: browserName === 'chromium' ? 'chrome' : '',
  viewport: { width: 820, height: 1180 },
  isMobile: true,
  hasTouch: true,
});

for (const role of ['manager', 'admin']) {
  test(`${role} opens a fresh workspace after SMS without a manual reload`, async ({ page }) => {
    const user = { id: `sms-${role}`, name: 'SMS Test User', role, preferredLanguage: 'en' };
    const errors = [];
    const documents = [];
    let signedIn = false, loginCalls = 0, verifyCalls = 0;
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        documents.push(new URL(request.url()).pathname);
      }
    });
    await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
    await page.route('**/api/staff/login', route => {
      loginCalls++;
      return route.fulfill({ json: { otpRequired: true, challengeId: 'test-challenge', channel: 'sms' } });
    });
    await page.route('**/api/staff/otp/verify', route => {
      verifyCalls++;
      if (route.request().postDataJSON().code !== '123456') {
        return route.fulfill({ status: 400, json: { message: 'Incorrect verification code' } });
      }
      signedIn = true;
      return route.fulfill({ json: { token: 'cookie', user } });
    });
    await page.route('**/api/staff/me', route => route.fulfill(signedIn
      ? { json: { user } }
      : { status: 401, json: { message: 'Sign in' } }));
    await page.route('**/api/manager/orders?*', route => route.fulfill({
      json: { orders: [], summary: {}, statusCounts: {}, pageCount: 1, total: 0 },
    }));
    await page.route('**/api/manager/designers', route => route.fulfill({ json: { designers: [] } }));
    await page.route('**/api/manager/settings', route => route.fulfill({ json: {} }));

    await page.goto('/staff/login');
    await page.getByLabel('Work Email Address', { exact: true }).fill(`${role}@example.test`);
    await page.getByLabel('Password', { exact: true }).fill('Example!2026');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Verification code', { exact: true }).fill('000000');
    await dialog.getByRole('button', { name: 'Verify code', exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    expect(documents).toEqual(['/staff/login']);
    await dialog.getByLabel('Verification code', { exact: true }).fill('123456');
    await dialog.getByRole('button', { name: 'Verify code', exact: true }).click();

    await expect(page).toHaveURL(/\/staff\/pre-design$/);
    await expect(page.getByRole('heading', { name: 'Pre-Design', exact: true })).toBeVisible();
    await expect(page.locator('.ui-error-boundary')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(documents).toEqual(['/staff/login', '/staff/pre-design']);
    expect(loginCalls).toBe(1);
    expect(verifyCalls).toBe(2);
    expect(errors).toEqual([]);
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    for (const secret of ['Example!2026', '123456', 'test-challenge']) expect(storage).not.toContain(secret);
  });
}
