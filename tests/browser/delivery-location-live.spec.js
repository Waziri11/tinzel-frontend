import { test, expect } from '@playwright/test';
import { securityLogin } from './security-login.js';

test('client approval and location reach persistent storage and the manager delivery view', async ({ page, browser, request }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await page.goto('/track');
  await page.locator('#track-login-id').fill('TNZ-SECURITY-1');
  await page.locator('#track-login-whatsapp').fill('0712000011');
  const pendingOtp = page.waitForResponse(response => response.url().endsWith('/client/request-otp'));
  await page.getByRole('button', { name: 'Continue to tracking' }).click();
  const issued = await pendingOtp;
  expect(issued.ok()).toBe(true);
  await page.locator('#track-login-otp').fill((await issued.json()).devOtp);
  await page.getByRole('button', { name: 'View my order' }).click();
  // Stored account language takes precedence over the browser preference.
  const approvalButton = page.getByRole('button', { name: /^(Approve for printing|Idhinisha uchapishaji)$/ });
  await approvalButton.click();
  const pendingApproval = page.waitForResponse(response => response.url().endsWith('/client/approve-draft'));
  await page.getByRole('dialog').getByRole('button', { name: /^(Approve for printing|Idhinisha uchapishaji)$/ }).click();
  const approval = await pendingApproval;
  expect(approval.ok()).toBe(true);
  const { order } = await approval.json();
  const location = page.locator('#delivery-location');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(location).toBeVisible();
  await expect(location).toBeFocused();
  await page.locator('.client-delivery-location').screenshot({ path: info.outputPath('delivery-prompt.png'), animations: 'disabled' });
  await location.fill('Dar es Salaam, Mikocheni, near the library');
  const pendingSave = page.waitForResponse(response => response.url().endsWith('/client/delivery-location'));
  await page.locator('.client-delivery-location button[type="submit"]').click();
  const saved = await pendingSave;
  expect(saved.status()).toBe(200);
  expect(saved.request().headers()['x-csrf-token']).toBeTruthy();
  await expect(page.locator('.client-delivery-location__value')).toHaveText('Dar es Salaam, Mikocheni, near the library');
  await page.reload();
  await expect(page.locator('.client-delivery-location__value')).toHaveText('Dar es Salaam, Mikocheni, near the library');

  const managerToken = await securityLogin(request, 'manager');
  const managerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    await managerContext.addCookies([{ name: 'tinzel_staff', value: managerToken, url: 'http://127.0.0.1:5177', httpOnly: true, sameSite: 'Strict' }]);
    await managerContext.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
    const managerPage = await managerContext.newPage();
    managerPage.on('pageerror', error => errors.push(error.message));
    await managerPage.goto(`/staff/post-design?orderId=${order._id}&tab=production`);
    await expect(managerPage.getByText('Client delivery location', { exact: true })).toBeVisible();
    await expect(managerPage.getByText('Dar es Salaam, Mikocheni, near the library', { exact: true })).toBeVisible();
    await managerPage.screenshot({ path: info.outputPath('manager-delivery-location.png'), fullPage: true, animations: 'disabled' });
  } finally {
    await managerContext.close();
  }
  expect(errors).toEqual([]);
});
