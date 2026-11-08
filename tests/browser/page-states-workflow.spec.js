import { test, expect, chooseEnglish } from './fixtures.js';

const manager = { _id: 'manager-state', name: 'Manager', email: 'manager@example.test', role: 'manager', preferredLanguage: 'en', isActive: true };
const designer = { ...manager, _id: 'designer-state', name: 'Designer', role: 'designer' };
const order = { _id: 'state-order', clientName: 'Asha', formTitle: 'Celebration', status: 'assigned', currentDraftVersion: 0, draftVersions: [], revisionRequests: [], uploadedPhotos: [], submittedData: {}, formId: { title: 'Celebration', fields: [] }, assignedDesigner: { _id: designer._id, name: designer.name }, createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-08T10:00:00Z' };
const json = (route, data, status = 200) => route.fulfill({ status, json: data });
const list = orders => ({ orders, total: orders.length, page: 1, pageCount: 1, summary: {}, statusCounts: { assigned: orders.length } });
async function staff(page, user = manager) {
  await page.addInitScript(() => { localStorage.setItem('tinzel_staff_token', 'state-test'); localStorage.setItem('tinzel_language', 'en'); });
  await page.route('**/api/staff/me', route => json(route, { user }));
  await page.route('**/api/manager/designers', route => json(route, { designers: [designer] }));
  await page.route('**/api/manager/settings', route => json(route, { printer: { configured: false } }));
}
async function open(page, path) { await page.goto(path); await chooseEnglish(page); }

test('manager load failure never becomes all clear or zero, and retry recovers', async ({ page }) => {
  await staff(page);
  let fail = true;
  await page.route(url => url.pathname === '/api/manager/orders', route => fail ? json(route, { message: 'Service unavailable' }, 503) : json(route, list([])));
  await open(page, '/staff/design-phase');
  await expect(page.locator('.manager-dashboard .tinzel-state.is-error')).toBeVisible();
  await expect(page.getByText('All clear in this phase', { exact: true })).toHaveCount(0);
  await expect(page.getByText('No orders in this phase yet', { exact: true })).toHaveCount(0);
  await expect(page.locator('.manager-summary-card strong').first()).toHaveText('—');
  fail = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No orders in this phase yet' })).toBeVisible();
});

test('manager refresh keeps existing rows and identifies stale data', async ({ page }) => {
  await staff(page);
  let fail = false;
  await page.route(url => url.pathname === '/api/manager/orders', route => fail ? json(route, {}, 503) : json(route, list([order])));
  await open(page, '/staff/design-phase');
  await expect(page.getByRole('button', { name: /Open Asha/ })).toBeVisible();
  fail = true;
  await page.getByRole('button', { name: 'Refresh orders' }).click();
  await expect(page.getByText('Showing the last loaded orders. They may be out of date.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Open Asha/ })).toBeVisible();
});

test('manager drawer has its own retry and empty activity state', async ({ page }) => {
  await staff(page);
  await page.route(url => url.pathname === '/api/manager/orders', route => json(route, list([order])));
  let fail = true;
  await page.route('**/api/manager/orders/state-order', route => fail ? json(route, {}, 503) : json(route, { order, auditLogs: [] }));
  await open(page, '/staff/design-phase?orderId=state-order');
  const drawer = page.getByRole('dialog');
  await expect(drawer.locator('.tinzel-state.is-error')).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Close order' })).toBeVisible();
  fail = false;
  await drawer.getByRole('button', { name: 'Try again' }).click();
  await drawer.getByRole('tab', { name: 'Activity (0)' }).click();
  await expect(drawer.getByRole('heading', { name: 'No recorded activity yet' })).toBeVisible();
});

test('printer configuration failure is recoverable and does not claim no configured printer', async ({ page }) => {
  await staff(page);
  const printOrder = { ...order, status: 'print_manager_review', approvedVersionNumber: 1, printDocument: { uploadedAt: '2026-11-08T10:00:00Z' } };
  await page.route(url => url.pathname === '/api/manager/orders', route => json(route, list([printOrder])));
  await page.route('**/api/manager/orders/state-order', route => json(route, { order: printOrder, auditLogs: [] }));
  await page.route('**/api/manager/settings', route => json(route, {}, 503));
  await open(page, '/staff/post-design?orderId=state-order');
  await page.getByRole('dialog').getByRole('button', { name: 'Authorize printing', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Authorize printing' });
  await expect(modal.getByRole('heading', { name: 'Printer settings are unavailable' })).toBeVisible();
  await expect(modal.getByText('No verified printer is configured. Ask an administrator to configure it first.')).toHaveCount(0);
  await expect(modal.getByRole('button', { name: 'Authorize printing', exact: true })).toBeDisabled();
});

test('designer column retries independently with an unknown count and keeps loaded cards on later failure', async ({ page }) => {
  await staff(page, designer);
  let fail = true;
  await page.route(url => url.pathname === '/api/designer/orders', route => {
    const column = new URL(route.request().url()).searchParams.get('column');
    return column === 'new' && fail ? json(route, {}, 503) : json(route, list(column === 'new' ? [order] : []));
  });
  await open(page, '/staff/design');
  const column = page.locator('.designer-kanban-column.is-new');
  await expect(column.getByRole('status', { name: 'Order count unavailable', exact: true })).toHaveText('—');
  await expect(column.getByRole('heading', { name: 'No design orders waiting' })).toHaveCount(0);
  fail = false;
  await column.getByRole('button', { name: 'Try again' }).click();
  await expect(column.getByRole('button', { name: 'Open Asha' })).toBeVisible();
  await expect(column.getByRole('status', { name: 'Orders', exact: true })).toHaveText('1');
  fail = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(column.getByText('Showing the last loaded orders. They may be out of date.')).toBeVisible();
  await expect(column.getByRole('button', { name: 'Open Asha' })).toBeVisible();
});

test('returns failure is not an empty inbox and retry restores the role-specific next action', async ({ page }) => {
  await staff(page, designer);
  let fail = true;
  await page.route(url => url.pathname === '/api/designer/returns', route => fail ? json(route, {}, 503) : json(route, { returns: [], summary: {} }));
  await open(page, '/staff/returns');
  await expect(page.getByRole('heading', { name: 'Corrections could not be loaded' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No corrections waiting' })).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'No corrections waiting' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to orders' })).toBeVisible();
});

test('designer detail retries without losing the page and explains empty draft and approval gate', async ({ page }) => {
  await staff(page, designer);
  let fail = true;
  await page.route('**/api/designer/orders/state-order', route => fail ? json(route, {}, 503) : json(route, { order, auditLogs: [] }));
  await open(page, '/staff/design/orders/state-order');
  await expect(page.getByRole('heading', { name: 'This order could not be opened' })).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('tab', { name: 'Magazine', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No magazine uploaded yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload first draft' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Waiting for client approval' })).toBeVisible();
  await page.getByRole('tab', { name: 'Version history', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No versions submitted yet' })).toBeVisible();
});

test('missing review version gives a current-version recovery action', async ({ page }) => {
  await staff(page);
  await page.route('**/api/manager/orders/state-order', route => json(route, { order: { ...order, currentDraftVersion: 2, draftVersions: [{ versionNumber: 2 }] }, auditLogs: [] }));
  await open(page, '/staff/review/state-order/versions/1');
  await expect(page.getByRole('heading', { name: 'Magazine version not found' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open current version' })).toBeVisible();
});

test('Swahili workflow failure and retry recover to localized empty states', async ({ page }) => {
  await staff(page, { ...designer, preferredLanguage: 'sw' });
  let fail = true;
  await page.route(url => url.pathname === '/api/designer/returns', route => fail ? json(route, {}, 503) : json(route, { returns: [], summary: {} }));
  await open(page, '/staff/returns');
  await expect(page.getByRole('heading', { name: 'Marekebisho hayakuweza kupakiwa' })).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Jaribu tena' }).click();
  await expect(page.getByRole('heading', { name: 'Hakuna marekebisho yanayosubiri' })).toBeVisible();
});


test('uncertain print preparation requires checking the saved result before another submission', async ({ page }) => {
  await staff(page, designer);
  const printOrder = { ...order, status: 'client_approved', approvedVersionNumber: 1 };
  await page.route('**/api/designer/orders/state-order', route => json(route, { order: printOrder, auditLogs: [] }));
  let submits = 0;
  await page.route('**/api/designer/orders/state-order/upload-print-document', route => { submits++; return json(route, {}, 503); });
  await open(page, '/staff/design/orders/state-order');
  await page.getByRole('tab', { name: 'Magazine', exact: true }).click();
  const submit = page.getByRole('button', { name: 'Use approved draft v1 for print' });
  await submit.click();
  await expect(page.getByRole('heading', { name: 'The print submission is unconfirmed' })).toBeVisible();
  await expect(submit).toBeDisabled();
  expect(submits).toBe(1);
  printOrder.printDocument = { uploadedAt: '2026-11-08T10:00:00Z' };
  await page.getByRole('button', { name: 'Check saved order' }).click();
  await expect(submit).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'The print submission is unconfirmed' })).toHaveCount(0);
  expect(submits).toBe(1);
});

test('workflow failure and recovery controls fit a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await staff(page);
  await page.route(url => url.pathname === '/api/manager/orders', route => json(route, {}, 503));
  await open(page, '/staff/design-phase');
  await expect(page.getByRole('heading', { name: 'Orders could not be loaded' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: '/private/tmp/tinzel-workflow-error-mobile.png', fullPage: true });
});

test('manager drawer tabs retain indexed history and do not reload usable details', async ({ page }) => {
  await staff(page);
  await page.route(url => url.pathname === '/api/manager/orders', route => json(route, list([order])));
  let detailRequests = 0;
  await page.route('**/api/manager/orders/state-order', route => { detailRequests++; return json(route, { order, auditLogs: [] }); });
  await open(page, '/staff/design-phase');
  await page.getByRole('button', { name: /Open Asha/ }).click();
  const drawer = page.getByRole('dialog');
  await drawer.getByRole('tab', { name: 'Activity (0)' }).click();
  expect(await page.evaluate(() => Number.isInteger(history.state?.tinzelEntry))).toBe(true);
  await page.goBack();
  await expect(drawer.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute('aria-selected', 'true');
  expect(detailRequests).toBe(1);
  await page.goBack();
  await expect(drawer).toHaveCount(0);
  await expect(page).toHaveURL(/\/staff\/design-phase$/);
});


test('saved correction review consumes its flag and branded cancel can preserve or remove the upload', async ({ page }) => {
  await staff(page, designer);
  const saved = { id: 'ready-upload', readyForReview: true, name: 'updated-magazine.pdf', metadata: { revisionRequestId: 'round-state', expectedVersion: 0 } };
  await page.addInitScript(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key: `tinzel_draft_upload:${designer._id}:${order._id}`, saved });
  const returned = { ...order, status: 'revision_requested', revisionRequests: [{ _id: 'round-state', status: 'open', items: [{ _id: 'fix-state', text: 'Correct the heading' }] }] };
  await page.route('**/api/designer/orders/state-order', route => json(route, { order: returned, auditLogs: [] }));
  let cancellations = 0;
  await page.route('**/api/designer/orders/state-order/draft-uploads/ready-upload', route => { cancellations++; return json(route, { success: true }); });
  await open(page, '/staff/design/orders/state-order?reviewUpload=1&source=uploads');
  const review = page.getByRole('dialog', { name: 'Review corrections before submitting' });
  await expect(review).toBeVisible();
  await expect(page).toHaveURL(/state-order\?source=uploads$/);
  expect(await page.evaluate(() => Number.isInteger(history.state?.tinzelEntry))).toBe(true);
  await review.getByRole('button', { name: 'Cancel upload', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Cancel this upload?' });
  await confirmation.getByRole('button', { name: 'Keep upload', exact: true }).click();
  await expect(review).toBeVisible();
  expect(cancellations).toBe(0);
  await review.getByRole('button', { name: 'Cancel upload', exact: true }).click();
  await confirmation.getByRole('button', { name: 'Cancel upload', exact: true }).click();
  await expect(review).toHaveCount(0);
  expect(cancellations).toBe(1);
});

test('unsubmitted designer files and notes survive staying on the order', async ({ page }) => {
  await staff(page, designer);
  await page.route('**/api/designer/orders/state-order', route => json(route, { order, auditLogs: [] }));
  await page.route(url => url.pathname === '/api/designer/returns', route => json(route, { returns: [], summary: {} }));
  await open(page, '/staff/design/orders/state-order');
  await page.getByRole('button', { name: 'Upload new draft', exact: true }).click();
  const upload = page.getByRole('dialog', { name: 'Upload new draft', exact: true });
  await upload.getByLabel('Version summary').fill('Keep the selected file and this version note.');
  await upload.getByLabel('Magazine PDF · up to 500 MB').setInputFiles({ name: 'unfinished.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nselected') });
  await page.keyboard.press('Escape');
  await expect(upload).toHaveCount(0);
  await page.getByRole('button', { name: /^Returns(?:\s+\d+)?$/ }).click();
  const leave = page.getByRole('dialog', { name: 'Leave this order?' });
  await leave.getByRole('button', { name: 'Keep working', exact: true }).click();
  await expect(page).toHaveURL(/\/staff\/design\/orders\/state-order$/);
  await page.getByRole('button', { name: 'Upload new draft', exact: true }).click();
  await expect(upload.getByLabel('Version summary')).toHaveValue('Keep the selected file and this version note.');
  const fileInput = upload.getByLabel('Magazine PDF · up to 500 MB');
  const submit = upload.getByRole('button', { name: 'Send to manager review' });
  await expect(fileInput).toBeFocused();
  await expect(submit).toBeEnabled();
  await page.keyboard.press('Shift+Tab');
  await expect(submit).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(fileInput).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(upload).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Upload new draft', exact: true })).toBeFocused();
  await page.getByRole('button', { name: /^Returns(?:\s+\d+)?$/ }).click();
  await leave.getByRole('button', { name: 'Discard and leave', exact: true }).click();
  await expect(page).toHaveURL(/\/staff\/returns$/);
});
