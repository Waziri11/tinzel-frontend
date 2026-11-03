import { test, expect } from './fixtures.js';
const manager = {
  id: 'manager-workspace',
  name: 'Test Manager',
  email: 'manager@example.test',
  phone: '0712000001',
  role: 'manager',
  preferredLanguage: 'en',
};
const measuredAt = '2026-11-01T18:00:00Z';
async function prepare(page, user = manager) {
  await page.addInitScript(() => {
    localStorage.setItem('tinzel_language', 'en');
    localStorage.setItem('tinzel_staff_token', 'workspace-test');
  });
  await page.route('**/api/staff/me', (route) =>
    route.fulfill({ json: { user } }),
  );
  await page.route('**/api/system/summary/runtime', (route) =>
    route.fulfill({
      json: {
        measuredAt,
        processMemoryBytes: 10485760,
        heapUsedBytes: 100,
        heapAllocatedBytes: 200,
        hostingRamAvailableBytes: null,
        uptimeSeconds: 60,
        database: 'connected',
      },
    }),
  );
  await page.route('**/api/system/summary/storage', (route) =>
    route.fulfill({
      status: 503,
      json: { message: 'Measurement unavailable' },
    }),
  );
  await page.route('**/api/system/summary/messaging', (route) =>
    route.fulfill({
      json: {
        measuredAt,
        sms: { configured: true, connected: true, remaining: 123 },
        email: { configured: true },
        whatsapp: { configured: false },
      },
    }),
  );
}
for (const width of [320, 390, 768, 1440])
  test(`manager System stays read-only with partial failures at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await prepare(page);
    await page.goto('/staff/system');
    await expect(
      page.getByText('Application memory used', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('123', { exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(
      'Measurement unavailable',
    );
    await expect(
      page.getByRole('button', { name: 'EN', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Configuration', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Client site', exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
for (const width of [390, 1440])
  test(`profile menu edits only self-service details and supports dismissal at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await prepare(page);
    let saved;
    await page.route('**/api/staff/profile', (route) => {
      saved = route.request().postDataJSON();
      return route.fulfill({ json: { user: { ...manager, ...saved } } });
    });
    await page.goto('/staff/system');
    await expect(
      page.getByText('Application memory used', { exact: true }),
    ).toBeVisible();
    if (width < 992)
      await page.getByRole('button', { name: 'Open workspace menu' }).click();
    await page.getByRole('button', { name: 'Open profile menu' }).click();
    await page
      .getByRole('menuitem', { name: 'My profile', exact: true })
      .click();
    const dialog = page.getByRole('dialog', {
      name: 'My profile',
      exact: true,
    });
    await expect(dialog.getByLabel('Email', { exact: true })).toHaveAttribute(
      'readonly',
      '',
    );
    await dialog.getByLabel('Name', { exact: true }).fill('Updated manager');
    await dialog.getByLabel('Phone', { exact: true }).fill('0712000022');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(saved).toEqual({ name: 'Updated manager', phone: '0712000022' });
    if (width < 992)
      await page.getByRole('button', { name: 'Open workspace menu' }).click();
    await page.getByRole('button', { name: 'Open profile menu' }).click();
    await expect(
      page.getByRole('menuitem', { name: 'Change password' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('menuitem', { name: 'Change password' }),
    ).toBeHidden();
  });
test('manager Users exposes designer controls without privileged roles or deletion', async ({
  page,
}) => {
  await prepare(page);
  await page.route('**/api/manager/staff', (route) =>
    route.fulfill({
      json: {
        staff: [
          {
            _id: 'designer-1',
            name: 'Test designer',
            email: 'designer@example.test',
            phone: '0712000002',
            role: 'designer',
            isActive: true,
            currentActiveWorkload: 0,
            maxActiveWorkload: 5,
          },
        ],
      },
    }),
  );
  await page.goto('/staff/users');
  await expect(page.getByText('Test designer', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Delete Test designer/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('option', { name: 'Manager', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('option', { name: 'Administrator', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Messages', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Add User', exact: true }),
  ).toBeVisible();
});
test('admin saves provider overrides without revealing secrets or probing automatically', async ({
  page,
}) => {
  await prepare(page, { ...manager, id: 'admin-workspace', role: 'admin' });
  let revision = null,
    configured = false,
    saved,
    checks = 0,
    diagnosticChecks = 0;
  const metadata = () => ({
    providers: [
      {
        provider: 'smtp',
        revision,
        fields: [
          {
            name: 'SMTP_PASS',
            secret: true,
            configured,
            source: configured ? 'saved' : 'unset',
          },
        ],
      },
    ],
  });
  await page.route('**/api/notifications/diagnostics', (route) => {
    diagnosticChecks++;
    return route.fulfill({
      json: {
        diagnostics: {
          sms: { configured: false },
          email: {
            configured: true,
            connected: true,
            host: 'smtp.example.test',
            port: 465,
            secure: true,
            from: 'test@example.test',
            latencyMs: 2,
          },
          twilio: { configured: false },
        },
      },
    });
  });
  await page.route('**/api/admin/config', (route) =>
    route.fulfill({ json: { configs: [] } }),
  );
  await page.route('**/api/admin/audit-logs', (route) =>
    route.fulfill({ json: { logs: [] } }),
  );
  await page.route('**/api/admin/providers', (route) =>
    route.fulfill({ json: metadata() }),
  );
  await page.route('**/api/admin/providers/smtp', (route) => {
    saved = route.request().postDataJSON();
    revision = 0;
    configured = true;
    return route.fulfill({ json: metadata() });
  });
  await page.route('**/api/admin/providers/smtp/check', (route) => {
    checks++;
    return route.fulfill({ json: { configured: true, connected: true } });
  });
  await page.goto('/staff/system');
  const card = page
    .locator('article')
    .filter({
      has: page.getByRole('heading', { name: 'SMTP Email', exact: true }),
    });
  await expect(card).toBeVisible();
  expect(checks).toBe(0);
  await card
    .getByLabel('SMTP password', { exact: true })
    .fill('synthetic-secret');
  await card
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect(
    card.getByText('Settings saved. Existing secrets remain hidden.', {
      exact: true,
    }),
  ).toBeVisible();
  expect(saved.values).toEqual({ SMTP_PASS: 'synthetic-secret' });
  await expect(card.getByLabel('SMTP password', { exact: true })).toHaveValue(
    '',
  );
  expect(checks).toBe(0);
  await card
    .getByRole('button', { name: 'Check saved connection', exact: true })
    .click();
  await expect(
    card.getByText('Connection verified.', { exact: true }),
  ).toBeVisible();
  expect(checks).toBe(1);
  expect(diagnosticChecks).toBe(0);
  await page
    .getByRole('button', { name: 'Check connections', exact: true })
    .click();
  await expect(
    page.getByText('smtp.example.test', { exact: true }),
  ).toBeVisible();
  expect(diagnosticChecks).toBe(1);
});

test('manager Notifications keeps the inbox without admin configuration or test tools', async ({
  page,
}) => {
  await prepare(page);
  await page.goto('/staff/notifications');
  await expect(
    page.getByRole('heading', { name: 'Notifications', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Notification Triggers & Settings' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'SMS & Email Health Test' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Send Tri-Channel Notification' }),
  ).toHaveCount(0);
});

test('admin can save and reload the sign-in verification interval on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page, { ...manager, id: 'admin-workspace', role: 'admin' });
  let value = 168;
  const writes = [];
  await page.route('**/api/admin/audit-logs', route => route.fulfill({ json: { logs: [] } }));
  await page.route('**/api/admin/providers', route => route.fulfill({ json: { providers: [] } }));
  await page.route('**/api/admin/config', route => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      writes.push(body); value = body.value;
      return route.fulfill({ json: { config: { key: body.key, value } } });
    }
    return route.fulfill({ json: { configs: [{ key: 'staff_login_verification_hours', value }] } });
  });
  await page.goto('/staff/system');
  const interval = page.getByLabel('Sign-in verification interval', { exact: true });
  await expect(interval).toHaveValue('168');
  await interval.selectOption('24');
  await page.getByRole('button', { name: 'Save verification interval', exact: true }).click();
  await expect(page.getByText('Verification interval saved.', { exact: true })).toBeVisible();
  expect(writes).toEqual([{ key: 'staff_login_verification_hours', value: 24 }]);
  await page.reload();
  await expect(interval).toHaveValue('24');
  await interval.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/tinzel-verification-settings-mobile.png', fullPage: true });
  await interval.selectOption('0');
  await page.getByRole('button', { name: 'Save verification interval', exact: true }).click();
  await expect(page.getByText('Verification interval saved.', { exact: true })).toBeVisible();
  expect(writes.at(-1).value).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
