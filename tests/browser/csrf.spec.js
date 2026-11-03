import { test, expect } from '@playwright/test';
import { securityLogin } from './security-login.js';
async function login(context, request) {
  const value = await securityLogin(request, 'designer');
  await context.addCookies([{ name: 'tinzel_staff', value, url: 'http://127.0.0.1:5177', httpOnly: true, sameSite: 'Strict' }]);
}
test('cold browser session restores CSRF for concurrent writes; a forged request is rejected', async ({ page, context, request }) => {
  await login(context, request); await page.goto('/staff/login');
  const lookups = [];
  page.on('request', r => { if (r.url().endsWith('/api/csrf/staff')) lookups.push(r); });
  const result = await page.evaluate(async () => {
    const forged = await fetch('/api/staff/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferredLanguage: 'sw' }) });
    const { api } = await import('/src/services/api.js');
    const saved = await Promise.all([api.staffAuth.setPreferences('cookie', 'en'), api.staffAuth.setPreferences('cookie', 'en')]);
    return { forged: forged.status, error: (await forged.json()).errorCode, saved };
  });
  expect(result.forged).toBe(403); expect(result.error).toBe('CSRF_TOKEN_INVALID'); expect(result.saved.every(r => r.success)).toBe(true); expect(lookups).toHaveLength(1);
});
test('another-tab login is recovered once for fetch and binary-upload transport', async ({ page, context, request }) => {
  await login(context, request); await page.goto('/staff/login');
  await page.evaluate(async () => { const { ensureCsrfToken } = await import('/src/services/api.js'); await ensureCsrfToken(); });
  await login(context, request);
  const results = [];
  page.on('response', r => { if (r.url().endsWith('/api/staff/preferences') || r.url().includes('/draft-uploads/missing/complete')) results.push(r.status()); });
  await page.evaluate(async () => { const { api } = await import('/src/services/api.js'); await api.staffAuth.setPreferences('cookie', 'en'); });
  expect(results).toEqual([403, 200]);
  await login(context, request);
  const status = await page.evaluate(async () => {
    const { submitDraftUpload } = await import('/src/services/draftUpload.js');
    try { await submitDraftUpload({ token: 'cookie', staffId: 'test', orderId: '000000000000000000000000', uploadId: 'missing', confirmedCorrectionIds: [] }); }
    catch (error) { return error.status; }
  });
  expect(status).toBe(404); expect(results).toEqual([403, 200, 403, 404]);
});
test('photo-folder preparation uses the shared authenticated transport and logout clears the server session', async ({ page, context, request }) => {
  await login(context, request); await page.goto('/staff/login');
  let sent;
  await page.route('**/api/designer/orders/test/photo-folder-download', async route => {
    sent = await route.request().allHeaders();
    await route.fulfill({ json: { state: 'ready', url: '/api/media-download/test' } });
  });
  await page.evaluate(async () => { const { api } = await import('/src/services/api.js'); await api.designer.downloadPhotoFolder('cookie', 'test', 'Photos'); });
  expect(sent['x-csrf-token']).toMatch(/^[a-f0-9]{48}$/); expect(sent.cookie).toContain('tinzel_staff=');
  const result = await page.evaluate(async () => { const { api, securityHeaders } = await import('/src/services/api.js'); await api.staffAuth.logout('cookie'); return { headers: securityHeaders(), status: (await fetch('/api/staff/me')).status }; });
  expect(result).toEqual({ headers: {}, status: 401 });
});
