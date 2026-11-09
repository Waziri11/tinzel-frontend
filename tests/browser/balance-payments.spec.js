import { test, expect, openClientReview, chooseEnglish } from './fixtures.js';
import AxeBuilder from '@axe-core/playwright';

const json = (route, data, status = 200) => route.fulfill({ status, json: data });
const deposit = { _id: 'deposit', kind: 'initial', amount: 25000, status: 'approved', reference: 'DEPOSIT', reviewedAt: '2026-11-01T10:00:00Z' };
function fixture(lang = 'en') {
  return { _id: 'balance-order', clientName: 'Payment customer', clientPreferredLanguage: lang, formTitle: 'Celebration', status: 'client_review', price: 50000, totalPrice: 50000, currency: 'TZS',
    currentDraftVersion: 1, draftVersions: [{ versionNumber: 1, managerReview: { status: 'approved' } }], revisionRequests: [],
    payment: { total: 50000, paid: 25000, remaining: 25000, currency: 'TZS', fullyPaid: false, pending: null, history: [{ ...deposit }] },
    paymentOptions: [{ id: 'till', type: 'till', name: 'Lipa Namba', number: 'TEST', accountName: 'Tinzel test', instructions: 'Test payment instructions', instructionsSw: 'Maelekezo ya malipo ya majaribio' }],
    createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-09T10:00:00Z' };
}
async function client(page, order) {
  await page.addInitScript(lang => localStorage.setItem('tinzel_language', lang), order.clientPreferredLanguage);
  await page.route('**/api/client/order', route => json(route, { order }));
  await page.route('**/api/proofs/client/**', route => json(route, { state: 'ready', pageCount: 0, pages: [], annotations: [], canComment: true }));
  await page.route('**/api/client/approve-draft', route => {
    order.status = order.payment.fullyPaid ? 'client_approved' : 'awaiting_balance_payment'; order.approvedVersionNumber = 1;
    return json(route, { order });
  });
}
for (const lang of ['en', 'sw']) test(`approval prompts for the exact remaining payment and preserves pending review on mobile in ${lang}`, async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const order = fixture(lang); await client(page, order);
  let calls = 0;
  await page.route('**/api/client/balance-payment', route => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({ reference: 'PAID-BALANCE', amount: 25000 });
    expect(route.request().headers()['x-csrf-token']).toBeTruthy();
    const pending = { _id: 'payment-1', kind: 'balance', amount: 25000, reference: 'PAID-BALANCE', status: 'pending', submittedAt: new Date().toISOString() };
    order.status = 'balance_payment_review'; order.payment.pending = pending; order.payment.history.push(pending);
    return json(route, { order });
  });
  await page.goto('/track'); await openClientReview(page);
  const approve = lang === 'en' ? 'Approve for printing' : 'Idhinisha uchapishaji';
  await page.getByRole('button', { name: approve, exact: true }).click();
  await page.getByRole('dialog', { name: lang === 'en' ? 'Approve this magazine for printing?' : 'Uidhinishe jarida hili kwa uchapishaji?' }).getByRole('button', { name: approve, exact: true }).click();
  const panel = page.locator('.client-balance-payment');
  await expect(panel.getByRole('heading', { name: lang === 'en' ? 'Pay the remaining balance' : 'Lipa kiasi kilichobaki' })).toBeFocused();
  await expect(panel.locator('.order-payments__totals > div').last()).toContainText('25,000');
  await page.getByRole('button', { name: lang === 'en' ? 'I have paid' : 'Nimelipa', exact: true }).click();
  await expect(page.locator('#balance-amount')).toHaveValue('25000');
  await page.locator('#balance-reference').fill('PAID-BALANCE');
  await page.getByRole('button', { name: lang === 'en' ? 'Send payment for approval' : 'Tuma malipo kwa idhini', exact: true }).click();
  await expect(panel.getByRole('heading', { name: lang === 'en' ? 'Payment awaiting approval' : 'Malipo yanasubiri idhini', exact: true })).toBeVisible();
  expect(calls).toBe(1); await page.reload();
  await expect(panel.getByText('PAID-BALANCE', { exact: false })).toBeVisible();
  await expect(panel.locator('#balance-reference')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include('.client-balance-payment').withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await panel.screenshot({ path: info.outputPath(`balance-pending-${lang}.png`) });
});

