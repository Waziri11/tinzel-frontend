import { test, expect } from './fixtures.js';

test.use({ hasTouch: true });
const json = (route, data) => route.fulfill({ json: data });
const user = { _id: 'designer-1', name: 'Responsive Designer', role: 'designer', preferredLanguage: 'en' };
const order = {
  _id: 'responsive-order', trackingId: 'TNZ-RESPONSIVE', clientName: 'A long customer name for the responsive layout',
  formTitle: 'A magazine edition with a longer title', clientPreferredLanguage: 'en', status: 'in_design', currentDraftVersion: 1,
  assignedDesigner: user, submittedData: { story: 'A'.repeat(180) },
  submittedFields: [{ fieldId: 'story', label: 'Your story', order: 0 }], uploadedPhotos: [], revisionRequests: [],
  draftVersions: [{ versionNumber: 1, uploadedAt: '2026-11-01T10:00:00Z', managerReview: { status: 'approved' } }],
};
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/><text x="40" y="60">Responsive magazine</text></svg>';

async function readerFixture(page) {
  await page.route('**/api/proofs/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/pages/')) return url.searchParams.has('text')
      ? json(route, { width: 600, height: 800, text: [], imageRegions: [] })
      : route.fulfill({ contentType: 'image/svg+xml', body: svg });
    return json(route, { state: 'ready', pageCount: 3, pages: [1, 2, 3].map(page => ({ page })), annotations: [], canComment: false });
  });
}

async function fits(page, label) {
  await expect.poll(() => page.evaluate(() =>
    [document.documentElement, ...document.querySelectorAll('.staff-main, .pdf-book, [role="dialog"], .ant-drawer-body')]
      .filter(el => el.getClientRects().length && el.scrollWidth > el.clientWidth + 2)
      .map(el => ({ element: el.className || el.tagName, width: el.clientWidth, content: el.scrollWidth }))), { message: label }).toEqual([]);
}

async function reachable(locator, width, height) {
  await locator.click({ trial: true });
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
}

for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [820, 1180], [1024, 768], [844, 390]]) {
  test(`designer actions, reader and dialogs at ${width}x${height}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => { localStorage.setItem('tinzel_language', 'en'); localStorage.setItem('tinzel_staff_token', 'responsive'); });
    await page.route('**/api/staff/me', route => json(route, { user }));
    await page.route('**/api/designer/orders/responsive-order', route => json(route, { order, auditLogs: [] }));
    await page.route('**/api/staff/security', route => json(route, { sessions: [], devices: [], events: [] }));
    await readerFixture(page);
    await page.goto('/staff/design/orders/responsive-order');
    await expect(page.getByAltText('Magazine page 1')).toBeVisible();
    await fits(page, 'reader');
    for (const name of ['Zoom in', 'Zoom out', 'Next page', 'Previous page']) {
      const button = page.locator('.pdf-book').getByRole('button', { name, exact: true });
      await reachable(button, width, height);
      await button.click();
    }
    await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
    await expect(page.locator('.pdf-book.is-expanded')).toBeVisible();
    await fits(page, 'fullscreen reader');
    await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
    for (const name of ['Corrections', 'Client content', 'Version history']) {
      await page.getByRole('tab', { name, exact: true }).click();
      await fits(page, name);
    }
    await page.getByRole('button', { name: 'Upload new draft', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Upload new draft', exact: true });
    await dialog.getByLabel('Version summary').fill('A long summary that remains editable on a small screen.');
    await dialog.getByLabel('Magazine PDF · up to 500 MB').setInputFiles({ name: 'a-long-magazine-filename-for-mobile-review.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nfixture') });
    await fits(page, 'upload dialog');
    await reachable(dialog.getByRole('button', { name: 'Send to manager review', exact: true }), width, height);
    await page.screenshot({ path: info.outputPath('upload-dialog.png') });
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('dialog', { name: 'Cancel this upload?' }).getByRole('button', { name: 'Cancel upload', exact: true }).click();
    await page.getByRole('button', { name: 'Security', exact: true }).click();
    const securityDialog = page.getByRole('dialog', { name: 'Account security', exact: true });
    await expect(securityDialog).toBeVisible();
    await expect(securityDialog.getByRole('heading', { name: 'No active sessions.', exact: true })).toBeVisible();
    await fits(page, 'account security');
    await securityDialog.getByRole('textbox', { name: 'New phone number', exact: true }).fill('0712000000');
    await reachable(securityDialog.getByRole('button', { name: 'Verify new contact', exact: true }), width, height);
    await page.keyboard.press('Escape');
    await expect(securityDialog).toBeHidden();
    if (width < 992) {
      await page.getByRole('button', { name: 'Open workspace menu' }).click();
      await reachable(page.getByRole('button', { name: 'Open profile menu' }), width, height);
      await page.getByRole('button', { name: 'Open profile menu' }).click();
      await page.getByRole('menuitem', { name: 'My profile', exact: true }).click();
      await fits(page, 'profile');
      await reachable(page.getByRole('button', { name: 'Save', exact: true }), width, height);
    }
  });

  test(`customer corrections and delivery at ${width}x${height}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => { localStorage.setItem('tinzel_language', 'en'); sessionStorage.setItem('tinzel_client_token', 'responsive-client'); });
    let currentOrder = { ...order, status: 'client_review' };
    await page.route('**/api/client/order', route => json(route, { order: currentOrder }));
    await readerFixture(page);
    await page.goto('/track');
    await expect(page.getByAltText('Magazine page 1')).toBeVisible();
    await fits(page, 'customer proof');
    await page.getByRole('button', { name: 'Request changes', exact: true }).click();
    await page.getByRole('textbox', { name: 'Page number 1', exact: true }).fill('1');
    await fits(page, 'customer correction form');
    await page.screenshot({ path: info.outputPath('customer-corrections.png'), fullPage: true });
    currentOrder = { ...order, status: 'dispatched', dispatchDetails: { carrier: 'Courier', trackingReference: 'REFERENCE'.repeat(30) } };
    page.once('dialog', async dialog => { expect(dialog.type()).toBe('beforeunload'); await dialog.accept(); });
    await page.reload();
    await expect(page.getByText(/REFERENCE/)).toBeVisible();
    await fits(page, 'delivery details with long reference');
  });
}

