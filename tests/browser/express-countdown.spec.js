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
