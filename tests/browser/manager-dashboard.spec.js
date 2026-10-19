import { test, expect } from '@playwright/test';

const json = (route, data) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
const manager = { _id: 'manager-1', name: 'Neema Manager', email: 'manager@tinzel.test', role: 'manager', isActive: true };
const baseOrder = {
  _id: 'order-1', trackingId: 'TNZ-2026-0042', submissionId: 'SUB-2026-0042', clientName: 'Asha Mushi',
  clientWhatsApp: '+255700000001', clientEmail: 'asha@example.test', formTitle: 'Anniversary Magazine',
  formId: { _id: 'form-1', title: 'Anniversary Magazine', price: 75000, currency: 'TZS', fields: [] },
  status: 'draft_manager_review', assignedDesigner: { _id: 'designer-1', name: 'Juma Designer' },
  currentDraftVersion: 2, photoCount: 12, uploadedPhotos: [], submittedData: { story: 'Our story' },
  submittedFields: [{ fieldId: 'story', label: 'Our story', order: 1 }],
  draftVersions: [{ _id: 'draft-2', versionNumber: 2, fileUrl: '/draft-v2.pdf', previewPages: [], designerNotes: 'Complete client changes', uploadedAt: '2026-10-15T09:00:00Z', managerReview: { status: 'pending' }, clientReview: { status: 'pending' } }],
  createdAt: '2026-10-10T09:00:00Z', updatedAt: '2026-10-15T09:00:00Z',
};
const orders = [
  baseOrder,
  { ...baseOrder, _id: 'order-2', trackingId: 'TNZ-2026-0043', clientName: 'Baraka John', status: 'printing_completed', currentDraftVersion: 1, updatedAt: '2026-10-17T09:00:00Z' },
  { ...baseOrder, _id: 'order-3', trackingId: 'TNZ-2026-0044', clientName: 'Zawadi Paul', status: 'on_hold', holdReason: 'Client clarification required', updatedAt: '2026-10-16T09:00:00Z' },
];

async function openManagerDashboard(page) {
  await page.addInitScript(() => localStorage.setItem('tinzel_staff_token', 'manager-dashboard-test'));
  await page.route('**/api/staff/me', (route) => json(route, { user: manager }));
  await page.route('**/api/manager/designers', (route) => json(route, { designers: [{ _id: 'designer-1', name: 'Juma Designer', currentActiveWorkload: 2, maxActiveWorkload: 5 }] }));
  await page.route('**/api/manager/settings', (route) => json(route, { printer: { configured: true, phone: '+255712000000' } }));
  await page.route((url) => url.pathname === '/api/manager/orders', (route) => {
    const pageNumber = Number(new URL(route.request().url()).searchParams.get('page') || 1);
    return json(route, {
      orders, total: 103, page: pageNumber, pageCount: 2,
      summary: { active: 3, payment: 0, draftReview: 1, printApproval: 0, dispatchReady: 1, blocked: 1 },
      statusCounts: { draft_manager_review: 1, printing_completed: 1, on_hold: 1 },
    });
  });
  await page.route('**/api/manager/orders/order-1', (route) => json(route, { order: baseOrder, auditLogs: [{ _id: 'log-1', action: 'DRAFT_UPLOADED', actor: { name: 'Juma Designer' }, createdAt: '2026-10-15T09:00:00Z' }] }));
  await page.goto('/');
  await page.getByRole('button', { name: 'English EN' }).click();
  await page.getByRole('button', { name: /Login/ }).click();
  await expect(page.getByText('Drafts to review')).toBeVisible();
}

