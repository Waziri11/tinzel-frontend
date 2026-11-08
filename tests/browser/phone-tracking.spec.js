import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for (const [index, lang] of ['en', 'sw'].entries()) {
  test(`local phone and padded ID complete tracking in ${lang}`, async ({ page, context }, info) => {
    await page.setViewportSize({ width: lang === 'sw' ? 390 : 1280, height: 900 });
    await page.addInitScript(language => localStorage.setItem('tinzel_language', language), lang);
    await page.goto('/track');
    await expect(page.locator('#tinzel-intro')).toBeHidden({ timeout: 15000 });
    await page.locator('#track-login-id').fill(`TNZ-2026-0${9998 + index}`);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('#track-login-id')).toHaveValue(`TNZ-2026-0${9998 + index}`);
    const phone = page.locator('#track-login-whatsapp');
    await phone.fill('+254 712 345 678'); await phone.blur(); await expect(phone).toHaveValue('+254712345678');
    await phone.fill('0712 000 082'); await phone.blur(); await expect(phone).toHaveValue('+255712000082');
    await page.evaluate(() => { window.trackingExpiryEvents = 0; window.addEventListener('tinzel:client:unauthorized', () => window.trackingExpiryEvents++); });
    const rejected = page.waitForResponse(r => r.url().endsWith('/client/request-otp'));
    await page.locator('main form button[type="submit"]').click();
    expect((await rejected).status()).toBe(401);
    await expect(phone).toBeVisible();
    expect(await page.evaluate(() => window.trackingExpiryEvents)).toBe(0);
    await phone.fill('0712 000 081'); await phone.blur(); await expect(phone).toHaveValue('+255712000081');
    await expect(page.getByText(lang === 'en' ? /Local numbers use \+255/ : /Namba za Tanzania hubadilishwa/)).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).include('main form').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    const pending = page.waitForResponse(r => r.url().endsWith('/client/request-otp'));
    await page.locator('main form button[type="submit"]').click();
    const issued = await pending; expect(issued.status()).toBe(200);
    expect(issued.request().postDataJSON().clientWhatsApp).toBe('+255712000081');
    const { devOtp } = await issued.json();
    await page.locator('#track-login-otp').fill(devOtp);
    await page.locator('main form button[type="submit"]').click();
    await expect(page.locator('.customer-order-name')).toHaveText('Phone browser fixture');
    await expect(page.locator('.tracking-order')).not.toContainText(`TNZ-2026-${9998 + index}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`tracking-${lang}.png`), fullPage: true });
    await page.reload();
    await expect(page.locator('.customer-order-name')).toHaveText('Phone browser fixture');
    await expect(page.locator('.tracking-order')).not.toContainText(`TNZ-2026-${9998 + index}`);
    // An expired short session can still resume through the remembered device.
    await context.clearCookies({ name: 'tinzel_client' });
    await page.reload();
    await expect(page.locator('.customer-order-name')).toHaveText('Phone browser fixture');
    await expect(page.locator('.tracking-order')).not.toContainText(`TNZ-2026-${9998 + index}`);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}
