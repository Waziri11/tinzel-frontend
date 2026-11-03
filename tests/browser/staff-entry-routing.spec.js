import { test, expect } from './fixtures.js';

const designer = {
  id: 'entry-designer',
  name: 'Test Designer',
  role: 'designer',
  preferredLanguage: 'en',
};

async function prepare(page, { signedIn = true, role = 'designer' } = {}) {
  const user = { ...designer, role };
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await page.route('**/api/staff/me', route => route.fulfill(signedIn
    ? { json: { user } }
    : { status: 401, json: { message: 'Sign in' } }));
  await page.route('**/api/staff/login', route => {
    signedIn = true;
    return route.fulfill({ json: { token: 'cookie', user } });
  });
  await page.route('**/api/designer/orders?*', route => route.fulfill({ json: { orders: [] } }));
}

for (const path of ['/staff/pre-design', '/staff/pre-design/', '/staff', '/staff/']) {
  test(`restored designer session opens Design Orders from ${path}`, async ({ page }) => {
    await prepare(page);
    await page.goto(path);
    await expect(page).toHaveURL(/\/staff\/design$/);
    await expect(page.getByRole('heading', { name: 'Design orders', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Access unavailable', exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Design orders', exact: true })).toBeVisible();
  });
}

for (const path of ['/staff/pre-design', '/staff', '/staff/login']) {
  test(`designer sign-in opens Design Orders from ${path}`, async ({ page }) => {
    await prepare(page, { signedIn: false });
    await page.goto(path);
    await page.getByLabel('Work Email Address', { exact: true }).fill('designer@example.test');
    await page.getByLabel('Password', { exact: true }).fill('Example!2026');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/staff\/design$/);
    await expect(page.getByRole('heading', { name: 'Design orders', exact: true })).toBeVisible();
  });
}

test('designer entry redirect replaces the stale history entry', async ({ page }) => {
  await prepare(page);
  await page.goto('/staff/notifications?source=bookmark');
  await page.evaluate(() => { window.location.href = '/staff/pre-design'; });
  await expect(page).toHaveURL(/\/staff\/design$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/staff\/notifications\?source=bookmark$/);
  await expect(page.getByRole('heading', { name: 'Notifications', exact: true }).first()).toBeVisible();
});

for (const role of ['manager', 'admin']) {
  test(`${role} keeps the Pre-Design landing page`, async ({ page }) => {
    await prepare(page, { role });
    await page.route('**/api/manager/orders?*', route => route.fulfill({
      json: { orders: [], summary: {}, statusCounts: {}, pageCount: 1, total: 0 },
    }));
    await page.route('**/api/manager/designers', route => route.fulfill({ json: { designers: [] } }));
    await page.route('**/api/manager/settings', route => route.fulfill({ json: {} }));
    await page.goto('/staff');
    await expect(page).toHaveURL(/\/staff\/pre-design$/);
    await expect(page.getByRole('heading', { name: 'Pre-Design', exact: true })).toBeVisible();
  });
}
