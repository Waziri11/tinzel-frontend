import { test as base, expect } from '@playwright/test';
export { expect };
export async function chooseEnglish(page) {
  const firstVisit = page.getByRole('button', { name: 'English EN', exact: true });
  // Navigation can restore the visitor's stored choice. Never require a second choice.
  await page.waitForLoadState('domcontentloaded');
  if (!await page.evaluate(() => localStorage.getItem('tinzel_language'))) await firstVisit.click();
}
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const unexpected = [];
    const realApi = /\/(media|loading-ux|production-redesign)\.spec\.js$/.test(testInfo.file);
    await page.route('**/api/**', async route => {
      const { pathname } = new URL(route.request().url());
      if (realApi) return route.continue();
      // The shell polls this authenticated inbox independently from each screen.
      if (pathname === '/api/notifications/history') return route.fulfill({json:{notifications:[],unreadCount:0}});
      if (pathname === '/api/staff/preferences') return route.fulfill({json:{success:true,preferredLanguage:route.request().postDataJSON().preferredLanguage}});
      unexpected.push(`${route.request().method()} ${pathname}`);
      return route.abort('failed');
    });
    await use(page);
    expect(unexpected, 'Unexpected API calls need explicit fixtures').toEqual([]);
  },
});
