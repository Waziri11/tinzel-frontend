import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
const samplePage =
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/><text x="50" y="100" font-size="24">A magazine story</text></svg>';
const json = (route, data, status = 200) =>
  route.fulfill({ status, json: data });
async function setup(
  page,
  { pending = [], failDecision = 0, failComment = false, failUpload = false } = {},
) {
  await page.addInitScript(() => {
    localStorage.setItem('tinzel_language', 'en');
    localStorage.setItem('tinzel_staff_token', 'manager-book-test');
  });
  const state = {
    annotations: [...pending],
    images: new Map(),
    uploadFailed: false,
    decisions: [],
    failDecision,
    commentFailed: false,
    order: {
      _id: 'order-1',
      submissionId: 'SUB-BOOK',
      trackingId: 'TNZ-BOOK',
      clientName: 'Asha Review',
      clientWhatsApp: '0712000001',
      status: 'draft_manager_review',
      currentDraftVersion: 2,
      formTitle: 'Our story',
      formId: { title: 'Our story', price: 100, fields: [] },
      assignedDesigner: { _id: 'designer-1', name: 'Test designer' },
      draftVersions: [1, 2].map((versionNumber) => ({
        _id: `draft-${versionNumber}`,
        versionNumber,
        uploadedAt: '2026-11-01T10:00:00Z',
        managerReview: { status: 'pending' },
      })),
      createdAt: '2026-11-01T10:00:00Z',
    },
  };
  await page.route('**/api/staff/me', (route) =>
    json(route, {
      user: {
        id: 'manager-1',
        name: 'Test Manager',
        email: 'manager@example.test',
        role: 'manager',
        preferredLanguage: 'en',
      },
    }),
  );
  await page.route('**/api/manager/designers', (route) =>
    json(route, { designers: [] }),
  );
  await page.route('**/api/manager/settings', (route) =>
    json(route, { printer: { configured: false } }),
  );
  await page.route(
    (url) => url.pathname === '/api/manager/orders',
    (route) =>
      json(route, {
        orders: [state.order],
        summary: { draftReview: 1 },
        statusCounts: { draft_manager_review: 1 },
        total: 1,
        pageCount: 1,
      }),
  );
  await page.route('**/api/manager/orders/order-1', (route) =>
    json(route, { order: state.order, auditLogs: [] }),
  );
  await page.route('**/api/proofs/staff/order-1/**', (route) => {
    const url = new URL(route.request().url()),
      version = Number(url.pathname.split('/')[5]);
    if (url.pathname.endsWith('/attachments') && route.request().method() === 'POST') {
      const data = route.request().postDataJSON();
      let asset = [...state.images.values()].find(a => a.clientId === data.clientId);
      if (!asset) { asset = { ...data, id: `image-${state.images.size + 1}`, received: [], state: 'uploading' }; state.images.set(asset.id, asset); }
      return json(route, { ...asset, chunkBytes: 1024 * 1024 });
    }
    if (url.pathname.includes('/attachments/')) {
      const id = url.pathname.split('/attachments/')[1].split('/')[0], asset = state.images.get(id);
      if (route.request().method() === 'DELETE') { state.images.delete(id); return json(route, {}); }
      if (url.pathname.includes('/chunks/')) {
        if (failUpload && !state.uploadFailed) { state.uploadFailed = true; return json(route, { message: 'Image upload interrupted' }, 503); }
        asset.received.push({ n: Number(url.pathname.split('/').at(-1)) }); return json(route, {});
      }
      if (url.pathname.endsWith('/complete')) { asset.state = 'ready'; return json(route, { id, name: asset.name, width: 1, height: 1, contentType: 'image/webp' }); }
      return route.fulfill({ contentType: 'image/png', body: referencePng });
    }
    if (url.pathname.endsWith('/submit'))
      throw Error(
        'Manager review must use one consolidated decision endpoint.',
      );
    if (
      url.pathname.endsWith('/annotations') &&
      route.request().method() === 'POST'
    ) {
      if (failComment && !state.commentFailed) {
        state.commentFailed = true;
        return json(route, { message: 'Comment save interrupted' }, 503);
      }
      state.annotations.push({
        ...route.request().postDataJSON(),
        attachments: (route.request().postDataJSON().attachmentIds || []).map(id => ({ id, name: state.images.get(id).name })),
        _id: `annotation-${state.annotations.length + 1}`,
        version,
        source: 'manager',
        page: route.request().postDataJSON().page,
        authorName: 'Test Manager',
        createdAt: '2026-11-01T10:00:00Z',
      });
      return json(route, {
        annotations: state.annotations.filter((a) => a.version === version),
      });
    }
    if (/\/annotations\//.test(url.pathname)) {
      const id = url.pathname.split('/').at(-1);
      state.annotations = state.annotations.filter((a) => a._id !== id);
      return json(route, {
        annotations: state.annotations.filter((a) => a.version === version),
      });
    }
    if (url.pathname.includes('/pages/')) {
      if (url.searchParams.has('text'))
        return json(route, {
          geometryVersion: 3,
          width: 600,
          height: 800,
          imageRegions: [],
          text: [
            {
              str: 'A magazine story',
              x: 0.1,
              y: 0.1,
              width: 0.6,
              height: 0.05,
            },
          ],
        });
      return route.fulfill({ contentType: 'image/svg+xml', body: samplePage });
    }
    return json(route, {
      state: 'ready',
      pageCount: 3,
      pages: [1, 2, 3].map((page) => ({ page, width: 600, height: 800 })),
      annotations: state.annotations.filter((a) => a.version === version),
      canComment:
        version === state.order.currentDraftVersion &&
        state.order.status === 'draft_manager_review',
    });
  });
  await page.route(
    '**/api/manager/orders/order-1/review-draft',
    async (route) => {
      const body = route.request().postDataJSON();
      state.decisions.push(body);
      if (state.decisionGate) await state.decisionGate;
      if (state.failDecision) {
        const status = state.failDecision;
        state.failDecision = 0;
        return json(
          route,
          {
            message:
              status === 409
                ? 'This order changed in another session. Refresh before continuing.'
                : 'Decision could not be confirmed.',
          },
          status,
        );
      }
      state.order.status =
        body.action === 'release_to_client'
          ? 'client_review'
          : 'revision_requested';
      state.annotations = state.annotations.map((a) =>
        a.version === body.expectedVersion
          ? { ...a, submittedAt: '2026-11-01T11:00:00Z' }
          : a,
      );
      return json(route, { order: state.order });
    },
  );
  await page.goto('/staff/design-phase');
  await page
    .getByRole('button', { name: 'Review magazine', exact: true })
    .first()
    .click();
  await expect(
    page.getByAltText('Magazine page 1', { exact: true }),
  ).toBeVisible();
  return state;
}
async function mark(page, text) {
  await page.getByRole('button', { name: 'Mark area', exact: true }).click();
  const b = await page.locator('.proof-sheet').first().boundingBox();
  await page.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.5);
  await page.mouse.up();
  await page.getByLabel('Correction comment', { exact: true }).fill(text);
}
for (const width of [390, 768, 1440])
  test(`manager opens the book directly with decision controls in normal and fullscreen at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const state = await setup(page);
    await expect(page).toHaveURL(/staff\/review\/order-1\/versions\/2/);
    const approve = page.getByRole('button', {
      name: 'Approve and release to client',
      exact: true,
    });
    await expect(approve).toBeEnabled();
    await expect(
      page.getByRole('button', { name: 'Return to designer', exact: true }),
    ).toBeDisabled();
    await page.screenshot({path:testInfo.outputPath(`review-page-${width}.png`),fullPage:true});
    await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
    await expect(page.locator('.pdf-book.is-expanded')).toBeVisible();
    await expect(approve).toBeVisible();
    await page
      .locator('.pdf-book')
      .getByRole('button', { name: 'Next page', exact: true })
      .click();
    await expect(
      page.getByAltText('Magazine page 2', { exact: true }),
    ).toBeVisible();
    if (width > 760)
      await expect(
        page.getByAltText('Magazine page 3', { exact: true }),
      ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`manager-book-${width}.png`),
    });
    await approve.click();
    const confirm = page.getByRole('dialog', {
      name: 'Confirm approval',
      exact: true,
    });
    await expect(confirm).toBeVisible();
    await confirm
      .getByRole('button', {
        name: 'Approve and release to client',
        exact: true,
      })
      .click();
    await expect.poll(() => state.decisions.length).toBe(1);
    expect(state.decisions[0]).toEqual({
      action: 'release_to_client',
      feedback: '',
      expectedVersion: 2,
    });
    await expect(
      page.getByText('Magazine approved and released to client', {
        exact: true,
      }),
    ).toBeVisible();
  });
test('manager returns saved page corrections and general notes together after confirmation', async ({
  page,
}) => {
  const state = await setup(page);
  await mark(page, 'Replace this photograph');
  await expect(
    page.getByRole('button', {
      name: 'Approve and release to client',
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await page
    .getByLabel('General notes', { exact: true })
    .fill('Use consistent spacing throughout.');
  await expect(
    page.getByRole('button', { name: /Return for corrections/ }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Return to designer', exact: true })
    .click();
  const confirm = page.getByRole('dialog', {
    name: 'Confirm return',
    exact: true,
  });
  await expect(confirm).toContainText('Page 1');
  await expect(confirm).toContainText('Replace this photograph');
  await expect(confirm).toContainText('Use consistent spacing throughout.');
  expect(state.decisions.length).toBe(0);
  await confirm
    .getByRole('button', { name: 'Return to designer', exact: true })
    .click();
  await expect.poll(() => state.decisions.length).toBe(1);
  expect(state.decisions[0]).toEqual({
    action: 'return_to_designer',
    feedback: 'Use consistent spacing throughout.',
    expectedVersion: 2,
  });
  await expect(
    page.getByText('Magazine returned to designer', { exact: true }),
  ).toBeVisible();
});
test('notes-only returns are allowed, empty returns are blocked, and failed decisions retain notes', async ({
  page,
}) => {
  const state = await setup(page, { failDecision: 503 });
  await expect(
    page.getByRole('button', { name: 'Return to designer', exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel('General notes', { exact: true })
    .fill('Change the overall colour palette.');
  await page
    .getByRole('button', { name: 'Return to designer', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Confirm return' })
    .getByRole('button', { name: 'Return to designer', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'Decision could not be confirmed.',
  );
  await expect(page.getByLabel('General notes', { exact: true })).toHaveValue(
    'Change the overall colour palette.',
  );
  await expect(
    page.getByRole('button', { name: 'Reload current draft', exact: true }),
  ).toBeVisible();
  expect(state.decisions.length).toBe(1);
});
test('stale-version decisions preserve notes until an explicit confirmed reload', async ({
  page,
}) => {
  const state = await setup(page, { failDecision: 409 });
  await page
    .getByLabel('General notes', { exact: true })
    .fill('Keep these notes until I reload.');
  await page
    .getByRole('button', { name: 'Return to designer', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Confirm return' })
    .getByRole('button', { name: 'Return to designer', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'changed in another session',
  );
  await expect(page.getByLabel('General notes', { exact: true })).toHaveValue(
    'Keep these notes until I reload.',
  );
  page.once('dialog', (d) => d.dismiss());
  await page
    .getByRole('button', { name: 'Reload current draft', exact: true })
    .click();
  await expect(page.getByLabel('General notes', { exact: true })).toHaveValue(
    'Keep these notes until I reload.',
  );
  state.order.currentDraftVersion = 3;
  state.order.draftVersions.push({ _id: 'draft-3', versionNumber: 3 });
  page.once('dialog', (d) => d.accept());
  await page
    .getByRole('button', { name: 'Reload current draft', exact: true })
    .click();
  await expect(
    page.getByText('Magazine version 3', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('General notes', { exact: true })).toHaveValue(
    '',
  );
});
test('unsaved comments and notes warn on close while saved corrections survive reopening', async ({
  page,
}) => {
  const state = await setup(page);
  await mark(page, 'Persist this correction');
  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('button', { name: 'Back to order', exact: true }).click();
  await expect(
    page.getByLabel('Correction comment', { exact: true }),
  ).toHaveValue('Persist this correction');
  await page.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await page.getByLabel('General notes', { exact: true }).fill('Unsaved note');
  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('button', { name: 'Back to order', exact: true }).click();
  await expect(page.getByLabel('General notes', { exact: true })).toHaveValue(
    'Unsaved note',
  );
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Back to order', exact: true }).click();
  await page.getByRole('button', {name: 'Review magazine version 2', exact: true}).click();
  await page.getByRole('button', { name: 'Comments (1)', exact: true }).click();
  await expect(
    page.getByText('Persist this correction', { exact: true }),
  ).toBeVisible();
  expect(state.annotations.length).toBe(1);
});
test('historical versions stay read-only and discarding current corrections restores approval', async ({
  page,
}) => {
  const state = await setup(page, {
    pending: [
      {
        _id: 'saved-1',
        version: 2,
        source: 'manager',
        page: 1,
        kind: 'area',
        rects: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.2 }],
        text: 'Possible correction',
      },
    ],
  });
  await expect(
    page.getByRole('button', {
      name: 'Approve and release to client',
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByLabel('Magazine version', {exact:true}).selectOption('1');
  await expect(
    page.getByText('Magazine version 1', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Approve and release to client',
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Mark area', exact: true }),
  ).toHaveCount(0);
  await page.getByLabel('Magazine version', {exact:true}).selectOption('2');
  await page.getByRole('button', { name: 'Comments (1)', exact: true }).click();
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Approve and release to client',
      exact: true,
    }),
  ).toBeEnabled();
  expect(state.annotations.length).toBe(0);
});
test('failed annotation saves retain the comment and block decisions until retried or cancelled', async ({
  page,
}) => {
  await setup(page, { failComment: true });
  await mark(page, 'Retry this correction');
  await page.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(
    page.getByLabel('Correction comment', { exact: true }),
  ).toHaveValue('Retry this correction');
  await expect(
    page.getByRole('button', { name: 'Return to designer', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Return to designer', exact: true }),
  ).toBeEnabled();
});

test('unsent notes guard application and browser-back navigation', async ({
  page,
}) => {
  await setup(page);
  await page
    .getByLabel('General notes', { exact: true })
    .fill('Do not lose these review instructions.');
  page.once('dialog', (d) => d.dismiss());
  const allowed = await page.evaluate(() =>
    window.dispatchEvent(
      new Event('tinzel:before-navigate', { cancelable: true }),
    ),
  );
  expect(allowed).toBe(false);
  await expect(page).toHaveURL(/staff\/review\/order-1\/versions\/2/);
  await expect(page.getByLabel('General notes', { exact: true })).toHaveValue(
    'Do not lose these review instructions.',
  );
  page.once('dialog', (d) => d.dismiss());
  await page.goBack();
  await expect(page).toHaveURL(/staff\/review\/order-1\/versions\/2/);
  await expect(page.getByLabel('General notes', { exact: true })).toHaveValue(
    'Do not lose these review instructions.',
  );
});
test('pending decisions cannot be cancelled or submitted twice', async ({
  page,
}) => {
  const state = await setup(page);
  let release;
  state.decisionGate = new Promise((resolve) => (release = resolve));
  await page
    .getByLabel('General notes', { exact: true })
    .fill('Apply these corrections.');
  await page
    .getByRole('button', { name: 'Return to designer', exact: true })
    .click();
  const confirm = page.getByRole('dialog', {
    name: 'Confirm return',
    exact: true,
  });
  try {
    await confirm
      .getByRole('button', { name: 'Return to designer', exact: true })
      .click();
    await expect(
      confirm.getByRole('button', { name: 'Saving decision…', exact: true }),
    ).toBeDisabled();
    await expect(
      confirm.getByRole('button', { name: 'Cancel', exact: true }),
    ).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(confirm).toBeVisible();
    await expect.poll(() => state.decisions.length).toBe(1);
  } finally {
    release();
  }
  await expect(
    page.getByText('Magazine returned to designer', { exact: true }),
  ).toBeVisible();
  expect(state.decisions.length).toBe(1);
});

test('manager review actions and confirmation are available in Kiswahili', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'SW', exact: true }).click();
  await expect(
    page.getByText('Toleo la jarida 2', { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel('Maelezo ya jumla', { exact: true })
    .fill('Badilisha nafasi kati ya aya.');
  await page
    .getByRole('button', { name: 'Rudisha kwa msanifu', exact: true })
    .click();
  const confirm = page.getByRole('dialog', {
    name: 'Thibitisha kurudisha',
    exact: true,
  });
  await expect(confirm).toContainText('Badilisha nafasi kati ya aya.');
  await confirm
    .getByRole('button', { name: 'Rudisha kwa msanifu', exact: true })
    .click();
  await expect(
    page.getByText('Jarida limerudishwa kwa msanifu', { exact: true }),
  ).toBeVisible();
});

 test('review links survive reload and deny designer access to manager review', async ({page}) => {
  await setup(page);
  await page.reload();
  await expect(page.getByAltText('Magazine page 1', {exact:true})).toBeVisible();
  await page.route('**/api/staff/me', route => json(route,{user:{id:'designer-1',name:'Test designer',role:'designer',preferredLanguage:'en'}}));
  await page.reload();
  await expect(page.getByRole('heading',{name:'Access unavailable'})).toBeVisible();
  await expect(page.getByAltText('Magazine page 1',{exact:true})).toHaveCount(0);
 });

const referencePng = readFileSync(new URL('../../../tinzel-backend/tests/fixtures/review-reference.png', import.meta.url));
const referenceFile = { name: 'reference.png', mimeType: 'image/png', buffer: referencePng };
test('image-only comments retain failed uploads and saves, reopen privately, and appear in return confirmation', async ({ page }, testInfo) => {
  const state = await setup(page, { failComment: true, failUpload: true });
  await mark(page, '');
  await page.locator('.proof-attachment-editor input').setInputFiles(referenceFile);
  await expect(page.getByText('Image upload interrupted')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save comment', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Retry image', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save comment', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(page.getByText('Save failed — retry')).toBeVisible();
  await expect(page.locator('.proof-attachment-editor img')).toHaveCount(1);
  await page.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(page.locator('.proof-composer')).toHaveCount(0);
  expect(state.annotations[0].text).toBe(''); expect(state.annotations[0].attachments).toHaveLength(1);
  await page.getByRole('button', { name: 'Open image: reference.png' }).click();
  await expect(page.getByRole('dialog', { name: 'Attached image' })).toBeVisible();
  await page.getByRole('button', { name: 'Close image' }).click();
  await page.reload(); await page.getByRole('button', { name: 'Comments (1)', exact: true }).click();
  await expect(page.locator('.proof-attached-image img')).toBeVisible();
  await page.getByRole('button', { name: 'Return to designer', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Confirm return' }).locator('.proof-attached-image img')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('image-only-return.png'), fullPage: true });
});
test('mobile attachment-only drafts guard navigation and accept paste/drop with a five image limit', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await setup(page);
  await mark(page, ''); await page.locator('.proof-attachment-editor input').setInputFiles(referenceFile);
  await expect(page.getByRole('button', { name: 'Save comment', exact: true })).toBeEnabled();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByLabel('Magazine version', { exact: true }).selectOption('1');
  await expect(page.getByLabel('Magazine version', { exact: true })).toHaveValue('2');
  await expect(page.locator('.proof-attachment-editor img')).toHaveCount(1);
  await page.locator('.proof-composer').evaluate((element, base64) => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const clipboard = new DataTransfer(); clipboard.items.add(new File([bytes], 'pasted.png', { type: 'image/png' }));
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }));
    const drop = new DataTransfer(); drop.items.add(new File([bytes], 'dropped.png', { type: 'image/png' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: drop }));
  }, referencePng.toString('base64'));
  await expect(page.locator('.proof-attachment-editor img')).toHaveCount(3);
  await page.locator('.proof-attachment-editor input').setInputFiles([referenceFile, referenceFile]);
  await expect(page.locator('.proof-attachment-editor img')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Attach images', exact: true })).toBeDisabled();
  await page.locator('.proof-attachment-editor input').setInputFiles(referenceFile);
  await expect(page.getByText('Choose up to five images per comment.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save comment', exact: true })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('mobile-image-composer.png'), fullPage: true });
  await page.getByRole('button', { name: 'Remove image: pasted.png' }).click();
  await expect(page.locator('.proof-attachment-editor img')).toHaveCount(4);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.proof-composer')).toHaveCount(0);
});