test('manager gets an action-first dashboard and complete draft review context', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openManagerDashboard(page);
  await expect(page.getByText('Drafts to review')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Designer' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Review draft/ })).toHaveCount(0);
  await expect(page.getByText('TNZ-2026-0042', { exact: true })).toBeVisible();
  await page.getByText('TNZ-2026-0042', { exact: true }).click();
  await expect(page.getByText('Review the entire magazine before deciding.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review draft' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open complete draft' }).first()).toHaveAttribute('href', '/draft-v2.pdf');
  await expect(page.getByRole('button', { name: 'Forms', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Design', exact: true })).toHaveCount(0);
});

test('manager dashboard remains readable and actionable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openManagerDashboard(page);
  await expect(page.getByRole('button', { name: 'Open workspace menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await expect(page.getByLabel('Board stage')).toBeVisible();
  await page.getByLabel('Board stage').selectOption('draft');
  await expect(page.locator('.manager-board-column')).toHaveCount(8);
  await expect(page.locator('.manager-board-column:visible')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Open TNZ-2026-0042/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});

test('board uses compact stage rows and supports keyboard detail access', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openManagerDashboard(page);
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await expect(page.locator('.manager-board-column')).toHaveCount(8);
  await expect(page.locator('.manager-stage-row')).toHaveCount(3);
  const draftRow = page.getByRole('button', { name: /Open TNZ-2026-0042/ });
  await expect(draftRow).toContainText('TNZ-2026-0042');
  await expect(draftRow).toContainText('Asha Mushi');
  await expect(draftRow).not.toContainText('Juma Designer');
  await expect(draftRow).not.toContainText('Photos');
  await draftRow.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Review the entire magazine before deciding.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review draft' })).toBeVisible();
});

test('manager filters, search, refresh and pagination keep the server query contract', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openManagerDashboard(page);

  const stageRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/manager/orders' && new URL(request.url()).searchParams.get('status') === 'draft_manager_review');
  await page.getByRole('button', { name: /Drafts to review/ }).click();
  await stageRequest;

  const searchRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/manager/orders' && new URL(request.url()).searchParams.get('search') === 'Asha');
  await page.getByRole('textbox', { name: 'Search orders' }).fill('Asha');
  await page.getByRole('textbox', { name: 'Search orders' }).press('Enter');
  await searchRequest;

  const scopeRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/manager/orders' && new URL(request.url()).searchParams.get('scope') === 'all');
  await page.getByLabel('Filter order scope').selectOption('all');
  await scopeRequest;

  const refreshRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/manager/orders');
  await page.getByRole('button', { name: 'Refresh orders' }).click();
  await refreshRequest;

  const nextPageRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/manager/orders' && new URL(request.url()).searchParams.get('page') === '2');
  await page.getByRole('button', { name: 'Next page' }).click();
  await nextPageRequest;
  await expect(page.getByText('2 / 2')).toBeVisible();
});

test('admin workspace keeps navigation and user management concise', async ({ page }) => {
  const admin = { _id: 'admin-1', name: 'Amina Admin', email: 'admin@tinzel.test', role: 'admin', isActive: true };
  const staff = [
    admin,
    { _id: 'designer-1', name: 'Juma Designer', email: 'juma@tinzel.test', phone: '+255700000002', role: 'designer', isActive: true, currentActiveWorkload: 2, maxActiveWorkload: 5, isEligibleForAssignment: true },
  ];
  await page.addInitScript(() => localStorage.setItem('tinzel_staff_token', 'admin-dashboard-test'));
  await page.route('**/api/staff/me', (route) => json(route, { user: admin }));
  await page.route('**/api/manager/designers', (route) => json(route, { designers: [] }));
  await page.route('**/api/manager/settings', (route) => json(route, { printer: { configured: false } }));
  await page.route((url) => url.pathname === '/api/manager/orders', (route) => json(route, { orders: [], total: 0, page: 1, pageCount: 1, summary: {}, statusCounts: {} }));
  await page.route('**/api/admin/staff', (route) => json(route, { staff }));
  await page.route('**/api/admin/audit-logs', (route) => json(route, { logs: [] }));
  await page.route('**/api/admin/config', (route) => json(route, { simulatedNotifications: [] }));
  await page.goto('/');
  await page.getByRole('button', { name: 'English EN' }).click();
  await page.getByRole('button', { name: /Login/ }).click();
  await page.getByRole('button', { name: 'Users', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Users 2/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Messages 0/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Audit 0/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add User' })).toBeVisible();
  await expect(page.getByText('Create, view, edit, and delete')).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Workload' })).toBeVisible();
});
