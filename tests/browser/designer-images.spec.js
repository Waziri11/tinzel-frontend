import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { securityLogin } from './security-login.js';

test('designer separates responses and downloads a customer folder with every original image', async ({ page, request }, testInfo) => {
  const seeded = await request.post('http://127.0.0.1:5078/__test__/designer-image-fixtures');
  expect(seeded.ok()).toBeTruthy();
  const { orderId, originals } = await seeded.json();
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await securityLogin(page.request, 'designer');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/staff/design/orders/${orderId}`);
  const text = page.getByRole('tabpanel', { name: 'Text responses', exact: true });
  const images = page.getByRole('tabpanel', { name: 'Images', exact: true });
  await expect(text).toBeVisible();
  await expect(text.getByText('We met in Dar es Salaam.')).toBeVisible();
  await expect(text.getByRole('list', { name: 'Favourite memories' }).getByRole('listitem')).toHaveText(['First meeting', 'Our wedding']);
  await expect(text).not.toContainText('photo metadata');
  await expect(text).not.toContainText('image placeholder');
  await expect(images).toBeHidden();
  await page.getByRole('tab', { name: 'Images', exact: true }).click();
  await expect(text).toBeHidden();
  await expect(images.locator('.order-photo-folder')).toHaveCount(2);
  await expect(images.getByRole('img', { name: 'portrait.png', exact: true })).toHaveCount(2);
  await images.getByRole('button', { name: 'Family photos 1 photo' }).click();
  await expect(images.getByRole('img', { name: 'portrait.png', exact: true })).toHaveCount(3);
  await expect.poll(() => images.getByRole('img', { name: 'portrait.png', exact: true }).evaluateAll(imgs => imgs.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('designer-images-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('designer-images-mobile.png'), fullPage: true });

  const enqueued = page.waitForResponse(response => response.url().endsWith('/photo-folder-download') && response.request().method() === 'POST');
  const downloaded = page.waitForEvent('download');
  await images.getByRole('button', { name: 'Download all images ZIP', exact: true }).click();
  const response = await enqueued;
  expect(response.status()).toBe(202);
  expect(response.request().postDataJSON()).toEqual({ scope: 'all' });
  const { jobId } = await response.json();
  await expect(images.getByRole('button', { name: /Preparing ZIP/ })).toBeDisabled();
  const worker = await request.post('http://127.0.0.1:5078/__test__/image-archive-worker');
  expect(worker.ok()).toBeTruthy();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('Asha Mushi.zip');
  expect(await download.failure()).toBeNull();
  const zipPath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(zipPath);
  const entries = JSON.parse(execFileSync('python3', ['-c',
    'import zipfile,sys,json,hashlib\nwith zipfile.ZipFile(sys.argv[1]) as z:\n assert z.testzip() is None\n print(json.dumps([{ "name": n, "sha256": hashlib.sha256(z.read(n)).hexdigest() } for n in z.namelist()]))', zipPath], { encoding: 'utf8' }));
  expect(entries.map(entry => entry.name)).toEqual(['Asha Mushi/Couple photos/portrait.png', 'Asha Mushi/Couple photos/portrait (2).png', 'Asha Mushi/Family photos/portrait.png']);
  expect(entries.map(entry => entry.sha256)).toEqual(originals);
  await expect(images.getByRole('button', { name: 'Download all images ZIP', exact: true })).toBeEnabled();

  const cachedResponse = page.waitForResponse(response => response.url().endsWith('/photo-folder-download') && response.request().method() === 'POST');
  const cachedDownload = page.waitForEvent('download');
  await images.getByRole('button', { name: 'Download all images ZIP', exact: true }).click();
  const cached = await cachedResponse;
  expect(cached.status()).toBe(200);
  expect((await cached.json()).jobId).toBe(jobId);
  expect(await (await cachedDownload).failure()).toBeNull();
  const forbiddenToken = await securityLogin(request, 'unassigned');
  const forbidden = await request.post(`/api/designer/orders/${orderId}/photo-folder-download`, { data: { scope: 'all' }, headers: { Authorization: `Bearer ${forbiddenToken}`, Cookie: '' } });
  expect(forbidden.status()).toBe(403);
  expect(errors).toEqual([]);
});

test('orders with no images keep text available and disable the ZIP download', async ({ page, request }) => {
  const { orderId } = await (await request.post('http://127.0.0.1:5078/__test__/designer-image-fixtures?empty=1')).json();
  await page.addInitScript(() => localStorage.setItem('tinzel_language', 'en'));
  await securityLogin(page.request, 'designer');
  await page.goto(`/staff/design/orders/${orderId}`);
  await expect(page.getByText('We met in Dar es Salaam.')).toBeVisible();
  await page.getByRole('tab', { name: 'Images', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No photographs yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download all images ZIP' })).toBeDisabled();
  await page.getByRole('tab', { name: 'Text responses', exact: true }).click();
  await expect(page.getByText('We met in Dar es Salaam.')).toBeVisible();
});
