import { test, expect } from './fixtures.js';
import AxeBuilder from '@axe-core/playwright';

for (const lang of ['en', 'sw']) for (const width of [390, 1440]) {
  test(`branded state gallery is readable and accessible in ${lang} at ${width}px`, async ({ page }, info) => {
    await page.addInitScript(value => localStorage.setItem('tinzel_language', value), lang);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/__states');
    const preview = page.getByRole('region', { name: lang === 'en' ? 'State preview' : 'Hakikisho la hali' });
    await expect(page.getByLabel(lang === 'en' ? 'Page' : 'Ukurasa', { exact: true }).locator('option')).toHaveCount(51);
    await expect(preview.getByRole('alert')).toContainText(lang === 'en' ? 'We could not complete this request' : 'Hatukuweza kukamilisha ombi hili');
    await preview.getByRole('button', { name: lang === 'en' ? 'Try again' : 'Jaribu tena' }).click();
    await expect(preview.getByRole('status')).toContainText(lang === 'en' ? 'Changes saved' : 'Mabadiliko yamehifadhiwa');
    await page.getByLabel(lang === 'en' ? 'State' : 'Hali', { exact: true }).selectOption('partial');
    await expect(preview.getByText(lang === 'en' ? 'Previously loaded information remains available.' : 'Taarifa zilizopakiwa awali bado zinapatikana.')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
    await page.screenshot({ path: info.outputPath(`states-${lang}-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: lang === 'en' ? 'Preview confirmation' : 'Hakiki uthibitisho' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(lang === 'en' ? 'Discard these changes?' : 'Uache mabadiliko haya?');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: lang === 'en' ? 'Preview confirmation' : 'Hakiki uthibitisho' })).toBeFocused();
  });
}

test('asynchronous leave checks protect both programmatic navigation and native browser history', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await page.goto('/__states');
  await expect(page.getByRole('heading', { name: 'Page states', exact: true })).toBeVisible();
  await page.evaluate(async () => {
    window.nav = await import('/src/navigation/location.js');
    window.nav.navigate('/__states?one');
    window.nav.navigate('/__states?two');
    window.addEventListener('tinzel:before-navigate', event => event.detail.waitUntil(new Promise(resolve => { window.resolveLeave = resolve; })));
    window.nav.navigate('/__states?three');
  });
  await expect(page).toHaveURL(/\?two$/);
  await page.evaluate(() => window.resolveLeave(false));
  await expect(page).toHaveURL(/\?two$/);
  await page.evaluate(() => { window.resolveLeave = null; history.back(); });
  await expect.poll(() => page.evaluate(() => typeof window.resolveLeave)).toBe('function');
  await expect(page).toHaveURL(/\?two$/);
  await page.evaluate(() => window.resolveLeave(false));
  await page.evaluate(() => { window.resolveLeave = null; history.back(); });
  await expect.poll(() => page.evaluate(() => typeof window.resolveLeave)).toBe('function');
  await page.evaluate(() => window.resolveLeave(true));
  await expect(page).toHaveURL(/\?one$/);
});

test('initial magazine metadata failure has a local retry and recovers without leaving the order', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'sw'));
  await page.route('**/api/client/order', route => route.fulfill({ json: { order: {
    _id: 'state-proof', trackingId: 'TNZ-STATE', clientName: 'Test Customer', status: 'client_review', clientPreferredLanguage: 'sw', currentDraftVersion: 1,
    draftVersions: [{ versionNumber: 1, managerReview: { status: 'approved' } }], revisionRequests: [],
  } } }));
  let failed = true;
  await page.route('**/api/proofs/client/**', route => {
    if (new URL(route.request().url()).searchParams.has('text')) return route.fulfill({ json: { width: 600, height: 800, items: [], images: [], geometryVersion: 3 } });
    if (route.request().url().includes('/pages/')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/></svg>' });
    return route.fulfill(failed ? { status: 503, json: { message: 'Unavailable' } } : { json: { state: 'ready', pageCount: 1, coverReady: true, pages: [{ page: 1, width: 600, height: 800 }], canComment: true, annotations: [] } });
  });
  await page.goto('/track');
  await expect(page.getByRole('heading', { name: 'Hatukuweza kufungua jarida' })).toBeVisible();
  failed = false;
  await page.locator('.pdf-book').getByRole('button', { name: 'Jaribu tena', exact: true }).click();
  await expect(page.locator('.proof-sheet img').first()).toBeVisible();
  await expect(page).toHaveURL(/\/track$/);
});


test('the opening never blocks direct links and releases the home page when ready', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await page.goto('/track');
  await expect(page.locator('#tinzel-intro')).toBeHidden();
  await expect(page.locator('#root')).not.toHaveAttribute('inert');
  await page.route('**/api/public/forms*', route => route.fulfill({ json: { forms: [] } }));
  await page.goto('/');
  await expect(page.locator('#tinzel-intro')).toBeHidden();
  await expect(page.locator('#root')).not.toHaveAttribute('inert');
});
