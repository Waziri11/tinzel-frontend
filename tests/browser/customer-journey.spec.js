import { test, expect } from './fixtures.js';

const states = [
  ['awaiting_payment', 'Awaiting payment', 'Inasubiri malipo'],
  ['payment_verified', 'Payment received', 'Malipo yamepokelewa'],
  ['queued_for_assignment', 'Preparing your design', 'Tunaandaa usanifu wako'],
  ['assigned', 'In design', 'Jarida linabuniwa'],
  ['in_design', 'In design', 'Jarida linabuniwa'],
  ['draft_manager_review', 'Checking your design', 'Tunakagua jarida lako'],
  ['client_review', 'Ready for your review', 'Tayari kwa mapitio yako'],
  ['revision_requested', 'Updating your magazine', 'Tunarekebisha jarida lako'],
  ['client_approved', 'Preparing for print', 'Tunaandaa uchapishaji'],
  ['print_document_prep', 'Preparing for print', 'Tunaandaa uchapishaji'],
  ['print_manager_review', 'Preparing for print', 'Tunaandaa uchapishaji'],
  ['printing_sent', 'Ready for printing', 'Tayari kuchapishwa'],
  ['printing_in_progress', 'Printing your magazine', 'Jarida lako linachapishwa'],
  ['printing_completed', 'Preparing for delivery', 'Tunaandaa uwasilishaji'],
  ['dispatched', 'On its way to you', 'Jarida lako liko njiani'],
  ['delivered', 'Delivered', 'Umepokea jarida lako'],
  ['closed', 'Order complete', 'Oda imekamilika'],
  ['on_hold', 'Temporarily paused', 'Oda imesitishwa kwa muda'],
  ['future_internal_state', 'Order update', 'Taarifa ya oda'],
];
for (const [lang, index] of [['en', 1], ['sw', 2]]) {
  test(`customer journey uses clear wording at every stage on mobile in ${lang}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(lang => localStorage.setItem('tinzel_language', lang), lang);
    const order = { _id: 'customer-order', trackingId: 'TNZ-2026-0005', clientName: 'Test Customer', formTitle: 'Birthday Magazine', price: 50000, currency: 'TZS', clientPreferredLanguage: lang, currentDraftVersion: 1, draftVersions: [], revisionRequests: [] };
    await page.route('**/api/client/order', route => route.fulfill({ json: { order } }));
    for (const [status, en, sw] of states) {
      order.status = status;
      await page.goto('/track');
      await expect(page.locator('.client-order-status').filter({ hasText: index === 1 ? en : sw })).toBeVisible();
      await expect(page.locator('.customer-status-description')).not.toBeEmpty();
      await expect(page.locator('main')).not.toContainText(/CONVEYOR BELT|queued for assignment|draft manager review|approval loop|print document prep|track\.status\.|future_internal_state/i);
      await expect(page.getByText('We sent a six-digit code by SMS.')).toHaveCount(0);
      if (status === 'awaiting_payment') {
        await expect(page.locator('.payment-deposit-summary')).toContainText(lang === 'en' ? 'Pay TSh 25,000 now' : 'Lipa TSh 25,000 sasa');
        await expect(page.locator('.payment-deposit-summary')).toContainText('25,000 TZS');
      }
      if (status === 'dispatched') await expect(page.locator('[aria-current="step"]')).toContainText(lang === 'en' ? '6. Delivery' : '6. Uwasilishaji');
      if (['delivered', 'closed'].includes(status)) await expect(page.locator('[aria-current="step"]')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), status).toBe(true);
      if (status === 'assigned') await page.screenshot({ path: info.outputPath(`customer-design-${lang}.png`), fullPage: true });
    }
  });
}

test('customer change history uses readable statuses and stays in updating while design resumes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await page.route('**/api/client/order', route => route.fulfill({ json: { order: {
    _id: 'changes', trackingId: 'TNZ-2026-0006', clientName: 'Test Customer', status: 'in_design', clientPreferredLanguage: 'en', draftVersions: [],
    revisionRequests: ['open', 'submitted_for_review', 'resolved'].map((status, index) => ({ _id: `request-${index}`, roundNumber: index + 1, status, items: [{ _id: `item-${index}`, text: 'Please update the name', pageReference: '2' }] })),
  } } }));
  await page.goto('/track');
  await expect(page.locator('.client-order-status').filter({ hasText: 'Updating your magazine' })).toBeVisible();
  for (const label of ['Request 1 · Changes received', 'Request 2 · Checking your updates', 'Request 3 · Updates ready']) await expect(page.getByText(label, { exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('submitted_for_review');
});

test('SMS confirmation disappears after the customer opens their order', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  let verified = false;
  await page.route('**/api/client/order', route => route.fulfill(verified
    ? { json: { order: { _id: 'verified', trackingId: 'TNZ-2026-0007', clientName: 'Test Customer', status: 'assigned', clientPreferredLanguage: 'en', draftVersions: [] } } }
    : { status: 401, json: { message: 'Please sign in again' } }));
  await page.route('**/api/client/request-otp', route => route.fulfill({ json: { success: true } }));
  await page.route('**/api/client/verify-otp', route => { verified = true; return route.fulfill({ json: { clientToken: 'cookie' } }); });
  await page.goto('/track');
  await expect(page.getByRole('button', { name: 'Continue to tracking' })).toBeEnabled();
  await page.locator('#track-login-id').click();
  await expect(page.locator('#track-login-id')).toBeFocused();
  await page.locator('#track-login-id').fill('TNZ-2026-0007');
  await expect(page.locator('#track-login-id')).toHaveValue('TNZ-2026-0007');
  await page.locator('#track-login-whatsapp').click();
  await page.locator('#track-login-whatsapp').fill('0712000001');
  await page.locator('#track-login-whatsapp').blur();
  await expect(page.locator('#track-login-whatsapp')).toHaveValue('+255712000001');
  await expect(page.locator('#track-login-id')).toHaveValue('TNZ-2026-0007');
  await page.getByRole('button', { name: 'Continue to tracking' }).click();
  await expect(page.getByText('We sent a six-digit code by SMS.')).toBeVisible();
  await page.locator('#track-login-otp').fill('123456');
  await page.getByRole('button', { name: 'View my order' }).click();
  await expect(page.locator('.client-order-status').filter({ hasText: 'In design' })).toBeVisible();
  await expect(page.getByText('We sent a six-digit code by SMS.')).toHaveCount(0);
});

test('magazine comments explain unsent feedback and completed updates in customer terms', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await page.route('**/api/client/order', route => route.fulfill({ json: { order: {
    _id: 'review', trackingId: 'TNZ-2026-0008', clientName: 'Test Customer', status: 'client_review', clientPreferredLanguage: 'en', currentDraftVersion: 1,
    draftVersions: [{ versionNumber: 1, managerReview: { status: 'approved' } }], revisionRequests: [],
  } } }));
  await page.route('**/api/proofs/client/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/pages/')) {
      if (url.searchParams.has('text')) return route.fulfill({ json: { width: 600, height: 800, items: [], imageRegions: [] } });
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/></svg>' });
    }
    return route.fulfill({ json: { state: 'ready', pageCount: 1, coverReady: true, pages: [{ page: 1, width: 600, height: 800 }], canComment: true, annotations: [
      { _id: 'unsent', page: 1, kind: 'text', text: 'Please check this spelling', rects: [{ x: .1, y: .1, width: .2, height: .03 }], createdAt: '2026-11-07T08:00:00Z', reviewStatus: 'private' },
      { _id: 'fixed', page: 1, kind: 'text', text: 'Change this name', rects: [{ x: .1, y: .1, width: .2, height: .03 }], createdAt: '2026-11-07T08:00:00Z', submittedAt: '2026-11-07T08:01:00Z', reviewStatus: 'addressed', correction: { roundNumber: 1, roundStatus: 'resolved', designerResponse: 'The name is corrected.' } },
    ] } });
  });
  await page.goto('/track');
  await page.getByRole('button', { name: /Comments/ }).click();
  await expect(page.locator('.proof-comment-status').filter({ hasText: 'Not sent yet' })).toBeVisible();
  await expect(page.locator('.proof-comment-status').filter({ hasText: 'Updated' })).toBeVisible();
  await expect(page.getByText('Update from our team', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send my changes (1)' })).toBeVisible();
  await expect(page.locator('.proof-comments')).not.toContainText(/submitted_for_review|Designer response|Return for corrections/);
});
