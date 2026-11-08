import { test, expect } from './fixtures.js';

test('dispatch loads the latest client location and pre-fills the confirmed address', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  const order = { _id: 'delivery-order', clientName: 'Delivery client', status: 'printing_completed', draftVersions: [], uploadedPhotos: [], submittedData: {},
    formId: { title: 'Magazine', fields: [] }, clientDeliveryDetails: { location: 'Initial client location' } };
  await page.route('**/api/staff/me', route => route.fulfill({ json: { user: { _id: 'delivery-manager', name: 'Delivery manager', role: 'manager', preferredLanguage: 'en' } } }));
  await page.route('**/api/manager/designers', route => route.fulfill({ json: { designers: [] } }));
  await page.route('**/api/manager/settings', route => route.fulfill({ json: { printer: { configured: false } } }));
  await page.route('**/api/manager/orders?**', route => route.fulfill({ json: { orders: [order], total: 1, page: 1, pageCount: 1, summary: {}, statusCounts: { printing_completed: 1 } } }));
  await page.route('**/api/manager/orders/delivery-order', route => route.fulfill({ json: { order, auditLogs: [] } }));
  await page.goto('/staff/post-design?orderId=delivery-order&tab=production');
  await expect(page.getByText('Initial client location', { exact: true })).toBeVisible();
  order.clientDeliveryDetails.location = 'Latest client location, Arusha';
  await page.getByRole('button', { name: 'Authorize dispatch', exact: true }).click();
  await expect(page.getByLabel('Confirmed delivery address')).toHaveValue('Latest client location, Arusha');
});
