import { test, expect } from './fixtures.js';

for (const scenario of ['connection failure', 'expired session', 'restricted page']) {
  test(`staff session loading handles ${scenario}`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tinzel_language', 'en');
      localStorage.setItem('tinzel_staff_token', 'session-loading-test');
    });
    let releaseProfile;
    const profileGate = new Promise(resolve => { releaseProfile = resolve; });
    await page.route('**/api/staff/me', async route => {
      await profileGate;
      await route.fulfill({
        status: scenario === 'connection failure' ? 503 : scenario === 'expired session' ? 401 : 200,
        json: scenario === 'restricted page'
          ? { user: { _id: 'loading-designer', name: 'Test Designer', role: 'designer', preferredLanguage: 'en' } }
          : { message: 'Session verification failed' },
      });
    });
    try {
      await page.goto('/staff/users');
      await expect(page.locator('.page-skeleton')).toBeVisible();
      await expect(page.getByText('Reconnecting to your workspace…', { exact: true })).toHaveCount(0);
      releaseProfile();
      if (scenario === 'connection failure') {
        await expect(page.getByRole('button', { name: 'Retry connection', exact: true })).toBeVisible();
      } else if (scenario === 'expired session') {
        await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
        expect(await page.evaluate(() => localStorage.getItem('tinzel_staff_token'))).toBeNull();
      } else {
        await expect(page.getByRole('heading', { name: 'Access unavailable', exact: true })).toBeVisible();
        await expect(page.locator('.staff-sidebar').getByRole('button', { name: 'Users', exact: true })).toHaveCount(0);
      }
    } finally {
      releaseProfile();
    }
  });
}
