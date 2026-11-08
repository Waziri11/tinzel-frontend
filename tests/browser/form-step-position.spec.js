import { test, expect } from './fixtures.js';

test('mobile review and back navigation start at the form heading', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('tinzel_language', 'en');
    localStorage.setItem('tinzel:answers:v2:position-test', JSON.stringify({
      savedAt: Date.now(), data: { clientName: 'Position test', clientWhatsApp: '+255700000001', answers: {} },
    }));
  });
  await page.route('**/api/public/forms/position-test', route => route.fulfill({ json: { form: {
    slug: 'position-test', title: 'Preview position test', price: 50000, currency: 'TZS',
    fields: Array.from({ length: 8 }, (_, i) => ({ fieldId: `photos-${i}`, type: 'photo_group', label: `Photos ${i + 1}` })),
  } } }));
  await page.goto('/catalogue/position-test?step=photos');
  await expect(page.locator('#upload-photos-7')).toBeAttached();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(/step=review/);
  const heading = page.getByRole('heading', { name: 'Preview position test' });
  await expect(heading).toBeInViewport();
  const position = await heading.boundingBox();
  const header = await page.locator('.public-header').boundingBox();
  expect(position.y).toBeGreaterThanOrEqual(header.y + header.height);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/step=photos/);
  await expect(heading).toBeInViewport();
});
