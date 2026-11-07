import { test, expect, chooseEnglish } from './fixtures.js';

const json = (route, data) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
const manager = { _id: 'manager-1', name: 'Neema Manager', email: 'manager@tinzel.test', role: 'manager', preferredLanguage: 'en', isActive: true };
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
    expect(new URL(route.request().url()).searchParams.get('scope')).toBe('all');
    const pageNumber = Number(new URL(route.request().url()).searchParams.get('page') || 1);
    return json(route, {
      orders, total: 103, page: pageNumber, pageCount: 2,
      summary: { active: 3, payment: 0, draftReview: 1, printApproval: 0, dispatchReady: 1, blocked: 1 },
      statusCounts: { draft_manager_review: 1, printing_completed: 1, on_hold: 1 },
    });
  });
  await page.route('**/api/manager/orders/order-1', (route) => json(route, { order: baseOrder, auditLogs: [{ _id: 'log-1', action: 'DRAFT_UPLOADED', actor: { name: 'Juma Designer' }, createdAt: '2026-10-15T09:00:00Z' }] }));
  await page.route(/\/api\/proofs\/staff\/order-1\/2(?:\/prepare)?$/, route => json(route, {state:'ready',pageCount:1,pages:[{page:1}],annotations:[],canComment:true}));
  await page.route('**/api/proofs/staff/order-1/2/pages/1*', route => new URL(route.request().url()).searchParams.has('text') ? json(route,{width:600,height:800,text:[]}) : route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/></svg>'}));
  await page.goto('/staff/design-phase');
  await chooseEnglish(page);
  await expect(page.getByText('Drafts to review')).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/TNZ-|SUB-/);
}

test('manager gets an action-first dashboard and complete draft review context', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openManagerDashboard(page);
  await expect(page.getByText('Drafts to review')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Designer' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Review magazine', exact:true }).first()).toBeVisible();
  await expect(page.getByText('Asha Mushi', { exact: true })).toBeVisible();
  await page.getByText('Asha Mushi', { exact: true }).click();
  await expect(page.getByText('Review the entire magazine before deciding.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review magazine', exact:true }).last()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open complete draft' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Drafts (1)' })).toBeVisible();
  await page.getByRole('tab', { name: 'Drafts (1)' }).click();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);
  await expect(page.getByAltText('Magazine page 1')).toHaveCount(0);
  await expect(page.getByRole('button', {name:'Approve and release to client',exact:true})).toHaveCount(0);
  await expect(page.getByAltText('Magazine cover, version 2')).toBeVisible();
  await page.screenshot({path:'test-results/magazine-draft-card.png',fullPage:true});
  await page.getByRole('button', {name:'Review magazine version 2',exact:true}).click();
  await expect(page).toHaveURL(/staff\/review\//);
  await expect(page.getByAltText('Magazine page 1')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Forms', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Design', exact: true })).toHaveCount(0);
});

test('manager returns a magazine with general corrections and the reviewed version', async ({ page }) => {
  await openManagerDashboard(page);
  let submitted;
  await page.route('**/api/manager/orders/order-1/review-draft', async (route) => { submitted = route.request().postDataJSON(); return json(route, { message: 'Returned' }); });
  await page.getByRole('button',{name:'Review magazine',exact:true}).first().click();
  await expect(page.getByAltText('Magazine page 1')).toBeVisible();
  await page.getByLabel('General notes',{exact:true}).fill('Correct the anniversary date and replace the cover photo.');
  await page.getByRole('button',{name:'Return to designer',exact:true}).click();
  await page.getByRole('dialog',{name:'Confirm return',exact:true}).getByRole('button',{name:'Return to designer',exact:true}).click();
  await expect.poll(() => submitted).toBeTruthy();
  expect(submitted.expectedVersion).toBe(2);
  expect(submitted.action).toBe('return_to_designer');
  expect(submitted.feedback).toBe('Correct the anniversary date and replace the cover photo.');
});

