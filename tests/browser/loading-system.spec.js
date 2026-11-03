import { test, expect } from '@playwright/test';

test('soft flutter follows pending actions and prevents duplicate requests', async ({ page }) => {
  await page.goto('/tests/loading-harness.html');
  const button = page.getByRole('button', { name: 'Save changes' });
  const before = await button.boundingBox();
  await button.click();
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await expect(button.locator('.soft-flutter')).toBeVisible();
  await button.evaluate(el => el.click());
  await expect(page.locator('output')).toHaveText('1');
  const animation = await button.locator('.soft-flutter').evaluate(el => getComputedStyle(el, '::before').animationName);
  expect(animation).toBe('soft-flutter-frames');
  await page.evaluate(() => window.finishAction());
  await expect(button).toBeEnabled();
  await expect(button.locator('.soft-flutter')).toHaveCount(0);
});

test('reduced motion uses a static butterfly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tests/loading-harness.html');
  await page.getByRole('button', { name: 'Save changes' }).click();
  const result = await page.locator('.soft-flutter').evaluate(el => ({
    animation: getComputedStyle(el, '::before').animationName,
    image: getComputedStyle(el).backgroundImage,
  }));
  expect(result.animation).toBe('none');
  expect(result.image).toContain('soft-flutter-poster.webp');
  await page.evaluate(() => window.finishAction());
});
