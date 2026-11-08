import { test, expect } from './fixtures.js';

const designer = { _id: 'designer-1', name: 'Designer', role: 'designer', preferredLanguage: 'en' };
const initialOrder = { _id: 'order-1', clientName: 'Kanban customer', formTitle: 'Kanban edition', status: 'in_design',
  assignedDesigner: designer, currentDraftVersion: 0, revisionRequests: [], draftVersions: [], uploadedPhotos: [],
  submittedData: {}, submittedFields: [], createdAt: '2026-11-01T12:00:00Z', updatedAt: '2026-11-08T12:00:00Z' };
async function signIn(page, role = 'designer') {
  await page.addInitScript(() => { localStorage.setItem('tinzel_language', 'en'); localStorage.setItem('tinzel_staff_token', 'kanban-test'); });
  await page.route('**/api/staff/me', route => route.fulfill({ json: { user: { ...designer, role } } }));
}

test('designer board refreshes external moves while open, including a shrinking last page', async ({ page }) => {
  await signIn(page);
  await page.clock.install();
  let moved = false;
  const extras = Array.from({ length: 10 }, (_, i) => ({ ...initialOrder, _id: `extra-${i}`, clientName: `Other customer ${i}` }));
  await page.route(url => url.pathname === '/api/designer/orders', route => {
    const params = new URL(route.request().url()).searchParams;
    const column = params.get('column'), currentPage = Number(params.get('page'));
    const rows = column === 'new' ? [...extras, ...(moved ? [] : [initialOrder])] : column === 'client' && moved ? [{ ...initialOrder, status: 'revision_requested' }] : [];
    return route.fulfill({ json: { orders: rows.slice((currentPage - 1) * 10, currentPage * 10), total: rows.length, pageCount: Math.max(1, Math.ceil(rows.length / 10)) } });
  });
  await page.goto('/staff/design');
  const fresh = page.getByRole('region', { name: 'New design orders', exact: true });
  const client = page.getByRole('region', { name: 'Returned by client', exact: true });
  await fresh.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(fresh.getByRole('button', { name: 'Open Kanban customer', exact: true })).toBeVisible();
  moved = true;
  await page.clock.fastForward(31000);
  await expect(client.getByRole('button', { name: 'Open Kanban customer', exact: true })).toBeVisible();
  await expect(fresh.locator('.designer-kanban-card')).toHaveCount(10);
  await expect(fresh.getByRole('button', { name: 'Open Kanban customer', exact: true })).toHaveCount(0);
  await expect(fresh.locator('.designer-kanban-pagination')).toHaveCount(0);
});

test('designer order updates after a manager return without discarding an unfinished upload', async ({ page }) => {
  await signIn(page);
  await page.clock.install();
  let order = { ...initialOrder, status: 'draft_manager_review' }, reads = 0;
  await page.route('**/api/designer/orders/order-1', route => { reads++; return route.fulfill({ json: { order, auditLogs: [] } }); });
  await page.goto('/staff/design/orders/order-1');
  await expect(page.getByRole('button', { name: 'Upload new draft', exact: true })).toBeDisabled();
  order = { ...order, status: 'revision_requested' };
  await page.clock.fastForward(31000);
  await expect(page.getByRole('button', { name: 'Upload new draft', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Upload new draft', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const notes = dialog.locator('textarea');
  await notes.fill('Unsent designer notes');
  const readsBefore = reads;
  await page.clock.fastForward(31000);
  await expect(notes).toHaveValue('Unsent designer notes');
  expect(reads).toBe(readsBefore);
});

test('manager hold and resume refresh both the board and the open order actions', async ({ page }) => {
  await signIn(page, 'manager');
  await page.clock.install();
  let order = { ...initialOrder };
  await page.route('**/api/manager/designers', route => route.fulfill({ json: { designers: [designer] } }));
  await page.route('**/api/manager/settings', route => route.fulfill({ json: { printer: { configured: false } } }));
  await page.route(url => url.pathname === '/api/manager/orders', route => route.fulfill({ json: {
    orders: [order], total: 1, page: 1, pageCount: 1, summary: {}, statusCounts: { [order.status]: 1 },
  } }));
  await page.route('**/api/manager/orders/order-1', route => route.fulfill({ json: { order, auditLogs: [] } }));
  await page.route('**/api/manager/orders/order-1/hold', route => {
    order = { ...order, status: route.request().postDataJSON().action === 'hold' ? 'on_hold' : 'in_design' };
    return route.fulfill({ json: { success: true, order, message: 'Order updated' } });
  });
  await page.goto('/staff/design-phase');
  await page.getByRole('button', { name: /Open Kanban customer/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Kanban customer', exact: true });
  await drawer.getByRole('button', { name: 'Place on hold', exact: true }).click();
  const hold = page.getByRole('dialog', { name: 'Place order on hold', exact: true });
  await hold.getByLabel('Reason for hold').fill('Waiting for details');
  await hold.getByRole('button', { name: 'Place order on hold', exact: true }).click();
  await expect(drawer.getByRole('button', { name: 'Resume order', exact: true })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Place on hold', exact: true })).toHaveCount(0);
  await drawer.getByRole('button', { name: 'Resume order', exact: true }).click();
  const resume = page.getByRole('dialog', { name: 'Resume this order', exact: true });
  await resume.getByRole('button', { name: 'Resume this order', exact: true }).click();
  await expect(drawer.getByRole('button', { name: 'Place on hold', exact: true })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Resume order', exact: true })).toHaveCount(0);
  await expect(drawer.locator('.manager-order-detail__hero .manager-status')).toHaveText('In design');
  order = { ...order, status: 'on_hold' };
  await page.clock.fastForward(31000);
  await expect(drawer.getByRole('button', { name: 'Resume order', exact: true })).toBeVisible();
});