test('manager dashboard remains readable and actionable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openManagerDashboard(page);
  await expect(page.getByRole('button', { name: 'Open workspace menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Kanban Board', exact: true }).click();
  await expect(page.getByLabel('Board stage')).toBeVisible();
  await expect(page.getByLabel('Filter by stage', { exact: true })).toBeHidden();
  await page.getByLabel('Board stage').selectOption('draft_manager_review');
  await expect(page.locator('.manager-board-column')).toHaveCount(6);
  await expect(page.locator('.manager-board-column:visible')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Open Asha Mushi/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});

test('board uses compact stage rows and supports keyboard detail access', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openManagerDashboard(page);
  await page.getByRole('button', { name: 'Kanban Board', exact: true }).click();
  await expect(page.locator('.manager-board-column')).toHaveCount(6);
  await expect(page.locator('.manager-stage-row')).toHaveCount(2);
  const draftRow = page.getByRole('button', { name: /Open Asha Mushi/ });
  await expect(draftRow).toContainText('Asha Mushi');
  await expect(draftRow).toContainText('Asha Mushi');
  await expect(draftRow).toContainText('Juma Designer');
  await expect(draftRow).not.toContainText('Photos');
  await draftRow.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Review the entire magazine before deciding.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review magazine' })).toBeVisible();
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

  await expect(page.getByLabel('Filter order scope')).toHaveCount(0);

  const refreshRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/manager/orders');
  await page.getByRole('button', { name: 'Refresh orders' }).click();
  expect(new URL((await refreshRequest).url()).searchParams.get('scope')).toBe('all');

  const nextPageRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/manager/orders' && new URL(request.url()).searchParams.get('page') === '2');
  await page.getByRole('button', { name: 'Next page' }).click();
  await nextPageRequest;
  await expect(page.getByText('2 / 2')).toBeVisible();
});

test('admin workspace keeps navigation and user management concise', async ({ page }) => {
  const admin = { _id: 'admin-1', name: 'Amina Admin', email: 'admin@tinzel.test', role: 'admin', preferredLanguage:'en', isActive: true };
  const staff = [
    admin,
    { _id: 'designer-1', name: 'Juma Designer', email: 'juma@tinzel.test', phone: '+255700000002', role: 'designer', preferredLanguage: 'en', isActive: true, currentActiveWorkload: 2, maxActiveWorkload: 5, isEligibleForAssignment: true },
  ];
  await page.addInitScript(() => localStorage.setItem('tinzel_staff_token', 'admin-dashboard-test'));
  await page.route('**/api/staff/me', (route) => json(route, { user: admin }));
  await page.route('**/api/manager/designers', (route) => json(route, { designers: [] }));
  await page.route('**/api/manager/settings', (route) => json(route, { printer: { configured: false } }));
  await page.route((url) => url.pathname === '/api/manager/orders', (route) => json(route, { orders: [], total: 0, page: 1, pageCount: 1, summary: {}, statusCounts: {} }));
  await page.route('**/api/admin/staff', (route) => json(route, { staff }));
  await page.route('**/api/notifications/diagnostics',route=>json(route,{diagnostics:{}}));
  await page.route('**/api/admin/audit-logs', (route) => json(route, { logs: [] }));
  await page.route('**/api/admin/config', (route) => json(route, { simulatedNotifications: [] }));
  await page.goto('/staff/users');
  await chooseEnglish(page);
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Users 2/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Messages 0/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Audit 0/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add User' })).toBeVisible();
  await expect(page.getByText('Create, view, edit, and delete')).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Workload' })).toBeVisible();
});

test('assignment conflicts retain instructions and require checking the saved order',async({page})=>{
 await openManagerDashboard(page);const assigned={...baseOrder,status:'assigned'};
 await page.route('**/api/manager/orders/order-1',route=>json(route,{order:assigned,auditLogs:[]}));
 await page.route('**/api/manager/orders/order-1/reassign',route=>route.fulfill({status:409,json:{message:'Designer capacity changed. Choose another designer.'}}));
 await page.getByText('Asha Mushi',{exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Reassign',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Assign designer'});
 await dialog.getByLabel('Reason for assignment').fill('Preserve this instruction after a conflict.');await dialog.getByRole('button',{name:'Assign designer',exact:true}).click();
 await expect(dialog.getByRole('alert')).toContainText('capacity');await expect(dialog.getByLabel('Reason for assignment')).toHaveValue('Preserve this instruction after a conflict.');await expect(dialog.getByRole('button',{name:'Assign designer',exact:true})).toBeDisabled();await dialog.getByRole('button',{name:'Check saved order'}).click();await expect(dialog).toHaveCount(0);
});

