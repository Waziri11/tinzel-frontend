import { test as base, expect } from '@playwright/test';
export { expect };
export async function chooseEnglish(page) {
  const firstVisit = page.getByRole('button', { name: 'English EN', exact: true });
  // Navigation can restore the visitor's stored choice. Never require a second choice.
  await page.locator('.language-page, #main-content').waitFor();
  if (await firstVisit.isVisible()) await firstVisit.click();
}
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const unexpected = [];
    const realApi = /\/(media|loading-ux|production-redesign)\.spec\.js$/.test(testInfo.file) && !testInfo.title.includes('staff can refresh');
    await page.route('**/api/**', async route => {
      const { pathname } = new URL(route.request().url());
      if (realApi) return route.continue();
      if (/^\/api\/csrf\/(staff|client|printer)$/.test(pathname)) return route.fulfill({ json: { csrf: 'a'.repeat(48) } });
      if(pathname==='/api/staff/me')return route.fulfill({status:401,json:{message:'Sign in'}});
      if(pathname==='/api/client/logout')return route.fulfill({json:{success:true}});
      if(pathname==='/api/client/order')return route.fulfill({status:401,json:{message:'Sign in'}});
      // The shell polls this authenticated inbox independently from each screen.
      if (pathname === '/api/client/notifications') return route.fulfill({json:{notifications:[],unreadCount:0}});
      if (pathname === '/api/notifications/history') return route.fulfill({json:{notifications:[],unreadCount:0}});
      if (pathname === '/api/staff/preferences') return route.fulfill({json:{success:true,preferredLanguage:route.request().postDataJSON().preferredLanguage}});
      unexpected.push(`${route.request().method()} ${pathname}`);
      return route.abort('failed');
    });
    await use(page);
    expect(unexpected, 'Unexpected API calls need explicit fixtures').toEqual([]);
  },
});
