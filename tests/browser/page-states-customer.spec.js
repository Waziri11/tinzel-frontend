import { test, expect } from '@playwright/test';
import { clientOrderAction } from './fixtures.js';
const csrf = 'a'.repeat(48);
const form = { _id: 'edition-state-test', slug: 'state-test', title: 'Celebration edition', titleSw: 'Toleo la sherehe', price: 1000, currency: 'TZS', fields: [] };
const order = { _id: 'customer-state-test', submissionId: 'SUB-STATE-TEST', clientName: 'State fixture', clientWhatsApp: '+255700000001', clientPreferredLanguage: 'en', formTitle: 'Celebration edition', status: 'in_design', currentDraftVersion: 0, draftVersions: [], revisionRequests: [] };
async function prepare(page, lang = 'en') {
  await page.addInitScript(lang => localStorage.setItem('tinzel_language', lang), lang);
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith('/api/csrf/')) return route.fulfill({ json: { csrf } });
    if (path === '/api/public/forms') return route.fulfill({ json: { forms: [form] } });
    if (path === '/api/public/forms/state-test') return route.fulfill({ json: { form } });
    if (path === '/api/client/order') return route.fulfill({ status: 401, json: { message: 'Please sign in again' } });
    return route.fulfill({ json: { success: true, csrf } });
  });
}
for (const lang of ['en', 'sw']) {
  test(`edition unavailable differs from temporary failure and recovers in ${lang}`, async ({ page }) => {
    await prepare(page, lang);
    let response = 503;
    await page.route('**/api/public/forms/state-test', route => route.fulfill(response === 200 ? { json: { form } } : { status: response, json: { message: 'Request unavailable' } }));
    await page.goto('/catalogue/state-test');
    await expect(page.getByRole('heading', { name: lang === 'en' ? 'We could not open this edition' : 'Hatukuweza kufungua toleo hili' })).toBeVisible();
    response = 404;
    await page.getByRole('button', { name: lang === 'en' ? 'Try again' : 'Jaribu tena', exact: true }).click();
    await expect(page.getByRole('heading', { name: lang === 'en' ? 'This edition is unavailable' : 'Toleo hili halipatikani' })).toBeVisible();
    await page.getByRole('button', { name: lang === 'en' ? 'Browse editions' : 'Angalia matoleo', exact: true }).click();
    await expect(page).toHaveURL(/\/catalogue$/);
  });
}
test('catalogue refresh failure keeps loaded editions and search', async ({ page }) => {
  await prepare(page); await page.goto('/catalogue');
  await page.getByRole('searchbox').fill('Celebration');
  await expect(page.getByRole('searchbox')).toHaveValue('Celebration');
  await expect(page.getByRole('heading', { name: 'Celebration edition' })).toBeVisible();
  await page.route('**/api/public/forms', route => route.fulfill({ status: 503, json: { message: 'Temporary outage' } }));
  await page.getByRole('button', { name: 'Refresh editions', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The catalogue could not load' })).toBeVisible();
  await expect(page.getByRole('searchbox')).toHaveValue('Celebration');
  await expect(page.getByRole('heading', { name: 'Celebration edition' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'New editions are on their way' })).toHaveCount(0);
});
test('required details focus invalid field and cancelled discard retains answers', async ({ page }) => {
  await prepare(page); await page.goto('/catalogue/state-test');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('#magazine-client-name')).toBeFocused();
  await expect(page.locator('#magazine-client-name')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#magazine-client-name').fill('Keep my answers');
  await page.locator('#magazine-client-whatsapp').fill('+255700000001');
  await expect(page.getByRole('heading', { name: 'Answers saved in this browser', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear saved draft', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Clear saved answers?');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('#magazine-client-name')).toHaveValue('Keep my answers');
});
test('unconfirmed submission checks saved receipt without submitting twice', async ({ page }) => {
  await prepare(page); let submissions = 0, checks = 0;
  let sessionId, submittedBody, savedReceipt;
  const limits = { maxFileBytes: 25 * 1024 * 1024, maxFiles: 100, maxTotalBytes: 1024 * 1024 * 1024 };
  await page.route('**/api/public/media/sessions', route => {
    const body = route.request().postDataJSON();
    sessionId = body.id;
    expect(body.slug).toBe(form.slug);
    expect(sessionId).toMatch(/^[a-f0-9-]{36}$/);
    return route.fulfill({ status: 201, json: { success: true, id: sessionId, limits, result: null } });
  });
  await page.route('**/api/public/media/sessions/*/submit', route => {
    submissions++;
    expect(new URL(route.request().url()).pathname).toBe(`/api/public/media/sessions/${sessionId}/submit`);
    submittedBody = route.request().postDataJSON();
    // The server saved this submission, but its final response could not be confirmed.
    savedReceipt = { success: true, order: {
      submissionId: 'SUB-STATE-RECEIPT', formTitle: form.title, clientName: submittedBody.clientName,
      clientWhatsApp: submittedBody.clientWhatsApp, status: 'awaiting_payment', photosCount: 0,
      price: form.price, currency: form.currency,
    }, paymentOptions: [] };
    return route.fulfill({ status: 500, json: { message: 'Result unavailable', retryable: false } });
  });
  await page.route(/\/api\/public\/media\/sessions\/[^/]+$/, route => {
    checks++;
    expect(route.request().method()).toBe('GET');
    expect(new URL(route.request().url()).pathname).toBe(`/api/public/media/sessions/${sessionId}`);
    return route.fulfill({ json: { success: true, state: 'submitted', entries: [], completed: [], result: savedReceipt, limits } });
  });
  await page.goto('/catalogue/state-test');
  await page.locator('#magazine-client-name').fill('Keep my answers');
  await page.locator('#magazine-client-whatsapp').fill('+255700000001');
  await expect(page.locator('#magazine-client-name')).toHaveValue('Keep my answers');
  await expect(page.locator('#magazine-client-whatsapp')).toHaveValue('+255700000001');
  await page.getByRole('button', { name: '4 Review', exact: true }).click();
  await page.getByRole('button', { name: /Continue.*Pay/i }).click();
  await expect(page.getByRole('heading', { name: 'The submission result is unconfirmed' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Continue.*Pay/i })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Clear saved draft', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Check saved order', exact: true }).click();
  await expect(page.getByText('Your order has been saved', { exact: true })).toBeVisible();
  expect(submissions).toBe(1); expect(checks).toBe(1);
  expect(submittedBody.clientName).toBe('Keep my answers');
  expect(submittedBody.assetIds).toEqual([]);
});
test('tracking failed refresh retains order and explains no draft', async ({ page }) => {
  await prepare(page); let failed = false;
  await page.route('**/api/client/order', route => route.fulfill(failed ? { status: 503, json: { message: 'Order refresh unavailable' } } : { json: { order, csrf } }));
  await page.goto('/track');
  await expect(page.getByText('State fixture', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your magazine preview is not ready yet' })).toBeVisible();
  failed = true; await clientOrderAction(page, 'Refresh order');
  await expect(page.getByRole('heading', { name: 'These details may be out of date' })).toBeVisible();
  await expect(page.getByText('State fixture', { exact: true })).toBeVisible();
});
test('notification retry repeats failed read action', async ({ page }) => {
  await prepare(page); let attempts = 0;
  await page.route('**/api/client/order', route => route.fulfill({ json: { order, csrf } }));
  await page.route('**/api/client/notifications', route => route.fulfill({ json: { notifications: [{ _id: 'update-one', title: 'Your magazine is being designed', message: 'We are working on it.', createdAt: '2026-11-08T08:00:00.000Z', isRead: false }], unreadCount: 1 } }));
  await page.route('**/api/client/notifications/update-one/read', route => { attempts++; return route.fulfill(attempts === 1 ? { status: 503, json: { message: 'Save unavailable' } } : { json: { success: true } }); });
  await page.goto('/track'); await clientOrderAction(page, 'Notifications');
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Mark as read', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Could not mark this update as read' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(dialog.getByText('Update marked as read.', { exact: true })).toBeVisible();
  expect(attempts).toBe(2); await expect(dialog.getByRole('button', { name: 'Mark as read', exact: true })).toHaveCount(0);
});

test('repeated session expiry cannot carry unsent feedback into another order', async ({ page }) => {
  await prepare(page);
  let currentOrder = { ...order, _id: 'first-order', status: 'client_review', currentDraftVersion: 1, draftVersions: [{ versionNumber: 1 }] };
  await page.route('**/api/client/order', route => route.fulfill({ json: { order: currentOrder, csrf } }));
  await page.route('**/api/proofs/client/**', route => route.fulfill({ json: { state: 'ready', pageCount: 0, pages: [], annotations: [], canComment: true } }));
  await page.route('**/api/client/request-otp', route => route.fulfill({ json: { clientToken: 'cookie', csrf } }));
  await page.goto('/track');
  await page.getByRole('button', { name: 'Request changes', exact: true }).click();
  await page.getByLabel('Written feedback 1', { exact: true }).fill('Private changes for the first order');
  await page.evaluate(() => window.dispatchEvent(new Event('tinzel:client:unauthorized')));
  await expect(page.locator('#track-login-id')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('tinzel:client:unauthorized')));
  await expect(page.getByRole('heading', { name: 'Your unsent feedback is still on this page' })).toBeVisible();
  currentOrder = { ...currentOrder, _id: 'second-order', submissionId: 'SUB-SECOND', clientName: 'Second order fixture' };
  await page.locator('#track-login-id').fill('SUB-SECOND');
  await page.locator('#track-login-whatsapp').fill('+255700000001');
  await page.getByRole('button', { name: 'Continue to tracking', exact: true }).click();
  await expect(page.getByText('Second order fixture', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Request changes', exact: true }).click();
  await expect(page.getByLabel('Written feedback 1', { exact: true })).toBeEmpty();
});

test('successful SMS verification does not repeatedly reload an open notification inbox', async ({ page }) => {
  await prepare(page);
  await page.clock.install();
  let verified = false, notificationLoads = 0;
  await page.route('**/api/client/order', route => route.fulfill(verified ? { json: { order, csrf } } : { status: 401, json: { message: 'Please sign in again' } }));
  await page.route('**/api/client/request-otp', route => route.fulfill({ json: { success: true, channel: 'sms' } }));
  await page.route('**/api/client/verify-otp', route => { verified = true; return route.fulfill({ json: { clientToken: 'cookie', csrf } }); });
  await page.route('**/api/client/notifications', route => { notificationLoads++; return route.fulfill({ json: { notifications: [], unreadCount: 0 } }); });
  await page.goto('/track');
  await page.locator('#track-login-id').fill(order.submissionId);
  await page.locator('#track-login-whatsapp').fill(order.clientWhatsApp);
  await page.getByRole('button', { name: 'Continue to tracking', exact: true }).click();
  await page.locator('#track-login-otp').fill('123456');
  await page.getByRole('button', { name: 'View my order', exact: true }).click();
  await expect(page.getByText('State fixture', { exact: true })).toBeVisible();
  await clientOrderAction(page, 'Notifications');
  await expect(page.getByRole('heading', { name: 'No order updates yet', exact: true })).toBeVisible();
  const loaded = notificationLoads;
  await page.clock.runFor(4000);
  expect(notificationLoads).toBe(loaded);
});
for (const lang of ['en', 'sw']) {
  test(`printer unavailable invitation has bilingual recovery in ${lang}`, async ({ page }) => {
    await prepare(page, lang); await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/printer/invitations/*/otp', route => route.fulfill({ status: 404, json: { message: 'Print invitation unavailable or expired' } }));
    await page.goto('/printer/abcdefabcdefabcdefabcdef');
    await page.getByRole('button', { name: lang === 'en' ? 'Send SMS code' : 'Tuma msimbo wa SMS', exact: true }).click();
    await expect(page.getByRole('heading', { name: lang === 'en' ? 'This invitation is unavailable' : 'Mwaliko huu haupatikani' })).toBeVisible();
    await expect(page.getByRole('link', { name: lang === 'en' ? 'Return home' : 'Rudi mwanzo', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/tinzel-customer-printer-state-${lang}.png`, fullPage: true });
  });
}
