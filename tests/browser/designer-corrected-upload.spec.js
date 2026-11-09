import { test, expect, chooseEnglish } from './fixtures.js';
import { readFileSync } from 'node:fs';

const pdf = { name: 'corrected-magazine.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\ncorrected draft') };
const referenceImage = readFileSync(new URL('../../public/brand/soft-flutter-poster.webp', import.meta.url));
const confirmation = 'I reviewed this correction and confirmed it is fixed in my updated PDF';

async function setup(page, { failSubmission = false, selectOriginal = false } = {}) {
  const designer = { _id: 'designer-1', name: 'Test Designer', role: 'designer', preferredLanguage: 'en', isActive: true };
  const revision = {
    _id: 'return-1', roundNumber: 1, draftVersionNumber: 1, source: 'manager', status: 'open',
    items: [
      { _id: 'fix-1', text: 'Correct the date', annotationId: 'annotation-1', pageReference: '4', status: 'open' },
      { _id: 'fix-2', text: 'Replace the photograph', pageReference: '8', status: 'addressed' },
    ],
  };
  const order = { _id: 'order-1', trackingId: 'TNZ-TEST', clientName: 'Test Client', formTitle: 'Magazine', status: 'revision_requested', currentDraftVersion: 1, draftVersions: [{ _id: 'draft-1', versionNumber: 1, uploadedAt: '2026-11-08T08:00:00Z' }], revisionRequests: [revision], uploadedPhotos: [] };
  const uploads = [], submissions = [];
  let fail = failSubmission, chunks = 0, orderReads = 0, pendingOrderRead = null;
  await page.addInitScript(() => localStorage.setItem('tinzel_staff_token', 'designer-test'));
  await page.route('**/api/staff/me', route => route.fulfill({ json: { user: designer } }));
  await page.route('**/api/designer/orders/order-1', async route => {
    orderReads++;
    const gate = pendingOrderRead;
    pendingOrderRead = null;
    if (gate) await gate;
    return route.fulfill({ json: { order, auditLogs: [] } });
  });
  await page.route('**/api/proofs/staff/order-1/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/attachments/')) return route.fulfill({ contentType: 'image/webp', body: referenceImage });
    if (url.pathname.includes('/pages/')) {
      if (url.searchParams.has('text')) return route.fulfill({ json: { width: 600, height: 800, text: [] } });
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/></svg>' });
    }
    return route.fulfill({ json: { state: 'ready', pageCount: 8, pages: Array.from({ length: 8 }, (_, i) => ({ page: i + 1 })), annotations: url.pathname.includes('/1') ? [{ _id: 'annotation-1', page: 4, displayNumber: 1, authorName: 'Manager', createdAt: '2026-11-09T06:00:00Z', submittedAt: '2026-11-09T06:01:00Z', kind: 'area', rects: [{ x: .1, y: .1, width: .2, height: .2 }], text: 'Correct the date', attachments: [{ id: 'reference-1', name: 'Date reference.png', contentType: 'image/webp' }] }] : [], canComment: false } });
  });
  await page.route('**/api/designer/orders/order-1/draft-uploads**', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/draft-uploads')) {
      const metadata = route.request().postDataJSON();
      uploads.push(metadata);
      return route.fulfill({ json: { ...metadata, id: 'upload-1', state: 'open', chunkBytes: 1024, chunks: [] } });
    }
    if (pathname.endsWith('/complete')) {
      submissions.push(route.request().postDataJSON());
      if (fail) {
        fail = false;
        return route.fulfill({ status: 500, json: { message: 'Submission failed. Please retry.' } });
      }
      order.status = 'draft_manager_review';
      order.currentDraftVersion = 2;
      order.draftVersions = [{ _id: 'draft-2', versionNumber: 2, uploadedAt: '2026-11-08T09:00:00Z', designerNotes: 'Updated date and photograph' }];
      revision.status = 'submitted_for_review';
      return route.fulfill({ json: { success: true, version: 2 } });
    }
    if (pathname.includes('/chunks/')) chunks++;
    return route.fulfill({ json: { success: true, readyForReview: true } });
  });
  await page.goto('/staff/design/orders/order-1');
  await chooseEnglish(page);
  if (selectOriginal) {
    await page.getByRole('tab', { name: 'Corrections', exact: true }).click();
    await page.getByRole('button', { name: 'View marked area', exact: true }).click();
    await expect(page.getByText('Draft version 1', { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Upload new draft', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Upload new draft' });
  await dialog.getByLabel('Magazine PDF · up to 500 MB').setInputFiles(pdf);
  await dialog.getByLabel('Version summary').fill('Updated date and photograph');
  return {
    dialog, uploads, submissions, chunkCount: () => chunks, orderReadCount: () => orderReads,
    holdNextOrderRead() {
      let release;
      pendingOrderRead = new Promise(resolve => { release = resolve; });
      return release;
    },
  };
}

async function reviewEachCorrection(page) {
  const review = page.getByRole('dialog', { name: 'Review corrections before submitting' });
  const send = review.getByRole('button', { name: 'Send to manager review' });
  await expect(review.getByText('Correct the date', { exact: false })).toBeVisible();
  await expect(review.getByAltText('Magazine page 4', { exact: true })).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await review.getByRole('button', { name: 'Download image: Date reference.png', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('Date reference.webp');
  expect(readFileSync(await download.path())).toEqual(referenceImage);
  // The mobile comments sheet must be closed before confirming the correction beneath it.
  const mobileComments = review.getByRole('dialog', { name: 'Comments · 1', exact: true });
  if (await mobileComments.isVisible()) await mobileComments.getByRole('button', { name: 'Close comments', exact: true }).click();
  await expect(send).toBeDisabled();
  await expect(review.getByRole('button', { name: 'Next correction' })).toBeDisabled();
  await review.getByRole('checkbox', { name: confirmation }).check();
  await review.getByRole('button', { name: 'Next correction' }).click();
  await expect(review.getByText('Replace the photograph', { exact: false })).toBeVisible();
  await expect(review.getByAltText('Magazine page 8', { exact: true })).toBeVisible();
  // Even a previously addressed item must be previewed for the new PDF.
  await expect(send).toBeDisabled();
  await review.getByRole('checkbox', { name: confirmation }).check();
  await expect(send).toBeEnabled();
  return { review, send };
}

test('updated PDF uploads with open corrections, then each correction must be previewed and confirmed before submission', async ({ page }) => {
  const { dialog, uploads, submissions } = await setup(page);
  await expect(dialog.getByRole('checkbox')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Mark addressed' })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Upload updated PDF' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Upload updated PDF' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Notifications', exact: true }).first().click();
  await expect(page).toHaveURL(/staff\/notifications/);
  await page.getByRole('button', { name: 'Review corrections', exact: true }).click();
  const { review, send } = await reviewEachCorrection(page);
  expect(uploads).toHaveLength(1);
  expect(uploads[0]).toMatchObject({ name: pdf.name, revisionRequestId: 'return-1', expectedVersion: 1, designerNotes: 'Updated date and photograph' });
  expect(uploads[0].verifyAll).toBeUndefined();
  expect(submissions).toHaveLength(0);
  await send.click();
  await expect(review).toHaveCount(0);
  expect(submissions).toEqual([{ confirmedCorrectionIds: ['fix-1', 'fix-2'] }]);
  await expect(page.getByText(/Draft uploaded and sent to manager review/)).toBeVisible();
});

test('mobile review survives reload without reuploading and failed submission preserves confirmations for retry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { dialog, uploads, submissions, chunkCount, orderReadCount, holdNextOrderRead } = await setup(page, { failSubmission: true });
  await dialog.getByRole('button', { name: 'Upload updated PDF' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Review corrections', exact: true })).toBeVisible();
  await page.reload();
  await chooseEnglish(page);
  await page.getByRole('button', { name: 'Upload new draft', exact: true }).click();
  const { review, send } = await reviewEachCorrection(page);
  expect(uploads).toHaveLength(1);
  expect(chunkCount()).toBe(1);
  await send.click();
  await expect(review.getByRole('heading', { name: 'We could not complete this request' })).toBeVisible();
  await expect(review.getByRole('heading', { name: 'The submission is unconfirmed' })).toBeVisible();
  await expect(review.getByRole('checkbox', { name: confirmation })).toBeChecked();
  await expect(review.getByText(pdf.name, { exact: true })).toBeVisible();
  await expect(send).toBeDisabled();
  expect(submissions).toHaveLength(1);
  expect(await review.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await review.screenshot({ path: '/tmp/tinzel-correction-review-mobile.png' });
  const readsBeforeCheck = orderReadCount();
  const releaseRead = holdNextOrderRead();
  const checkedOrder = page.waitForRequest(request => request.method() === 'GET' && new URL(request.url()).pathname === '/api/designer/orders/order-1');
  await review.getByRole('button', { name: 'Check saved order', exact: true }).click();
  await checkedOrder;
  await expect(send).toBeDisabled();
  await expect(review.getByRole('checkbox', { name: confirmation })).toBeChecked();
  expect(submissions).toHaveLength(1);
  releaseRead();
  await expect(send).toBeEnabled();
  await expect(review.getByRole('heading', { name: 'The submission is unconfirmed' })).toHaveCount(0);
  expect(orderReadCount()).toBe(readsBeforeCheck + 1);
  await send.click();
  await expect(review).toHaveCount(0);
  expect(submissions).toHaveLength(2);
  expect(chunkCount()).toBe(1);
});


test('replacement opens the current magazine and retains correction notes without broken old preview links', async ({ page }) => {
  const { dialog } = await setup(page, { selectOriginal: true });
  await expect(dialog.getByText('After you successfully submit this PDF, it will replace the previous magazine and its previews.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Upload updated PDF' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Review corrections', exact: true }).click();
  const { review, send } = await reviewEachCorrection(page);
  await expect(review.getByText('After successful submission, this PDF replaces the previous magazine and its previews. Correction notes are kept.')).toBeVisible();
  await send.click();
  await expect(review).toHaveCount(0);
  await expect(page.getByText('Draft version 2', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Corrections', exact: true }).click();
  await expect(page.getByText('Correct the date', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View marked area', exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Version history', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open version 2', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open version 1', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Dismiss uploads', exact: true }).click();
  await page.getByRole('heading', { name: 'Current magazine', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/private/tmp/tinzel-latest-magazine-mobile.png', fullPage: true });
});
