import { test, expect } from './fixtures.js';

test('sidebar navigation preserves the session and shell while showing page skeletons', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('tinzel_language', 'en');
    localStorage.setItem('tinzel_staff_token', 'navigation-test');
  });
  let profileRequests = 0;
  let releaseProfile, releaseReturns;
  const profileGate = new Promise(resolve => { releaseProfile = resolve; });
  const returnsGate = new Promise(resolve => { releaseReturns = resolve; });
  await page.route('**/api/staff/me', async route => {
    profileRequests++;
    await profileGate;
    await route.fulfill({ json: { user: { _id: 'navigation-user', name: 'Test Designer', role: 'designer', preferredLanguage: 'en' } } });
  });
  await page.route(url => url.pathname === '/api/designer/orders', route => route.fulfill({ json: { orders: [] } }));
  await page.route('**/api/designer/returns?*', async route => {
    await returnsGate;
    await route.fulfill({ json: { returns: [] } });
  });
  try {
    await page.goto('/staff/design');
    await expect(page.locator('.page-skeleton')).toBeVisible();
    await expect(page.getByText('Reconnecting to your workspace…', { exact: true })).toHaveCount(0);
    releaseProfile();
    await expect(page.locator('.staff-sidebar')).toBeVisible();
    await expect(page.locator('.page-skeleton')).toHaveCount(0);
    const initialProfileRequests = profileRequests;
    await page.locator('.staff-sidebar').evaluate(el => { el.dataset.navigationIdentity = 'preserved'; });
    await page.getByRole('button', { name: 'Returns', exact: true }).click();
    await expect(page).toHaveURL(/\/staff\/returns$/);
    await expect(page.locator('.staff-content .page-skeleton')).toBeVisible();
    await expect(page.locator('.staff-sidebar')).toHaveAttribute('data-navigation-identity', 'preserved');
    expect(profileRequests).toBe(initialProfileRequests);
    releaseReturns();
    await expect(page.locator('.page-skeleton')).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/staff\/design$/);
    await expect(page.locator('.staff-sidebar')).toHaveAttribute('data-navigation-identity', 'preserved');
    expect(profileRequests).toBe(initialProfileRequests);
  } finally {
    releaseProfile();
    releaseReturns();
  }
});
