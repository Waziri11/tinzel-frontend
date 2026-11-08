import { test, expect } from './fixtures.js';

const order = { _id: 'submission-delete-fixture', clientName: 'Asha Mushi', formTitle: 'Birthday Magazine', status: 'awaiting_payment', uploadedPhotos: [], submittedData: {}, draftVersions: [], createdAt: '2026-11-08T10:00:00Z', updatedAt: '2026-11-08T10:00:00Z' };
async function setup(page, { role = 'admin', lang = 'en', failFirst = false, delay = 0, stepUp = false } = {}) {
  await page.addInitScript(lang => localStorage.setItem('tinzel_language', lang), lang);
  let deleted = false, attempts = 0, verified = !stepUp;
  await page.route('**/api/staff/me', route => route.fulfill({ json: { user: { _id: 'staff-fixture', name: 'Staff fixture', role, preferredLanguage: lang } } }));
  await page.route('**/api/manager/designers', route => route.fulfill({ json: { designers: [] } }));
  await page.route('**/api/manager/settings', route => route.fulfill({ json: { printer: {} } }));
  await page.route(url => url.pathname === '/api/manager/orders', route => route.fulfill({ json: { orders: deleted ? [] : [order], total: deleted ? 0 : 1, pageCount: 1, summary: {}, statusCounts: {} } }));
  await page.route(`**/api/manager/orders/${order._id}`, route => route.fulfill({ json: { order, auditLogs: [] } }));
  await page.route('**/api/staff/step-up', route => route.fulfill({ json: { challengeId: 'test-challenge', channel: 'sms', expiresIn: 300 } }));
  await page.route('**/api/staff/step-up/verify', route => {
    expect(route.request().postDataJSON().code).toBe('123456');
    verified = true;
    return route.fulfill({ json: { success: true } });
  });
  await page.route(`**/api/admin/submissions/${order._id}`, async route => {
    attempts++;
    expect(route.request().method()).toBe('DELETE');
    expect(route.request().postDataJSON()).toEqual({ confirmation: 'DELETE' });
    if (!verified) return route.fulfill({ status: 403, json: { errorCode: 'OTP_REQUIRED', message: 'Verify your identity before continuing' } });
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    if (failFirst && attempts === 1) return route.fulfill({ status: 503, json: { message: 'Please try again shortly.' } });
    deleted = true;
    return route.fulfill({ status: 202, json: { success: true, state: 'deleting' } });
  });
  await page.goto(`/staff/pre-design?orderId=${order._id}`);
  await expect(page.locator('.manager-order-detail')).toContainText(order.clientName);
  return { attempts: () => attempts };
}

test('admin must confirm deletion and cancellation sends no request', async ({ page }) => {
  const fixture = await setup(page);
  await page.getByRole('button', { name: 'Delete submission', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Permanently delete submission?' });
  await expect(dialog).toContainText('Asha Mushi'); await expect(dialog).toContainText('Birthday Magazine');
  await expect(dialog).toContainText('This cannot be undone.');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(fixture.attempts()).toBe(0);
  await expect(page.locator('.manager-order-detail')).toBeVisible();
});

test('confirmed deletion blocks duplicate actions then closes details and refreshes the board', async ({ page }) => {
  const fixture = await setup(page, { delay: 600 });
  await page.getByRole('button', { name: 'Delete submission', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Permanently delete submission?' });
  await dialog.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
  await expect(page.getByText('Submission removed. Its files are scheduled for permanent cleanup.')).toBeVisible();
  await expect(page).not.toHaveURL(/orderId=/);
  await expect(page.locator('.manager-order-detail')).toHaveCount(0);
  await expect(page.locator('.manager-stage-row')).toHaveCount(0);
  expect(fixture.attempts()).toBe(1);
});

test('failed deletion stays visible and can be safely retried', async ({ page }) => {
  const fixture = await setup(page, { failFirst: true });
  await page.getByRole('button', { name: 'Delete submission', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Permanently delete submission?' });
  await dialog.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(page.locator('.manager-order-detail')).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(page.getByText('Submission removed. Its files are scheduled for permanent cleanup.')).toBeVisible();
  expect(fixture.attempts()).toBe(2);
});

test('manager cannot see the administrator delete action', async ({ page }) => {
  await setup(page, { role: 'manager' });
  await expect(page.getByRole('button', { name: 'Delete submission', exact: true })).toHaveCount(0);
});

test('older admin sessions verify by SMS before the confirmed deletion retries', async ({ page }) => {
  const fixture = await setup(page, { stepUp: true });
  await page.getByRole('button', { name: 'Delete submission', exact: true }).click();
  await page.getByRole('dialog', { name: 'Permanently delete submission?' }).getByRole('button', { name: 'Delete permanently', exact: true }).click();
  const verification = page.getByRole('dialog', { name: 'Verify your identity' });
  await verification.getByRole('button', { name: 'Request a new code', exact: true }).click();
  await expect(verification.getByRole('button', { name: 'Verify code', exact: true })).toBeEnabled();
  await verification.getByRole('textbox', { name: 'Verification code', exact: true }).fill('123456');
  await verification.getByRole('button', { name: 'Verify code', exact: true }).click();
  await expect(page.getByText('Submission removed. Its files are scheduled for permanent cleanup.')).toBeVisible();
  expect(fixture.attempts()).toBe(2);
});

test('Swahili confirmation fits on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, { lang: 'sw' });
  await page.getByRole('button', { name: 'Futa wasilisho', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Futa wasilisho kabisa?' });
  await expect(dialog).toContainText('Haiwezi kutenguliwa.');
  await expect(dialog.getByRole('button', { name: 'Futa kabisa', exact: true })).toBeVisible();
  await expect(dialog).not.toHaveClass(/ant-zoom-(appear|enter|leave)/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  await page.screenshot({ path: 'test-results/submission-delete-mobile-sw.png', fullPage: true });
});
