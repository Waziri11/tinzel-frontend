import { test, expect, chooseEnglish } from './fixtures.js';

const designer = { _id: 'designer-clock', name: 'Designer', role: 'designer', preferredLanguage: 'en', isActive: true };
const order = { _id: 'express-clock', clientName: 'Express countdown check', formTitle: 'Magazine', isExpress: true, status: 'in_design', assignedDesigner: designer,
  expressStartedAt: '2026-11-08T18:00:00+03:00', expressDueAt: '2026-11-10T00:00:00+03:00',
  draftVersions: [], revisionRequests: [], uploadedPhotos: [], submittedFields: [] };
async function openClock(page, at, changes = {}) {
  await page.clock.install({ time: new Date(at) });
  await page.clock.pauseAt(new Date(at));
  await page.addInitScript(() => { localStorage.setItem('tinzel_staff_token', 'clock-test'); localStorage.setItem('tinzel_language', 'en'); });
  await page.route('**/api/staff/me', route => route.fulfill({ json: { user: designer } }));
  await page.route('**/api/designer/orders/express-clock', route => route.fulfill({ json: { order: { ...order, ...changes }, auditLogs: [] } }));
  await page.goto('/staff/design/orders/express-clock');
  await chooseEnglish(page);
  await expect(page.locator('.express-order')).toBeVisible();
  return page.locator('.express-order');
}

test('running Express countdown ticks every second and switches to overdue at the saved deadline', async ({ page }) => {
  const badge = await openClock(page, '2026-11-09T23:59:57+03:00');
  await expect(badge).toContainText('0h 00m 03s left');
  await page.clock.runFor(1000);
  await expect(badge).toContainText('0h 00m 02s left');
  await page.clock.runFor(1000);
  await expect(badge).toContainText('0h 00m 01s left');
  await page.clock.runFor(2000);
  await expect(badge).toContainText('Overdue 0h 00m 01s');
});

test('Sunday pause shows a moving resume countdown in both languages and resumes automatically at midnight', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const badge = await openClock(page, '2026-11-08T23:59:57+03:00');
  await expect(badge).toContainText('24h 00m 00s left');
  await expect(badge).toContainText('Paused on Sunday');
  await expect(badge).toContainText('Resumes in 0h 00m 03s · Monday 00:00 EAT');
  await page.clock.runFor(1000);
  await expect(badge).toContainText('Resumes in 0h 00m 02s');
  await page.getByRole('button', { name: 'SW', exact: true }).click();
  await expect(badge).toContainText('Imesimama Jumapili');
  await expect(badge).toContainText('Itaendelea baada ya 0h 00m 02s');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/private/tmp/tinzel-express-paused-mobile.png' });
  await page.clock.runFor(3000);
  await expect(badge).toContainText('23h 59m 59s zimebaki');
  await expect(badge).not.toContainText('Imesimama');
});

