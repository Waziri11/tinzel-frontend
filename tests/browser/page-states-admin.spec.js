import { test, expect } from '@playwright/test';

const user = { _id: 'admin-state-fixture', name: 'State Reviewer', role: 'admin', preferredLanguage: 'en', email: 'review@example.test', mustChangePassword: false };
async function prepare(page, language = 'en') {
  await page.addInitScript(language => localStorage.setItem('tinzel_language', language), language);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const json = path === '/api/staff/me' ? { user: { ...user, preferredLanguage: language } }
      : path === '/api/admin/providers' ? { providers: [] }
      : path === '/api/admin/config' ? { configs: [] }
      : path === '/api/notifications/settings' ? { settings: { channels: { in_system: true, email: true, sms: true }, smsSenderId: 'TINZELGIFTS', triggers: {}, catalog: [] } }
      : path === '/api/staff/security' ? { sessions: [], devices: [], events: [] }
      : path.includes('csrf') ? { csrf: 'a'.repeat(48) }
      : { notifications: [], unreadCount: 0, staff: [], logs: [], forms: [] };
    await route.fulfill({ json });
  });
}

for (const language of ['en', 'sw']) {
  test(`forms load failure stays distinct from empty and retry recovers in ${language}`, async ({ page }, testInfo) => {
    await prepare(page, language);
    if (language === 'sw') await page.setViewportSize({ width: 390, height: 844 });
    let failed = true;
    await page.route('**/api/admin/forms', route => route.fulfill(failed ? { status: 503, json: { message: 'Temporarily unavailable' } } : { json: { forms: [] } }));
    await page.goto('/staff/forms');
    const error = page.locator('.tinzel-state.is-error').filter({ hasText: language === 'en' ? 'Editions could not be loaded' : 'Matoleo hayakuweza kupakiwa' });
    await expect(error).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('forms-failure-' + language + '.png'), fullPage: true });
    await expect(page.getByText('No Magazine Editions Created Yet', { exact: true })).toHaveCount(0);
    failed = false;
    await error.getByRole('button').click();
    await expect(error).toHaveCount(0);
    await expect(page.locator('.edition-admin')).toContainText(language === 'en' ? 'Create First Magazine Edition' : /toleo|jarida/i);
  });
}

test('unknown trigger settings cannot be saved and a local retry enables the editor', async ({ page }) => {
  await prepare(page);
  let failed = true;
  let writes = 0;
  await page.route('**/api/notifications/settings', route => {
    if (route.request().method() !== 'GET') writes++;
    return route.fulfill(failed ? { status: 503, json: { message: 'Settings unavailable' } } : { json: { settings: { channels: { in_system: true, email: true, sms: true }, smsSenderId: 'TINZELGIFTS', triggers: {}, catalog: [] } } });
  });
  await page.goto('/staff/notifications');
  await page.getByRole('button', { name: /Trigger Settings|Triggers/i }).click();
  const error = page.locator('.tinzel-state.is-error').filter({ hasText: 'Trigger settings unavailable' });
  await expect(error).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save Trigger Settings' })).toHaveCount(0);
  expect(writes).toBe(0);
  failed = false;
  await error.getByRole('button').click();
  await expect(page.getByRole('button', { name: 'Save Trigger Settings' })).toBeEnabled();
});

test('printer language load failure blocks the default until retry succeeds', async ({ page }) => {
  await prepare(page);
  let failed = true;
  await page.route('**/api/admin/config', route => route.fulfill(failed ? { status: 503, json: { message: 'Unavailable' } } : { json: { configs: [{ key: 'printer_preferred_language', value: 'en' }] } }));
  await page.goto('/staff/notifications');
  await page.getByRole('button', { name: /Trigger Settings|Triggers/i }).click();
  const error = page.locator('.tinzel-state.is-error').filter({ hasText: 'Printer language unavailable' });
  await expect(error).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save printer language' })).toHaveCount(0);
  failed = false;
  await error.getByRole('button').click();
  await expect(page.getByLabel('Printer notification language', { exact: true })).toHaveValue('en');
});