test('security widget adapts to form width and invalidates the previous result', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tinzel_language', 'en');
    window.turnstile = {
      render(container, options) {
        const widget = document.createElement('div');
        widget.dataset.widgetSize = options.size;
        widget.style.cssText = `width:${options.size === 'compact' ? '150px' : '300px'};height:140px`;
        container.append(widget);
        window.completeChallenge = () => options.callback('test-token');
        return widget;
      },
      remove(widget) { widget.remove(); },
    };
  });
  await page.route('**/api/staff/auth-config', route => json(route, { captcha: { enabled: true, siteKey: 'fixture' } }));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/staff/login');
  await expect(page.locator('[data-widget-size="compact"]')).toBeVisible();
  await fits(page, 'compact security check');
  await page.evaluate(() => window.completeChallenge());
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect(page.locator('[data-widget-size="flexible"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
  await expect(page.locator('[data-widget-size]')).toHaveCount(1);
});

for (const [width, height] of [[320, 740], [768, 1024], [1024, 768], [844, 390]]) {
  test(`all manager action dialogs at ${width}x${height}`, async ({ page }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => { localStorage.setItem('tinzel_language', 'en'); localStorage.setItem('tinzel_staff_token', 'responsive-manager'); });
    const manager = { ...user, role: 'manager' };
    let current = { ...order, status: 'awaiting_payment' };
    await page.route('**/api/staff/me', route => json(route, { user: manager }));
    await page.route('**/api/manager/designers', route => json(route, { designers: [user] }));
    await page.route('**/api/manager/settings', route => json(route, { printer: { configured: true, phone: '0712000000' } }));
    await page.route(url => url.pathname === '/api/manager/orders', route => json(route, { orders: [current], total: 1, pageCount: 1, summary: {}, statusCounts: {} }));
    await page.route('**/api/manager/orders/responsive-order', route => json(route, { order: current, auditLogs: [] }));
    for (const [status, action, title] of [
      ['awaiting_payment', 'Verify payment', 'Verify payment'],
      ['assigned', 'Reassign', 'Assign designer'],
      ['print_manager_review', 'Authorize printing', 'Authorize printing'],
      ['printing_sent', 'Record acknowledgement', 'Record printer progress'],
      ['printing_completed', 'Authorize dispatch', 'Authorize courier dispatch'],
      ['dispatched', 'Confirm delivery', 'Confirm delivery and close'],
      ['on_hold', 'Resume order', 'Resume this order'],
      ['in_design', 'Place on hold', 'Place order on hold'],
    ]) {
      current = { ...order, status, ...(status === 'print_manager_review' ? { printDocument: { uploadedAt: '2026-11-01T10:00:00Z' } } : {}) };
      await page.goto('/staff/pre-design?orderId=responsive-order');
      const drawer = page.locator('.manager-order-drawer');
      await drawer.getByRole('button', { name: action, exact: true }).click();
      const dialog = page.getByRole('dialog', { name: title, exact: true });
      await expect(dialog).toBeVisible();
      await fits(page, title);
      await reachable(dialog.getByRole('button', { name: title, exact: true }), width, height);
      await page.screenshot({ path: info.outputPath(`${status}.png`) });
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    }
  });
}

for (const width of [320, 768, 1024]) test(`printer verification and download at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 740 });
  const invitation = 'a'.repeat(48);
  await page.route(`**/api/printer/invitations/${invitation}/otp`, route => json(route, { challengeId: 'printer-challenge' }));
  await page.route(`**/api/printer/invitations/${invitation}/verify`, route => json(route, { success: true }));
  await page.goto(`/printer/${invitation}`);
  await page.getByRole('button', { name: 'Send SMS code' }).click();
  await page.getByLabel('SMS code', { exact: true }).fill('123456');
  await fits(page, 'printer verification');
  await page.getByRole('button', { name: 'Verify access' }).click();
  await reachable(page.getByRole('button', { name: 'Download authorized print file' }), width, 740);
});

test('notification composer keeps close and cancel reachable in portrait and landscape', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('tinzel_language', 'en'); localStorage.setItem('tinzel_staff_token', 'responsive-admin'); });
  await page.route('**/api/staff/me', route => json(route, { user: { ...user, role: 'admin' } }));
  await page.route('**/api/notifications/diagnostics', route => json(route, { diagnostics: {} }));
  await page.route('**/api/notifications/settings', route => json(route, { settings: { channels: {}, triggers: {}, catalog: [] } }));
  for (const [width, height] of [[320, 740], [844, 390], [820, 1180]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/staff/notifications');
    await page.getByRole('button', { name: 'Send Tri-Channel Notification', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Send Tri-Channel Notification' });
    await fits(page, 'notification composer');
    await reachable(dialog.getByRole('button', { name: 'Cancel', exact: true }), width, height);
    await reachable(dialog.getByRole('button', { name: 'Close', exact: true }), width, height);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toBeHidden();
  }
});
