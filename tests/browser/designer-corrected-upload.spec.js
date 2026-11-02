import { test, expect, chooseEnglish } from './fixtures.js';

const pdf = { name: 'corrected-magazine.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\ncorrected draft') };

async function setup(page, { failFirst = false } = {}) {
  const designer = { _id: 'designer-1', name: 'Test Designer', role: 'designer', preferredLanguage: 'en', isActive: true };
  const revision = {
    _id: 'return-1', roundNumber: 1, draftVersionNumber: 1, source: 'manager', status: 'open',
    items: [
      { _id: 'fix-1', text: 'Correct the date', pageReference: '4', status: 'open' },
      { _id: 'fix-2', text: 'Replace the photograph', pageReference: '8', status: 'open' },
    ],
  };
  const order = { _id: 'order-1', trackingId: 'TNZ-TEST', clientName: 'Test Client', formTitle: 'Magazine', status: 'revision_requested', currentDraftVersion: 1, draftVersions: [], revisionRequests: [revision], uploadedPhotos: [] };
  const uploads = [];
  let fail = failFirst;
  await page.addInitScript(() => localStorage.setItem('tinzel_staff_token', 'designer-test'));
  await page.route('**/api/staff/me', route => route.fulfill({ json: { user: designer } }));
  await page.route('**/api/designer/orders/order-1', route => route.fulfill({ json: { order, auditLogs: [] } }));
  await page.route('**/api/designer/orders/order-1/returns/return-1/items/*', route => {
    if (fail) {
      fail = false;
      return route.fulfill({ status: 409, json: { message: 'Could not save the correction. Please retry.' } });
    }
    const item = revision.items.find(item => route.request().url().endsWith(item._id));
    item.status = 'addressed';
    item.designerResponse = route.request().postDataJSON().response;
    return route.fulfill({ json: { success: true, request: revision } });
  });
  await page.route('**/api/designer/orders/order-1/draft-uploads**', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/draft-uploads')) {
      const metadata = route.request().postDataJSON();
      uploads.push(metadata);
      return route.fulfill({ json: { ...metadata, id: 'upload-1', state: 'open', chunkBytes: 1024, chunks: [] } });
    }
    if (pathname.endsWith('/complete')) {
      order.status = 'draft_manager_review';
      order.currentDraftVersion = 2;
      revision.status = 'submitted_for_review';
      return route.fulfill({ json: { success: true, version: 2 } });
    }
    return route.fulfill({ json: { success: true } });
  });
  await page.goto('/staff/design/orders/order-1');
  await chooseEnglish(page);
  await page.getByRole('button', { name: 'Upload new draft', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Upload new draft' });
  await dialog.getByLabel('Magazine PDF · up to 500 MB').setInputFiles(pdf);
  await dialog.getByLabel('Version summary').fill('Updated date and photograph');
  return { dialog, uploads };
}

test('designer completes corrections inside upload dialog and submits the selected updated PDF', async ({ page }) => {
  const { dialog, uploads } = await setup(page);
  const verification = dialog.getByRole('checkbox', { name: 'I verified every requested fix' });
  const submit = dialog.getByRole('button', { name: 'Send to manager review' });
  await expect(verification).toBeDisabled();
  await expect(submit).toBeDisabled();
  await expect(dialog.getByRole('status')).toContainText('Complete the pending corrections above');
  const corrections = dialog.locator('.upload-correction');
  await corrections.first().getByLabel('How was this fixed?').fill('Updated to the correct date');
  await corrections.first().getByRole('button', { name: 'Mark addressed' }).click();
  await expect(corrections).toHaveCount(1);
  await expect(verification).toBeDisabled();
  await expect(submit).toBeDisabled();
  expect(uploads).toHaveLength(0);
  await corrections.first().getByLabel('How was this fixed?').fill('Replaced with the approved photograph');
  await corrections.first().getByRole('button', { name: 'Mark addressed' }).click();
  await expect(verification).toBeEnabled();
  await expect(dialog.getByRole('status')).toContainText('Tick the verification checkbox');
  await expect(submit).toBeDisabled();
  expect(await dialog.getByLabel('Magazine PDF · up to 500 MB').evaluate(input => input.files[0].name)).toBe(pdf.name);
  await expect(dialog.getByLabel('Version summary')).toHaveValue('Updated date and photograph');
  await verification.check();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(/Draft uploaded and sent to manager review/)).toBeVisible();
  expect(uploads).toHaveLength(1);
  expect(uploads[0]).toMatchObject({ name: pdf.name, revisionRequestId: 'return-1', verifyAll: true, expectedVersion: 1, designerNotes: 'Updated date and photograph' });
});

test('failed correction saves stay visible and can be retried on mobile without losing upload inputs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { dialog, uploads } = await setup(page, { failFirst: true });
  const response = dialog.getByLabel('How was this fixed?').first();
  await response.fill('Updated the date');
  await response.press('Enter');
  await expect(dialog.getByRole('alert')).toHaveText('Could not save the correction. Please retry.');
  await expect(response).toHaveValue('Updated the date');
  await expect(dialog.getByRole('checkbox')).toBeDisabled();
  expect(uploads).toHaveLength(0);
  await response.press('Enter');
  await expect(dialog.locator('.upload-correction')).toHaveCount(1);
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  expect(await dialog.getByLabel('Magazine PDF · up to 500 MB').evaluate(input => input.files[0].name)).toBe(pdf.name);
  await expect(dialog.getByLabel('Version summary')).toHaveValue('Updated date and photograph');
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await dialog.screenshot({ path: '/tmp/tinzel-corrected-upload-mobile.png' });
});
