import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { extractSavedGoogleForm } from '../../src/utils/googleFormsImport.js';

const sampleData = [null, ['Saved form description', [
  [1, 'Your name', null, 0, [[11, null, 1]]],
  [2, 'Anniversary date', null, 9, [[22, null, 1, null, null, null, null, [0, 1]]]],
  [3, 'Your photos', null, 13, [[33, null, 0]]],
]], null, 'Saved form browser test'];
const sampleHtml = `<html><input value="unsent answer"><script>var FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify(sampleData)}; var credential = 'must-stay-local';</script></html>`;
async function login(page, language) {
  await page.request.post('http://127.0.0.1:5078/__test__/reset-otp-limits');
  const response = await page.request.post('/api/staff/login', { data: { email: 'manager@example.test', password: 'Browser!2026' } });
  const challenge = await response.json();
  expect(challenge.otpRequired).toBe(true);
  let code;
  await expect.poll(async () => {
    const result = await page.request.get(`http://127.0.0.1:5078/__test__/otp/${challenge.challengeId}`);
    if (result.ok()) code = (await result.json()).code;
    return Boolean(code);
  }).toBe(true);
  const verified = await page.request.post('/api/staff/otp/verify', { data: { challengeId: challenge.challengeId, code } });
  expect(verified.ok()).toBe(true);
  const { csrf } = await (await page.request.get('/api/csrf/staff')).json();
  await page.request.patch('/api/staff/preferences', { data: { preferredLanguage: language }, headers: { 'X-CSRF-Token': csrf, Origin: 'http://127.0.0.1:5177' } });
  await page.addInitScript(lang => localStorage.setItem('tinzel_language', lang), language);
}
for (const language of ['en', 'sw']) test(`sign-in error recovers through saved form into a real private draft in ${language}`, async ({ page }, info) => {
  await login(page, language);
  if (language === 'sw') await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/staff/forms');
  await page.getByRole('button', { name: language === 'en' ? 'Import Google Form' : /Ingiza.*Google/ }).click();
  await page.getByLabel(language === 'en' ? 'Google Form link' : 'Kiungo cha Google Form', { exact: true }).fill('https://forms.gle/example');
  await page.route('**/api/admin/forms/import-google', route => route.fulfill({ status: 422, json: { errorCode: 'GOOGLE_FORM_SIGN_IN_REQUIRED', message: 'Google requires sign-in' } }));
  await page.getByRole('button', { name: language === 'en' ? 'Import as Draft' : 'Ingiza kama rasimu', exact: true }).click();
  const warning = page.locator('.tinzel-state.is-warning');
  await expect(warning).toContainText(language === 'en' ? 'This Google Form needs sign-in' : 'Google Form hii inahitaji kuingia');
  await expect(warning).toContainText('HTML Only');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath(`google-sign-in-${language}.png`), fullPage: true });
  await page.unroute('**/api/admin/forms/import-google');
  const html = process.env.TINZEL_GOOGLE_FORM_TEST_FILE ? fs.readFileSync(process.env.TINZEL_GOOGLE_FORM_TEST_FILE, 'utf8') : sampleHtml;
  const definition = extractSavedGoogleForm(html);
  await page.getByLabel(language === 'en' ? 'Saved Google Form (.html, up to 5 MB)' : 'Google Form iliyohifadhiwa (.html, hadi MB 5)').setInputFiles({ name: 'saved-form.html', mimeType: 'text/html', buffer: Buffer.from(html) });
  const response = page.waitForResponse(r => r.url().endsWith('/api/admin/forms/import-google'));
  await page.getByRole('button', { name: language === 'en' ? 'Import saved form' : 'Ingiza fomu iliyohifadhiwa', exact: true }).click();
  const imported = await response;
  expect(imported.status()).toBe(201);
  const sent = imported.request().postDataJSON();
  expect(sent.formData).toEqual(definition);
  expect(sent.html).toBeUndefined();
  expect(JSON.stringify(sent)).not.toMatch(/must-stay-local|unsent answer/);
  const { form, warnings } = await imported.json();
  expect(form.isActive).toBe(false);
  expect(form.fields).toHaveLength(definition[1][1].length);
  expect(form.fields.some(field => field.type === 'photo_group')).toBe(true);
  expect(form.fields.some(field => field.type === 'date')).toBe(true);
  expect(warnings.some(w => /photo limits/.test(w))).toBe(true);
  await expect(page.locator('.edition-editor')).toBeVisible();
  await expect(page.locator('[data-edition-title]')).toHaveValue(form.title);
  const saved = await (await page.request.get('/api/admin/forms')).json();
  expect(saved.forms.find(item => item._id === form._id).fields).toHaveLength(form.fields.length);
  expect((await page.request.get(`/api/public/forms/${form.slug}`)).status()).toBe(404);
  await page.screenshot({ path: info.outputPath(`google-imported-${language}.png`), fullPage: true });
});
