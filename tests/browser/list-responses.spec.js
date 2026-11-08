import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

async function login(request, role) {
  const sink = `http://127.0.0.1:${process.env.SECURITY_TEST_SINK_PORT || 5078}`;
  await request.post(`${sink}/__test__/reset-otp-limits`);
  const response = await request.post('/api/staff/login', { data: { email: `${role}@example.test`, password: 'Browser!2026' } });
  expect(response.ok(), await response.text()).toBe(true);
  const data = await response.json();
  if (data.otpRequired) {
    const message = await (await request.get(`${sink}/__test__/otp/${data.challengeId}`)).json();
    const verified = await request.post('/api/staff/otp/verify', { data: { challengeId: data.challengeId, code: message.code } });
    expect(verified.ok(), await verified.text()).toBe(true);
  }
}

test('list response flows from form settings through review and saved admin/designer answers', async ({ page, baseURL }) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await login(page.request, 'admin');
  // Use the actual local request origin for authenticated writes.
  const write = async (path, data, method = 'POST') => {
    const { csrf } = await (await page.request.get('/api/csrf/staff')).json();
    const response = await page.request.fetch(path, { method, headers: { 'X-CSRF-Token': csrf, Origin: new URL(baseURL).origin }, data });
    expect(response.ok(), await response.text()).toBe(true);
    return response.json();
  };
  const title = `List response ${randomUUID().slice(0, 8)}`;
  const { form: created } = await write('/api/admin/forms', {
    title, price: 50000, currency: 'TZS', coverImageUrl: '/brand/magazine-cover-sample.jpg',
    sections: [{ sectionId: 'story', title: 'Your story', order: 0 }],
    fields: [
      { fieldId: 'wishes', sectionId: 'story', label: 'Your wishes', labelSw: 'Matakwa yako', type: 'text', required: true, order: 0 },
      { fieldId: 'optional', sectionId: 'story', label: 'Other ideas', type: 'list', required: false, order: 1 },
      { fieldId: 'themes', sectionId: 'story', label: 'Themes', type: 'checkbox', options: ['Family', 'Travel'], order: 2 },
    ],
  });
  await page.goto('/staff/forms');
  await page.getByText(title, { exact: true }).click();
  await page.getByLabel('Response Type', { exact: true }).first().selectOption('list');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'Edition preview' });
  await expect(preview.locator('.ordered-list-field').first().locator('ol > li')).toHaveCount(2);
  await preview.getByRole('button', { name: 'Close', exact: true }).click();
  const savedResponse = page.waitForResponse(response => response.url().endsWith(`/api/admin/forms/${created._id}`) && response.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
  const saved = await (await savedResponse).json();
  expect(saved.form.fields[0].type).toBe('list');
  await page.getByRole('button', { name: 'Publish Edition', exact: true }).click();
  await expect(page.getByText('Published', { exact: true })).toBeVisible();

  const customer = { clientName: title, clientWhatsApp: '+255700000001', answers: { wishes: ['', '   '] } };
  const legacyPath = `/api/public/forms/${created.slug}/submit`;
  for (const wishes of [[], [' '], 'Invalid string', [{}]]) {
    const invalid = await page.request.post(legacyPath, { data: { ...customer, answers: { wishes } } });
    expect(invalid.status()).toBe(400);
  }
  const sessionId = randomUUID();
  const headers = { 'X-Upload-Token': 'a'.repeat(64) };
  expect((await page.request.post('/api/public/media/sessions', { headers, data: { id: sessionId, slug: created.slug } })).status()).toBe(201);
  expect((await page.request.post(`/api/public/media/sessions/${sessionId}/submit`, { headers, data: { ...customer, assetIds: [] } })).status()).toBe(400);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/catalogue/${created.slug}?step=details`);
  await page.locator('#magazine-client-name').fill(title);
  await page.locator('#magazine-client-whatsapp').fill(customer.clientWhatsApp);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const wishes = page.locator('.ordered-list-field').filter({ has: page.locator('legend', { hasText: 'Your wishes' }) });
  await wishes.getByRole('textbox', { name: 'Your wishes: Item 1', exact: true }).fill('   ');
  await wishes.getByRole('button', { name: 'Add item', exact: true }).click();
  await expect(wishes.getByRole('textbox', { name: 'Your wishes: Item 2', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: '4 Review', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(/step=story$/);
  await wishes.getByRole('textbox', { name: 'Your wishes: Item 1', exact: true }).fill('  Keep learning  ');
  await wishes.getByRole('textbox', { name: 'Your wishes: Item 2', exact: true }).fill('Remove this item');
  await wishes.getByRole('button', { name: 'Add item', exact: true }).click();
  await wishes.getByRole('textbox', { name: 'Your wishes: Item 3', exact: true }).fill('Be kind\nto others');
  await wishes.getByRole('button', { name: 'Remove item 2', exact: true }).click();
  await expect(wishes.getByRole('textbox', { name: 'Your wishes: Item 2', exact: true })).toHaveValue('Be kind\nto others');
  await expect(wishes.getByRole('textbox', { name: 'Your wishes: Item 2', exact: true })).toBeFocused();
  await wishes.getByRole('button', { name: 'Add item', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Family', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Travel', exact: true }).check();
  await expect.poll(() => page.evaluate(slug => JSON.parse(localStorage.getItem(`tinzel:answers:v2:${slug}`))?.data?.answers?.wishes?.length, created.slug)).toBe(3);
  await page.reload();
  await expect(wishes.getByRole('textbox', { name: 'Your wishes: Item 2', exact: true })).toHaveValue('Be kind\nto others');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/tinzel-list-entry-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'SW', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ongeza kipengele', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByRole('button', { name: '4 Review', exact: true }).click();
  const numbered = page.getByRole('list', { name: 'Your wishes', exact: true });
  await expect(numbered.locator('li')).toHaveText(['Keep learning', 'Be kind\nto others']);
  await expect(numbered).toHaveCSS('list-style-type', 'decimal');
  await expect(page.locator('.order-answers')).toContainText('Family, Travel');
  await page.screenshot({ path: '/tmp/tinzel-list-review-mobile.png', fullPage: true });
  const submittedResponse = page.waitForResponse(response => /\/sessions\/[^/]+\/submit$/.test(new URL(response.url()).pathname));
  await page.getByRole('button', { name: 'Continue to Payment', exact: true }).click();
  const submitted = await submittedResponse;
  expect(submitted.ok(), await submitted.text()).toBe(true);
  expect(submitted.request().postDataJSON().answers.wishes).toEqual(['Keep learning', 'Be kind\nto others']);
  await expect(page.locator('.payment-page')).toBeVisible();

  const { orders } = await (await page.request.get('/api/manager/orders?phase=pre_design&limit=100')).json();
  const order = orders.find(order => order.clientName === title);
  expect(order).toBeTruthy();
  const detail = (await (await page.request.get(`/api/manager/orders/${order._id}`)).json()).order;
  expect(detail.submittedData.wishes).toEqual(['Keep learning', 'Be kind\nto others']);
  expect(detail.submittedFields.find(field => field.fieldId === 'wishes').type).toBe('list');
  const legacy = await page.request.post(legacyPath, { data: { ...customer, clientName: `${title} legacy`, answers: { wishes: [' First ', '', 'Second'] } } });
  expect(legacy.status(), await legacy.text()).toBe(201);
  const legacyOrders = (await (await page.request.get('/api/manager/orders?phase=pre_design&limit=100')).json()).orders;
  const legacyDetail = (await (await page.request.get(`/api/manager/orders/${legacyOrders.find(order => order.clientName === `${title} legacy`)._id}`)).json()).order;
  expect(legacyDetail.submittedData.wishes).toEqual(['First', 'Second']);
  expect(legacyDetail.submittedFields[0].type).toBe('list');

  // Subsequent form edits must not change the presentation of already submitted lists.
  await write(`/api/admin/forms/${created._id}`, { ...saved.form, fields: saved.form.fields.map(field => field.fieldId === 'wishes' ? { ...field, type: 'textarea', label: 'Edited question' } : field) }, 'PUT');
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/staff/pre-design');
  await page.getByRole('button', { name: new RegExp(`^Open ${title}, waiting `) }).click();
  await page.getByRole('tab', { name: 'Client answers', exact: true }).click();
  await expect(numbered.locator('li')).toHaveText(['Keep learning', 'Be kind\nto others']);
  await page.screenshot({ path: '/tmp/tinzel-list-admin-view.png', fullPage: true });
  await write(`/api/manager/orders/${order._id}/verify-payment`, { lipaNambaReference: 'LIST-LOCAL-TEST', amountPaid: 50000 });
  await page.context().clearCookies();
  await login(page.request, 'designer');
  await page.goto(`/staff/design/orders/${order._id}`);
  await expect(numbered.locator('li')).toHaveText(['Keep learning', 'Be kind\nto others']);
  await expect(numbered).toHaveCSS('list-style-type', 'decimal');
  await page.screenshot({ path: '/tmp/tinzel-list-designer-view.png', fullPage: true });
  expect(errors).toEqual([]);
});