test('fully paid customers are not prompted for a second payment', async ({ page }) => {
  const order = fixture(); order.status = 'client_approved'; order.approvedVersionNumber = 1;
  order.payment = { ...order.payment, fullyPaid: true, paid: 50000, remaining: 0, history: [{ ...deposit, amount: 50000 }] };
  await client(page, order); await page.goto('/track');
  await expect(page.getByRole('heading', { name: 'Where should we deliver your magazine?' })).toBeVisible();
  await expect(page.locator('.client-balance-payment')).toHaveCount(0);
});

async function manager(page, order) {
  const user = { _id: 'manager-1', name: 'Manager', role: 'manager', preferredLanguage: 'en', isActive: true };
  await page.addInitScript(() => { localStorage.setItem('tinzel_staff_token', 'test'); localStorage.setItem('tinzel_language', 'en'); });
  await page.route('**/api/staff/me', route => json(route, { user }));
  await page.route('**/api/manager/designers', route => json(route, { designers: [] }));
  await page.route('**/api/manager/settings', route => json(route, { printer: { configured: true } }));
  await page.route(url => url.pathname === '/api/manager/orders', route => json(route, { orders: [order], total: 1, page: 1, pageCount: 1, summary: {}, statusCounts: { [order.status]: 1 } }));
  await page.route('**/api/manager/orders/balance-order', route => json(route, { order, auditLogs: [] }));
}
test('post-design starts with balance payment and managers approve the submitted payment in submission details', async ({ page }, info) => {
  const order = fixture(); order.status = 'balance_payment_review'; order.approvedVersionNumber = 1;
  const pending = { _id: 'payment-1', kind: 'balance', amount: 25000, reference: 'FINAL-REF', status: 'pending' };
  order.payment.pending = pending; order.payment.history.push(pending);
  await manager(page, order);
  let calls = 0;
  await page.route('**/api/manager/orders/balance-order/balance-payment', route => {
    calls++; expect(route.request().postDataJSON()).toMatchObject({ decision: 'approve', paymentId: 'payment-1' });
    pending.status = 'approved'; pending.reviewedByName = 'Manager'; pending.reviewedAt = new Date().toISOString();
    order.payment = { ...order.payment, paid: 50000, remaining: 0, fullyPaid: true, pending: null };
    order.status = 'client_approved';
    return json(route, { success: true, message: 'Payment approved.', order });
  });
  await page.goto('/staff/post-design'); await chooseEnglish(page);
  await expect(page.locator('.manager-board-column').first()).toContainText('Balance Payment');
  await page.getByRole('button', { name: /^Open Payment customer, waiting / }).click();
  const drawer = page.getByRole('dialog');
  await drawer.getByRole('tab', { name: 'Payment', exact: true }).click();
  await expect(drawer.getByText('DEPOSIT', { exact: false })).toBeVisible();
  const paymentPanel = drawer.getByRole('tabpanel', { name: 'Payment', exact: true });
  await expect(paymentPanel.getByText('FINAL-REF', { exact: false })).toBeVisible();
  await paymentPanel.getByRole('button', { name: 'Approve balance payment', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Approve balance payment', exact: true });
  await expect(modal.getByLabel('Payment reference')).toHaveValue('FINAL-REF');
  await expect(modal.getByLabel('Payment reference')).toHaveAttribute('readonly', '');
  await modal.getByRole('button', { name: 'Approve balance payment', exact: true }).click();
  await expect(modal).toHaveCount(0); expect(calls).toBe(1);
  await expect(paymentPanel.getByText('Fully paid', { exact: true })).toBeVisible();
  await expect(paymentPanel.getByRole('button', { name: 'Approve balance payment' })).toHaveCount(0);
  await paymentPanel.screenshot({ path: info.outputPath('manager-payment-approved.png') });
});

test('initial payments are available in the submission payment tab', async ({ page }) => {
  const order = fixture(); order.status = 'awaiting_payment'; order.draftVersions = [];
  order.payment = { ...order.payment, paid: 0, remaining: 50000, history: [] };
  await manager(page, order); await page.goto('/staff/pre-design?orderId=balance-order&tab=payment'); await chooseEnglish(page);
  const drawer = page.getByRole('dialog');
  await drawer.getByRole('tab', { name: 'Payment', exact: true }).click();
  await drawer.getByRole('button', { name: 'Approve initial payment', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Verify payment', exact: true });
  await expect(modal.getByLabel('Amount paid (TZS)')).toHaveValue('25000');
});