test('audit failure has its own retry and cannot masquerade as no activity', async ({ page }) => {
  await prepare(page);
  let failed = true;
  let historyReads = 0;
  await page.route('**/api/notifications/history**', route => { historyReads++; return route.fulfill({ json: { notifications: [], unreadCount: 0 } }); });
  await page.route('**/api/admin/audit-logs', route => route.fulfill(failed ? { status: 503, json: { message: 'Audit unavailable' } } : { json: { logs: [] } }));
  await page.goto('/staff/system?category=diagnostics');
  await page.getByRole('button', { name: /Audit/i }).click();
  const error = page.locator('.tinzel-state.is-error').filter({ hasText: 'This section could not be refreshed' });
  await expect(error).toBeVisible();
  await expect(page.getByText('No audit activity yet', { exact: true })).toHaveCount(0);
  const readsBefore = historyReads;
  failed = false;
  await error.getByRole('button').click();
  await expect(page.getByText('No audit activity yet', { exact: true })).toBeVisible();
  expect(historyReads).toBe(readsBefore);
});

test('system retries only the failed card and retains healthy measurements', async ({ page }) => {
  await prepare(page);
  let failed = true;
  let runtimeReads = 0;
  await page.route('**/api/system/summary/*', route => {
    const section = route.request().url().split('/').pop();
    if (section === 'runtime') runtimeReads++;
    if (section === 'storage' && failed) return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
    return route.fulfill({ json: { measuredAt: '2026-11-08T08:00:00Z', processMemoryBytes: 1048576, heapUsedBytes: 1048576, heapAllocatedBytes: 2097152, uptimeSeconds: 120, database: 'connected', databaseDataBytes: 1048576, sms: { configured: false }, email: { configured: false }, whatsapp: { configured: false } } });
  });
  await page.goto('/staff/system?category=status');
  const error = page.locator('.tinzel-state.is-error').filter({ hasText: 'Measurement unavailable' });
  await expect(error).toBeVisible();
  await expect(page.getByText('2 min', { exact: true })).toBeVisible();
  const readsBefore = runtimeReads;
  failed = false;
  await error.getByRole('button').click();
  await expect(error).toHaveCount(0);
  expect(runtimeReads).toBe(readsBefore);
});


test('users no-match state clears filters and failed row changes keep their retry local', async ({ page }) => {
  await prepare(page);
  let failed = true;
  const member = { _id: 'designer-fixture', name: 'Designer Example', email: 'designer@example.test', role: 'designer', isActive: true, isEligibleForAssignment: true, maxActiveWorkload: 5 };
  await page.route('**/api/admin/staff', route => route.fulfill({ json: { staff: [member] } }));
  await page.route('**/api/admin/staff/designer-fixture', route => route.fulfill(failed ? { status: 503, json: { message: 'Not saved' } } : { json: { user: { ...member, isEligibleForAssignment: false } } }));
  await page.goto('/staff/users');
  await page.getByLabel('Search users', { exact: true }).fill('missing person');
  await expect(page.getByText('No staff match these filters', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: 'Designer Example' });
  await expect(row).toBeVisible();
  await row.getByRole('checkbox').click();
  await expect(row.locator('.tinzel-state.is-error')).toBeVisible();
  await expect(row.getByRole('checkbox')).toBeChecked();
  failed = false;
  await row.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(row.getByRole('checkbox')).not.toBeChecked();
  await expect(row.getByText('Saved', { exact: true })).toBeVisible();
});

test('payment settings load failure blocks defaults and failed save preserves the edited option', async ({ page }) => {
  await prepare(page);
  let failedLoad = true;
  const options = [{ id: 'option-fixture', type: 'till', name: 'Original provider', number: 'TEST-ONLY', accountName: 'Fixture', instructions: 'Fixture instructions', enabled: true }];
  await page.route('**/api/admin/config', route => route.fulfill(route.request().method() === 'PUT' || failedLoad ? { status: 503, json: { message: 'Unavailable' } } : { json: { configs: [{ key: 'payment_options', value: options }] } }));
  await page.goto('/staff/system?category=payments');
  const error = page.locator('.tinzel-state.is-error').filter({ hasText: 'Settings could not be loaded' });
  await expect(error).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add payment option', exact: true })).toHaveCount(0);
  failedLoad = false;
  await error.getByRole('button').click();
  const provider = page.getByRole('group', { name: 'Payment option 1', exact: true }).getByLabel('Provider / bank name', { exact: true });
  await provider.fill('Changed provider');
  await page.getByRole('button', { name: 'Save payment options', exact: true }).click();
  await expect(page.locator('.system-settings-editor .tinzel-state.is-error')).toBeVisible();
  await expect(provider).toHaveValue('Changed provider');
  await expect(page.getByText('Unsaved payment changes', { exact: true })).toBeVisible();
});
