import { test, expect, clientOrderAction, openClientReview } from './fixtures.js';

async function setup(page, lang = 'en') {
  await page.addInitScript(language => localStorage.setItem('tinzel_language', language), lang);
  const state = { loads: 0, notifications: 0, logout: null, signedOut: false };
  const order = { _id: 'summary-order', clientName: 'Asha Mwakalinga', formTitle: 'Birthday Magazine', status: 'client_review',
    clientPreferredLanguage: lang, standardStartedAt: '2026-11-02T00:00:00+03:00', standardDueAt: '2026-11-05T00:00:00+03:00', currentDraftVersion: 1,
    draftVersions: [{ versionNumber: 1, managerReview: { status: 'approved' } }], revisionRequests: [] };
  await page.route('**/api/client/order', route => {
    state.loads++;
    return route.fulfill(state.signedOut ? { status: 401, json: { message: 'Sign in' } } : { json: { order } });
  });
  await page.route('**/api/client/notifications', route => {
    state.notifications++;
    return route.fulfill({ json: { notifications: [], unreadCount: 0 } });
  });
  await page.route('**/api/client/logout', route => {
    state.logout = route.request().postDataJSON(); state.signedOut = true;
    return route.fulfill({ json: { success: true } });
  });
  await page.route('**/api/proofs/client/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/pages/')) return url.searchParams.has('text')
      ? route.fulfill({ json: { width: 600, height: 800, text: [], imageRegions: [] } })
      : route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/><text x="60" y="100" font-size="28">Your magazine</text></svg>' });
    return route.fulfill({ json: { state: 'ready', pageCount: 1, pages: [{ page: 1, width: 600, height: 800 }], annotations: [], canComment: true } });
  });
  await page.goto('/track');
  await expect(page.getByRole('heading', { name: 'Asha Mwakalinga', level: 1 })).toBeVisible();
  return state;
}

for (const width of [320, 390, 1440]) for (const lang of ['en', 'sw']) test(`compact customer summary and options work at ${width}px in ${lang}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  const state = await setup(page, lang);
  const summary = page.locator('.client-order-summary');
  const options = page.getByRole('button', { name: lang === 'en' ? 'Order options' : 'Chaguo za oda', exact: true });
  const status = lang === 'en' ? 'Ready for your review' : 'Tayari kwa mapitio yako';
  await expect(page.getByRole('heading', { name: status, exact: true })).toHaveCount(0);
  await expect(page.getByText(status, { exact: true })).toHaveCount(1);
  await expect(summary.locator('ol > li')).toHaveCount(6);
  await expect(summary.locator('[aria-current="step"]')).toContainText(lang === 'en' ? '4. Your review' : '4. Mapitio yako');
  await expect(summary.locator('.express-order')).toContainText(lang === 'en' ? 'Overdue' : 'Imechelewa');
  await expect(summary.locator('.express-order__note')).toContainText('EAT');
  expect((await summary.boundingBox()).height).toBeLessThan(width < 600 ? 380 : 300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(state.notifications).toBe(0);
  await summary.screenshot({ path: info.outputPath(`summary-${width}-${lang}.png`) });
  const loadsBeforeRefresh = state.loads;
  await clientOrderAction(page, lang === 'en' ? 'Refresh order' : 'Sasisha oda');
  await expect.poll(() => state.loads).toBe(loadsBeforeRefresh + 1);
  await expect(page.getByRole('menu')).toBeHidden();
  await options.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('menuitem', { name: lang === 'en' ? 'Notifications' : 'Taarifa', exact: true }).click();
  const inbox = page.getByRole('dialog', { name: lang === 'en' ? 'Notifications' : 'Taarifa', exact: true });
  await expect(inbox).toBeVisible();
  await expect.poll(() => state.notifications).toBeGreaterThan(0);
  await expect.poll(() => inbox.evaluate(dialog => dialog.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(inbox).toBeHidden();
  await expect(options).toBeFocused();
});

for (const forgetDevice of [false, true]) test(`customer options preserve the logout choice: forget device ${forgetDevice}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page);
  await clientOrderAction(page, forgetDevice ? 'Stop remembering this order' : 'Sign Out');
  await expect(page.locator('#track-login-id')).toBeVisible();
  expect(state.logout).toEqual({ forgetDevice });
});

test('customer options retain the unsent feedback warning', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page);
  await openClientReview(page);
  await page.getByRole('button', { name: 'Request changes', exact: true }).click();
  await page.getByLabel('Written feedback 1', { exact: true }).fill('Please keep my note.');
  await page.getByRole('button', { name: 'Close review', exact: true }).click();
  await clientOrderAction(page, 'Sign Out');
  const warning = page.getByRole('dialog', { name: 'Leave unsent feedback?' });
  await expect(warning).toBeVisible();
  expect(state.logout).toBeNull();
  await warning.getByRole('button', { name: 'Cancel', exact: true }).click();
  await openClientReview(page);
  await expect(page.getByLabel('Written feedback 1', { exact: true })).toHaveValue('Please keep my note.');
});