test('unconfigured printing remains blocked in the manager action dialog',async({page})=>{
 await openManagerDashboard(page);
 await page.route('**/api/manager/settings',route=>json(route,{printer:{configured:false}}));
 await page.route('**/api/manager/orders/order-1',route=>json(route,{order:{...baseOrder,status:'print_manager_review'},auditLogs:[]}));
 await page.reload();await page.getByText('Asha Mushi',{exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Authorize printing',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Authorize printing'});await expect(dialog.getByText('No verified printer is configured. Ask an administrator to configure it first.')).toBeVisible();await expect(dialog.getByRole('button',{name:'Authorize printing',exact:true})).toBeDisabled();
});

test('every phase keeps four summary cards in two mobile rows', async ({ page }) => {
  await openManagerDashboard(page);
  for (const path of ['/staff/pre-design', '/staff/design-phase', '/staff/post-design']) {
    await page.goto(path);
    const cards = page.locator('.manager-summary-card');
    await expect(cards).toHaveCount(4);
    for (const width of [320, 390, 600, 767]) {
      await page.setViewportSize({ width, height: 844 });
      // Ant Design's breakpoint listener commits the mobile shell after the resize event.
      await expect(page.getByRole('button', { name: 'Open workspace menu' })).toBeVisible();
      const boxes = await cards.evaluateAll(nodes => nodes.map(node => {
        const { x, y, width, right } = node.getBoundingClientRect();
        return { x, y, width, right, scroll: node.scrollWidth, client: node.clientWidth };
      }));
      expect(boxes[0].y).toBe(boxes[1].y);
      expect(boxes[2].y).toBe(boxes[3].y);
      expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
      for (const box of boxes) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(width);
        expect(box.width).toBeCloseTo(boxes[0].width, 0);
        expect(box.scroll).toBeLessThanOrEqual(box.client + 1);
      }
    }
  }
});

test('refresh keeps existing orders visible and uses flutter instead of page skeletons', async ({ page }) => {
  await openManagerDashboard(page);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(url => url.pathname === '/api/manager/orders', async route => {
    await gate;
    await json(route, { orders, total: 3, pageCount: 1, summary: {}, statusCounts: {} });
  });
  try {
    await page.getByRole('button', { name: 'Refresh orders', exact: true }).click();
    await expect(page.getByText('Asha Mushi', { exact: true })).toBeVisible();
    await expect(page.locator('.page-skeleton')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Refresh orders', exact: true }).locator('.soft-flutter')).toHaveCount(1);
  } finally { release(); }
  await expect(page.getByRole('button', { name: 'Refresh orders', exact: true })).toBeEnabled();
});

test('pre-design identifies submissions by name in lists, board, details and payment dialog', async ({ page }) => {
  await openManagerDashboard(page);
  const submission = { ...baseOrder, trackingId: '', submissionId: 'SUB-2026-6AEF293E66CFE393BBD48910', status: 'awaiting_payment', draftVersions: [] };
  await page.route((url) => url.pathname === '/api/manager/orders', route => json(route, {
    orders: [submission], total: 1, page: 1, pageCount: 1,
    summary: { active: 1, payment: 1 }, statusCounts: { awaiting_payment: 1 },
  }));
  await page.route('**/api/manager/orders/order-1', route => json(route, { order: submission, auditLogs: [] }));
  await page.goto('/staff/pre-design');
  await expect(page.getByText('Asha Mushi', { exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('SUB-');
  await expect(page.getByPlaceholder('Search by client name')).toBeVisible();
  await page.getByRole('button', { name: 'Kanban Board', exact: true }).click();
  await expect(page.getByText('Asha Mushi', { exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('SUB-');
  await page.getByRole('button', { name: /Priority Queue/ }).click();
  await page.getByText('Asha Mushi', { exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('SUB-');
  await page.getByRole('dialog').getByRole('button', { name: 'Verify payment', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Verify Lipa Namba payment' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('SUB-');
});
