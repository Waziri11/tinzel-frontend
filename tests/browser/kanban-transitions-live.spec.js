import { test, expect } from '@playwright/test';
import { securityLogin } from './security-login.js';
import { proofPdf } from '../../../tinzel-backend/tests/fixtures/proofPdf.js';

test('real designer and manager updates move the visible Kanban card through corrections and release', async ({ page, request, baseURL }) => {
  await request.post('http://127.0.0.1:5078/__test__/kanban-fixtures');
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await securityLogin(page.request, 'designer');
  await securityLogin(request, 'manager');
  const designerHeaders = { Origin: new URL(baseURL).origin, 'X-CSRF-Token': (await (await page.request.get('/api/csrf/staff')).json()).csrf };
  const managerHeaders = { Origin: new URL(baseURL).origin, 'X-CSRF-Token': (await (await request.get('/api/csrf/staff')).json()).csrf };
  const list = await (await page.request.get('/api/designer/orders?search=TNZ-BOARD-NEW-00')).json();
  const order = list.orders[0];
  expect(order).toBeTruthy();
  const id = order._id;
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('/staff/design');
  await page.getByRole('searchbox', { name: 'Search orders' }).fill('TNZ-BOARD-NEW-00');
  const fresh = page.getByRole('region', { name: 'New design orders', exact: true });
  const returned = page.getByRole('region', { name: 'Returned by managers', exact: true });
  const card = region => region.getByRole('button', { name: 'Open TNZ-BOARD-NEW-00', exact: true });
  await expect(card(fresh)).toBeVisible();
  const post = async (suffix, data) => {
    const result = await request.post(`/api/manager/orders/${id}/${suffix}`, { headers: managerHeaders, data });
    expect(result.ok(), await result.text()).toBeTruthy();
  };
  const upload = async (expectedVersion, revisionRequestId) => {
    const result = await page.request.post(`/api/designer/orders/${id}/upload-draft`, {
      headers: designerHeaders,
      multipart: { draftFile: { name: 'kanban.pdf', mimeType: 'application/pdf', buffer: proofPdf(1) },
        expectedVersion: String(expectedVersion), ...(revisionRequestId ? { revisionRequestId, verifyAll: 'true' } : {}) },
    });
    expect(result.ok(), await result.text()).toBeTruthy();
  };
  await upload(0);
  await post('review-draft', { action: 'return_to_designer', expectedVersion: 1, feedback: 'Correct the date' });
  await page.clock.fastForward(31000);
  await expect(card(returned)).toBeVisible();
  await expect(card(fresh)).toHaveCount(0);
  const started = await page.request.post(`/api/designer/orders/${id}/start-design`, { headers: designerHeaders });
  expect(started.ok()).toBeTruthy();
  await page.clock.fastForward(31000);
  await expect(card(returned)).toContainText('in design');
  await post('hold', { action: 'hold', reason: 'Checking the date' });
  await page.clock.fastForward(31000);
  await expect(card(returned)).toContainText('on hold');
  await post('hold', { action: 'resume' });
  const detail = await (await page.request.get(`/api/designer/orders/${id}`)).json();
  const revision = detail.order.revisionRequests.at(-1);
  for (const item of revision.items) {
    const result = await page.request.patch(`/api/designer/orders/${id}/returns/${revision._id}/items/${item._id}`, {
      headers: designerHeaders, data: { response: 'Date corrected' },
    });
    expect(result.ok()).toBeTruthy();
  }
  await upload(1, revision._id);
  await page.clock.fastForward(31000);
  await expect(card(returned)).toContainText('draft manager review');
  await post('review-draft', { action: 'release_to_client', expectedVersion: 2 });
  await page.clock.fastForward(31000);
  await expect(card(fresh)).toContainText('client review');
  await expect(card(returned)).toHaveCount(0);
  expect(errors).toEqual([]);
});
