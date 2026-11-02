import {securityLogin} from './security-login.js';
import { test, expect } from '@playwright/test';
import { proofPdf } from '../../../tinzel-backend/tests/fixtures/proofPdf.js';
const password = 'Browser!2026';
const login=securityLogin;
async function api(request, path, token, data, method = 'post') {
  const res = await request[method](`/api${path}`, {
    headers: token ? { Cookie:'',Authorization: `Bearer ${token}` } : {},
    ...(data === undefined ? {} : { data }),
  });
  const body = await res.json();
  expect(res.ok(), `${method} ${path}: ${JSON.stringify(body)}`).toBe(true);
  return body;
}
async function staffContext(browser, token) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([{name:'tinzel_staff',value:token,url:'http://127.0.0.1:5177',httpOnly:true,sameSite:'Strict'}]);
  await context.addInitScript((value) => {
    localStorage.setItem('tinzel_staff_token', value);
    localStorage.setItem('tinzel_language', 'en');
  }, token);
  return context;
}

test('real book return, designer checklist, corrected upload and manager approval reach the client', async ({
  browser,
  page,
  request,
}, testInfo) => {
  test.setTimeout(180000);
  const admin = await login(request, 'admin'),
    manager = await login(request, 'manager'),
    designer = await login(request, 'designer');
  const created = await api(request, '/admin/forms', admin, {
    title: `Book workflow ${Date.now()}`,
    price: 50000,
    currency: 'TZS',
    coverImageUrl: '/brand/magazine-cover-sample.jpg',
    sections: [{ sectionId: 'story', title: 'Story', order: 0 }],
    fields: [
      {
        fieldId: 'story',
        sectionId: 'story',
        label: 'Story',
        type: 'textarea',
        required: true,
        order: 0,
      },
    ],
    lipaNambaInstructions: {
      tillNumber: 'TEST',
      accountName: 'Isolated fixture',
      instructions: 'Do not pay.',
    },
  });
  await api(request, `/admin/forms/${created.form._id}/publish`, admin);
  const submission = await api(
    request,
    `/public/forms/${created.form.slug}/submit`,
    null,
    {
      clientName: 'Fictional book review client',
      clientWhatsApp: '0712000088',
      answers: { story: 'An isolated magazine story.' },
    },
  );
  const list = await api(
      request,
      '/manager/orders?scope=all&limit=50',
      manager,
      undefined,
      'get',
    ),
    order = list.orders.find(
      (x) => x.submissionId === submission.order.submissionId,
    );
  expect(order).toBeTruthy();
  const id = order._id;
  await api(request, `/manager/orders/${id}/verify-payment`, manager, {
    lipaNambaReference: 'BOOK-ISOLATED',
    amountPaid: 50000,
  });
  const initial = await request.post(
    `/api/designer/orders/${id}/upload-draft`,
    {
      headers: { Cookie:'',Authorization: `Bearer ${designer}` },
      multipart: {
        draftFile: {
          name: 'magazine-v1.pdf',
          mimeType: 'application/pdf',
          buffer: proofPdf(3),
        },
        expectedVersion: '0',
      },
    },
  );
  expect(initial.ok(), await initial.text()).toBe(true);
  const managerContext = await staffContext(browser, manager),
    designerContext = await staffContext(browser, designer);
  try {
    const m = await managerContext.newPage();
    await m.goto(`/staff/design-phase?orderId=${id}&tab=drafts`);
    await m.getByRole('button',{name:'Review magazine version 1',exact:true}).click();
    await expect(
      m.getByAltText('Magazine page 1', { exact: true }),
    ).toBeVisible({ timeout: 45000 });
    await m.getByRole('button', { name: 'Mark area', exact: true }).click();
    const b = await m.locator('.proof-sheet').first().boundingBox();
    await m.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.3);
    await m.mouse.down();
    await m.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.5);
    await m.mouse.up();
    await m
      .getByLabel('Correction comment', { exact: true })
      .fill('Replace the marked photograph.');
    await m.getByRole('button', { name: 'Save comment', exact: true }).click();
    await expect(m.getByText('Saved', { exact: true })).toBeVisible();
    await m
      .getByLabel('General notes', { exact: true })
      .fill('Use consistent spacing across the magazine.');
    await m
      .getByRole('button', { name: 'Return to designer', exact: true })
      .click();
    await m
      .getByRole('dialog', { name: 'Confirm return', exact: true })
      .getByRole('button', { name: 'Return to designer', exact: true })
      .click();
    await expect(
      m.getByText('Magazine returned to designer', { exact: true }),
    ).toBeVisible();
    let saved = (
      await api(request, `/manager/orders/${id}`, manager, undefined, 'get')
    ).order;
    expect(saved.status).toBe('revision_requested');
    const round = saved.revisionRequests.at(-1);
    expect(round.items).toHaveLength(2);
    expect(round.items[0].annotationId).toBeTruthy();
    const d = await designerContext.newPage();
    await d.goto(`/staff/design/orders/${id}`);
    await d.getByRole('tab', { name: 'Corrections', exact: true }).click();
    await expect(
      d
        .locator('.fix-item p')
        .filter({ hasText: 'Replace the marked photograph.' }),
    ).toBeVisible();
    await expect(
      d
        .locator('.fix-item p')
        .filter({ hasText: 'Use consistent spacing across the magazine.' }),
    ).toBeVisible();
    await d
      .getByRole('button', { name: 'View marked area', exact: true })
      .click();
    await expect(
      d.getByAltText('Magazine page 1', { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await d.getByRole('tab', { name: 'Corrections', exact: true }).click();
    for (const item of round.items) {
      const response = d.getByLabel(`Response for ${item.text}`, {
        exact: true,
      });
      await response.fill('Corrected and checked in the revised magazine.');
      await response
        .locator('..')
        .getByRole('button', { name: 'Mark addressed', exact: true })
        .click();
      await expect(response).toHaveCount(0);
    }
    await d
      .getByRole('button', { name: 'Upload new draft', exact: true })
      .click();
    const upload = d.getByRole('dialog', {
      name: 'Upload new draft',
      exact: true,
    });
    await upload
      .getByLabel('Magazine PDF · up to 500 MB', { exact: true })
      .setInputFiles({
        name: 'magazine-v2.pdf',
        mimeType: 'application/pdf',
        buffer: proofPdf(3),
      });
    await upload
      .getByLabel('Version summary', { exact: true })
      .fill('Replaced photograph and corrected spacing.');
    await upload
      .getByLabel('I verified every requested fix', { exact: true })
      .check();
    await upload
      .getByRole('button', { name: 'Send to manager review', exact: true })
      .click();
    await expect(upload).toHaveCount(0, { timeout: 45000 });
    saved = (
      await api(request, `/manager/orders/${id}`, manager, undefined, 'get')
    ).order;
    expect(saved.currentDraftVersion).toBe(2);
    expect(saved.status).toBe('draft_manager_review');
    await m.reload();
    await m.getByLabel('Magazine version',{exact:true}).selectOption('2');
    await expect(
      m.getByText('Magazine version 2', { exact: true }),
    ).toBeVisible();
    await expect(
      m.getByAltText('Magazine page 1', { exact: true }),
    ).toBeVisible({ timeout: 45000 });
    await m
      .getByRole('button', {
        name: 'Approve and release to client',
        exact: true,
      })
      .click();
    await m
      .getByRole('dialog', { name: 'Confirm approval', exact: true })
      .getByRole('button', {
        name: 'Approve and release to client',
        exact: true,
      })
      .click();
    await expect(
      m.getByText('Magazine approved and released to client', { exact: true }),
    ).toBeVisible();
    saved = (
      await api(request, `/manager/orders/${id}`, manager, undefined, 'get')
    ).order;
    expect(saved.status).toBe('client_review');
    expect(saved.draftVersions.at(-1).managerReview.status).toBe('approved');
    expect(
      saved.revisionRequests[0].items.every((x) => x.status === 'addressed'),
    ).toBe(true);
    await page.addInitScript(() =>
      localStorage.setItem('tinzel_language', 'en'),
    );
    await page.goto('/track');
    await page.locator('#track-login-id').fill(saved.trackingId);
    await page.locator('#track-login-whatsapp').fill('0712000088');
    const otpResponse = page.waitForResponse((r) =>
      r.url().endsWith('/client/request-otp'),
    );
    await page
      .getByRole('button', { name: 'Send WhatsApp Verification Code' })
      .click();
    const otp = await (await otpResponse).json();
    expect(otp.devOtp).toBeTruthy();
    await page.locator('#track-login-otp').fill(otp.devOtp);
    await page.getByRole('button', { name: 'Verify & Enter Portal' }).click();
    await expect(
      page.getByAltText('Magazine page 1', { exact: true }),
    ).toBeVisible({ timeout: 45000 });
    await expect(
      page.getByRole('link', { name: /Download PDF|Original PDF/i }),
    ).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('client-approved-manager-book.png'),
      fullPage: true,
    });
  } finally {
    await managerContext.close();
    await designerContext.close();
  }
});