test('focus and reload catch up to elapsed time instead of restarting or leaving a stale countdown', async ({ page }) => {
  const badge = await openClock(page, '2026-11-09T01:00:00+03:00');
  await expect(badge).toContainText('23h 00m 00s left');
  await page.clock.setSystemTime(new Date('2026-11-09T02:30:10+03:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(badge).toContainText('21h 29m 50s left');
  await page.reload();
  await expect(page.locator('.express-order')).toContainText('21h 29m 50s left');
});

test('unpaid and completed Express orders do not show a running or paused countdown', async ({ page }) => {
  const badge = await openClock(page, '2026-11-08T12:00:00+03:00', { status: 'awaiting_payment', expressStartedAt: undefined, expressDueAt: undefined });
  await expect(badge).toContainText('Awaiting payment');
  await expect(badge).not.toContainText('Resumes');
  await page.route('**/api/designer/orders/express-clock', route => route.fulfill({ json: { order: { ...order, status: 'closed' }, auditLogs: [] } }));
  await page.reload();
  await expect(badge).toContainText('Complete');
  await expect(badge).not.toContainText('Resumes');
});

const standard = { isExpress: false, standardStartedAt: '2026-11-08T18:00:00+03:00', standardDueAt: '2026-11-12T00:00:00+03:00' };
test('standard shows three days, a live Sunday resume timer, and keeps its deadline after reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const badge = await openClock(page, '2026-11-08T23:59:58+03:00', standard);
  await expect(badge).toContainText('Standard');
  await expect(badge).toContainText('3d 0h 00m 00s left');
  await expect(badge).toContainText('Resumes in 0h 00m 02s');
  await page.getByRole('button', { name: 'SW', exact: true }).click();
  await expect(badge).toContainText('Kawaida');
  await expect(badge).toContainText('Siku 3 0h 00m 00s zimebaki');
  await page.clock.runFor(1000);
  await expect(badge).toContainText('Itaendelea baada ya 0h 00m 01s');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await badge.screenshot({ path: '/private/tmp/tinzel-standard-paused-mobile.png' });
  await page.clock.runFor(2000);
  await expect(badge).toContainText('Siku 2 23h 59m 59s zimebaki');
  await expect(badge).not.toContainText('Imesimama');
  await page.reload();
  await expect(badge).toContainText('2d 23h 59m 59s left');
});

test('standard pending, overdue and completed states are distinct', async ({ page }) => {
  const badge = await openClock(page, '2026-11-12T00:00:01+03:00', standard);
  await expect(badge).toContainText('Overdue 0d 0h 00m 01s');
  await page.route('**/api/designer/orders/express-clock', route => route.fulfill({ json: { order: { ...order, isExpress: false, status: 'awaiting_payment' }, auditLogs: [] } }));
  await page.reload();
  await expect(badge).toContainText('3 days · Awaiting payment');
  await expect(badge).not.toContainText('Due');
  await page.route('**/api/designer/orders/express-clock', route => route.fulfill({ json: { order: { ...order, ...standard, status: 'delivered' }, auditLogs: [] } }));
  await page.reload();
  await expect(badge).toContainText('Complete');
  await expect(badge).not.toContainText('Overdue');
});

test('customer tracking shows the standard countdown and catches up when returning to the tab', async ({ page }) => {
  const at = new Date('2026-11-09T00:00:00+03:00');
  await page.clock.install({ time: at }); await page.clock.pauseAt(at);
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await page.route('**/api/client/order', route => route.fulfill({ json: { order: { ...order, ...standard, clientName: 'Standard countdown check', clientPreferredLanguage: 'en' }, csrf: 'a'.repeat(48) } }));
  await page.goto('/track');
  const badge = page.locator('.express-order.is-standard');
  await expect(badge).toContainText('3d 0h 00m 00s left');
  await page.clock.runFor(1000);
  await expect(badge).toContainText('2d 23h 59m 59s left');
  await page.clock.setSystemTime(new Date('2026-11-09T02:00:05+03:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(badge).toContainText('2d 21h 59m 55s left');
});

test('manager board and order detail both show the standard clock', async ({ page }) => {
  const at = new Date('2026-11-09T00:00:00+03:00');
  await page.clock.install({ time: at }); await page.clock.pauseAt(at);
  await page.addInitScript(() => { localStorage.setItem('tinzel_staff_token', 'clock-test'); localStorage.setItem('tinzel_language', 'en'); });
  const row = { ...order, ...standard, clientName: 'Standard countdown check', updatedAt: at.toISOString() };
  await page.route('**/api/staff/me', route => route.fulfill({ json: { user: { ...designer, role: 'manager' } } }));
  await page.route('**/api/manager/designers', route => route.fulfill({ json: { designers: [] } }));
  await page.route('**/api/manager/settings', route => route.fulfill({ json: { printer: { configured: true } } }));
  await page.route(url => url.pathname === '/api/manager/orders', route => route.fulfill({ json: { orders: [row], total: 1, page: 1, pageCount: 1, summary: { active: 1 }, statusCounts: { in_design: 1 } } }));
  await page.route('**/api/manager/orders/express-clock', route => route.fulfill({ json: { order: row, auditLogs: [] } }));
  await page.goto('/staff/design-phase');
  await chooseEnglish(page);
  await expect(page.locator('.express-order.is-standard')).toContainText('3d 0h 00m 00s left');
  await page.getByRole('button', { name: /^Open Standard countdown check, waiting/ }).click();
  await expect(page.getByRole('dialog').locator('.express-order.is-standard')).toContainText('3d 0h 00m 00s left');
});
