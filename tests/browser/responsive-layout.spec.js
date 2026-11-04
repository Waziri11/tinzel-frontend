import { test, expect } from '@playwright/test';
import { securityLogin } from './security-login.js';

test.use({ hasTouch: true, actionTimeout: 15000 });
let staffTokens;
test.beforeAll(async ({ request }) => {
  staffTokens = {};
  // Reuse authenticated sessions across sizes; layout tests must not exhaust login limits.
  for (const role of ['admin', 'designer', 'manager']) staffTokens[role] = await securityLogin(request, role);
});

async function staffLanguage(page, language) {
  const saved = page.waitForResponse(response => response.url().endsWith('/api/staff/preferences') && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('lang', language);
}

async function closeDialog(page) {
  const dialog = page.getByRole('dialog').last();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function checkLayout(page, label) {
  await expect(page.locator('#main-content')).toBeVisible();
  await expect(page.locator('.page-skeleton, .tinzel-loading')).toHaveCount(0);
  const measure = () => page.evaluate(() => {
    const containers = [document.documentElement, ...document.querySelectorAll('.staff-main, [role="dialog"], .ant-drawer-body')];
    return containers.filter(el => el.getClientRects().length && el.scrollWidth > el.clientWidth + 2)
      .map(el => ({ element: el.className || el.tagName, width: el.clientWidth, content: el.scrollWidth }));
  });
  await expect.soft.poll(measure, { message: label }).toEqual([]);
}

for (const width of [320, 390, 600, 768, 820, 1024, 1180]) {
  test(`all page layouts at ${width}px`, async ({ page, request }, testInfo) => {
    test.setTimeout(180000);
    const browserErrors = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
    await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
    for (const path of ['/', '/catalogue', ...['details', 'story', 'photos', 'review'].map(step => `/catalogue/acceptance-magazine?step=${step}`), '/track', '/staff/login', '/missing']) {
      await page.goto(path);
      await checkLayout(page, path);
      if (await page.getByRole('button', { name: 'SW', exact: true }).isVisible()) {
        await page.getByRole('button', { name: 'SW', exact: true }).click();
        await checkLayout(page, `${path} sw`);
        await page.getByRole('button', { name: 'EN', exact: true }).click();
      }
    }
    for (const role of ['admin', 'designer', 'manager']) {
      const token = staffTokens[role];
      const preferences = await request.patch('/api/staff/preferences', { headers: { Cookie: '', Authorization: `Bearer ${token}` }, data: { preferredLanguage: 'en' } });
      expect(preferences.ok()).toBe(true);
      await page.context().addCookies([{ name: 'tinzel_staff', value: token, url: 'http://127.0.0.1:5177', httpOnly: true, sameSite: 'Strict' }]);
      const paths = role === 'admin' ? ['/staff/forms', '/staff/users', '/staff/system', '/staff/notifications'] : role === 'designer' ? ['/staff/design', '/staff/returns', '/staff/notifications', '/staff/system'] : ['/staff/pre-design', '/staff/design-phase', '/staff/post-design', '/staff/returns', '/staff/users', '/staff/notifications', '/staff/system'];
      for (const path of paths) {
        await page.goto(path);
        await checkLayout(page, `${role} ${path}`);
        if (path === '/staff/forms') {
          await page.getByText('Acceptance magazine', { exact: true }).click();
          await expect(page.getByLabel('Response Type', { exact: true })).toHaveCount(16);
          await checkLayout(page, 'edition editor');
          await page.getByRole('button', { name: 'Preview', exact: true }).click();
          await checkLayout(page, 'edition preview');
          await closeDialog(page);
        }
        if (path === '/staff/users') {
          await page.screenshot({ path: testInfo.outputPath(`${role}-users.png`) });
          await page.getByRole('button', { name: 'Add User', exact: true }).click();
          await checkLayout(page, 'add user');
          await closeDialog(page);
        }
        if (path === '/staff/notifications' && role === 'admin') {
          for (const name of ['Notification Triggers & Settings', 'SMS & Email Health Test']) {
            await page.getByRole('button', { name: new RegExp(name) }).click();
            await checkLayout(page, name);
          }
          await page.getByRole('button', { name: 'Send Tri-Channel Notification', exact: true }).click();
          await checkLayout(page, 'notification composer');
          await closeDialog(page);
        }
        if (path === '/staff/notifications' && role === 'designer' && width < 992) {
          const menu = page.getByRole('button', { name: 'Open workspace menu' });
          await menu.click();
          await checkLayout(page, 'workspace drawer');
          await page.getByRole('button', { name: 'Open profile menu' }).click();
          await page.getByRole('menuitem', { name: 'My profile', exact: true }).click();
          await checkLayout(page, 'profile');
          await closeDialog(page);
        }
        await staffLanguage(page, 'sw');
        await checkLayout(page, `${role} ${path} sw`);
        await staffLanguage(page, 'en');
      }
    }
    expect(browserErrors).toEqual([]);
  });
}
