import { test, expect } from '@playwright/test';

const json = (route, data) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
const designer = { _id: 'designer-1', name: 'Juma Designer', role: 'designer', isActive: true };
const fix = { _id: 'fix-1', text: 'Correct the anniversary date', pageReference: '4', status: 'open', designerResponse: '' };
const request = { _id: 'return-1', roundNumber: 1, draftVersionNumber: 1, source: 'client', status: 'open', requestedAt: '2026-10-18T10:00:00Z', items: [fix] };
const order = { _id: 'order-1', trackingId: 'TNZ-2026-0099', submissionId: 'SUB-2026-0099', clientName: 'Asha Client', clientWhatsApp: '0712000000', formTitle: 'Love Story', status: 'revision_requested', currentDraftVersion: 1, assignedDesigner: designer, submittedData: { story: 'Our story' }, submittedFields: [{ fieldId: 'story', label: 'Story', order: 1 }], uploadedPhotos: [], draftVersions: [], revisionRequests: [request], updatedAt: '2026-10-18T10:00:00Z' };
const onePagePdf = Buffer.from('JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHMgWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdPj4KZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNC9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjE5NQolJUVPRgo=', 'base64');

async function setup(page) {
  await page.addInitScript(() => localStorage.setItem('tinzel_staff_token', 'designer-test'));
  await page.route('**/api/staff/me', (route) => json(route, { user: designer }));
  await page.route((url) => url.pathname === '/api/designer/orders', (route) => json(route, { orders: [order] }));
  await page.route('**/api/designer/orders/order-1', (route) => json(route, { order, auditLogs: [{ _id: 'log-1', action: 'CLIENT_REVISION_REQUESTED', actor: { name: 'Asha Client' }, details: { feedback: 'Correct the date' }, createdAt: '2026-10-18T10:00:00Z' }] }));
  await page.route('**/api/designer/returns*', (route) => json(route, { returns: [{ orderId: order._id, trackingId: order.trackingId, clientName: order.clientName, ...request }], total: 1, page: 1, pageCount: 1 }));
  await page.route('**/api/designer/orders/order-1/returns/return-1/items/fix-1', (route) => json(route, { success: true }));
}

test('designer order uses its own URL, history, checklist and PDF-only top action', async ({ page }) => {
  await setup(page); await page.goto('/staff/design'); await page.getByRole('button', { name: 'English EN' }).click();
  await expect(page.getByRole('heading', { name: 'Design orders' })).toBeVisible();
  await page.getByRole('button', { name: 'Open TNZ-2026-0099' }).click();
  await expect(page).toHaveURL(/\/staff\/design\/orders\/order-1$/);
  await expect(page.getByRole('heading', { name: 'Submission history' })).toBeVisible();
  await expect(page.getByText('Correct the anniversary date')).toBeVisible();
  await page.reload(); await page.getByRole('button', { name: 'English EN' }).click(); await expect(page.getByRole('heading', { name: 'TNZ-2026-0099' })).toBeVisible();
  await page.getByRole('button', { name: 'Upload new draft' }).click();
  await expect(page.getByLabel('Magazine PDF')).toHaveAttribute('accept', 'application/pdf,.pdf');
  await expect(page.getByRole('button', { name: 'Send to manager review' })).toBeDisabled();
});

test('returns page is a separate responsive work list', async ({ page }) => {
  await setup(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/staff/returns'); await page.getByRole('button', { name: 'English EN' }).click();
  await expect(page.getByRole('heading', { name: 'Returns & fixes' })).toBeVisible();
  await expect(page.getByText('1/1 addressed')).toHaveCount(0);
  await page.getByRole('button', { name: /Open/ }).last().click();
  await expect(page).toHaveURL(/\/staff\/design\/orders\/order-1$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test('protected reader uses book view on desktop, single page on mobile, and no designer download', async ({ page }) => {
  await setup(page);
  const proof = { ...order, status: 'draft_manager_review', revisionRequests: [], draftVersions: [{ _id: 'draft-1', versionNumber: 1, uploadedAt: '2026-10-18T10:00:00Z', managerReview: { status: 'pending' }, clientReview: { status: 'pending' } }] };
  await page.route('**/api/designer/orders/order-1', (route) => json(route, { order: proof, auditLogs: [] }));
  await page.route('**/api/designer/orders/order-1/drafts/1/view', (route) => route.fulfill({ contentType: 'application/pdf', body: onePagePdf }));
  await page.goto('/staff/design/orders/order-1'); await page.getByRole('button', { name: 'English EN' }).click();
  await expect(page.getByText('Book view')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('Single page')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
