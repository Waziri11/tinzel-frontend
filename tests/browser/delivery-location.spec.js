import { test, expect } from './fixtures.js';
import AxeBuilder from '@axe-core/playwright';

for (const lang of ['en', 'sw']) {
  test(`approval prompts for delivery, retries safely and saves on mobile in ${lang}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(language => localStorage.setItem('tinzel_language', language), lang);
    const order = { _id: 'delivery-client', clientName: 'Delivery client', clientPreferredLanguage: lang, status: 'client_review', currentDraftVersion: 1,
      draftVersions: [{ versionNumber: 1, managerReview: { status: 'approved' } }], revisionRequests: [] };
    await page.route('**/api/client/order', route => route.fulfill({ json: { order } }));
    await page.route('**/api/proofs/client/**', route => route.fulfill({ json: { state: 'ready', pageCount: 0, pages: [], annotations: [], canComment: true } }));
    await page.route('**/api/client/approve-draft', route => {
      order.status = 'client_approved'; order.approvedVersionNumber = 1;
      return route.fulfill({ json: { order } });
    });
    let calls = 0;
    await page.route('**/api/client/delivery-location', route => {
      expect(route.request().method()).toBe('PATCH');
      expect(route.request().headers()['x-csrf-token']).toBeTruthy();
      if (++calls === 1) return route.fulfill({ status: 503, json: { message: 'Temporarily unavailable' } });
      order.clientDeliveryDetails = { location: route.request().postDataJSON().location, updatedAt: new Date().toISOString() };
      return route.fulfill({ json: { success: true, clientDeliveryDetails: order.clientDeliveryDetails } });
    });
    await page.goto('/track');
    await expect(page.locator('.client-delivery-location')).toHaveCount(0);
    const approve = lang === 'en' ? 'Approve for printing' : 'Idhinisha uchapishaji';
    await page.getByRole('button', { name: approve, exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: approve, exact: true }).click();
    const location = page.locator('#delivery-location');
    await expect(location).toBeFocused();
    const save = page.getByRole('button', { name: lang === 'en' ? 'Save delivery location' : 'Hifadhi mahali pa uwasilishaji', exact: true });
    await save.click();
    await expect(page.locator('#delivery-location-error')).toBeVisible();
    expect(calls).toBe(0);
    await location.fill('Dar es Salaam, Mikocheni, near the library');
    await save.click();
    await expect(page.locator('#delivery-location-error')).toBeVisible();
    await expect(location).toHaveValue('Dar es Salaam, Mikocheni, near the library');
    await save.click();
    await expect(page.locator('.client-delivery-location__value')).toHaveText('Dar es Salaam, Mikocheni, near the library');
    await page.reload();
    await expect(page.locator('.client-delivery-location__value')).toHaveText('Dar es Salaam, Mikocheni, near the library');
    await page.getByRole('button', { name: lang === 'en' ? 'Edit delivery location' : 'Badilisha mahali pa uwasilishaji' }).click();
    await expect(location).toBeFocused();
    await location.fill('Arusha, Njiro, near the market');
    await save.click();
    await expect(page.locator('.client-delivery-location__value')).toHaveText('Arusha, Njiro, near the market');
    expect((await new AxeBuilder({ page }).include('.client-delivery-location').withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('.client-delivery-location').screenshot({ path: info.outputPath(`delivery-saved-${lang}.png`) });
    order.status = 'dispatched';
    await page.reload();
    await expect(page.locator('.client-delivery-location__value')).toHaveText('Arusha, Njiro, near the market');
    await expect(page.locator('.client-delivery-location button')).toHaveCount(0);
  });
}

test('a returning client still sees the missing location prompt during printing', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await page.route('**/api/client/order', route => route.fulfill({ json: { order: { _id: 'printing', clientPreferredLanguage: 'en', status: 'printing_in_progress', draftVersions: [] } } }));
  await page.goto('/track');
  await expect(page.getByRole('heading', { name: 'Where should we deliver your magazine?' })).toBeVisible();
  await expect(page.locator('#delivery-location')).toBeEmpty();
});
