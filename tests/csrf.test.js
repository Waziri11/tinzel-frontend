import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCsrfTransport } from '../src/services/csrf.js';
const token = 'a'.repeat(48), fresh = 'b'.repeat(48);
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
function setup(handler) {
  const calls = [];
  const transport = createCsrfTransport({ origin: 'https://app.test', apiBase: 'https://api.test', fetcher: async (url, options) => { calls.push({ url, ...options }); return handler(url, options, calls); } });
  return { ...transport, calls };
}
test('first write after reload bootstraps the token and preserves body, signal and Headers', async () => {
  const client = setup(url => json(url.includes('/csrf/') ? { csrf: token } : { success: true }));
  const body = new FormData(); body.append('file', new Blob(['PDF']), 'test.pdf');
  const signal = new AbortController().signal;
  await client.send('https://api.test/api/designer/orders/1/upload-draft', { method: 'POST', headers: new Headers({ 'X-Test': 'kept' }), body, signal });
  assert.equal(client.calls.length, 2);
  assert.equal(client.calls[0].url, 'https://api.test/api/csrf/staff');
  const sent = client.calls[1]; assert.equal(sent.headers.get('X-CSRF-Token'), token); assert.equal(sent.headers.get('X-Test'), 'kept');
  assert.equal(sent.credentials, 'include'); assert.equal(sent.body, body); assert.equal(sent.signal, signal); assert.equal(sent.headers.has('Content-Type'), false);
});
test('successful login and restored profile supply isolated tokens for staff and clients', async () => {
  const client = setup(url => json({ csrf: url.includes('/client/') ? fresh : token }));
  await client.send('https://api.test/api/staff/login', { method: 'POST' });
  await client.send('https://api.test/api/client/order');
  assert.equal(client.calls.length, 2); assert.deepEqual(client.headers(), { 'X-CSRF-Token': token }); assert.deepEqual(client.headers('client'), { 'X-CSRF-Token': fresh });
  await client.send('https://api.test/api/proofs/client/order/1/annotations', { method: 'POST' });
  assert.equal(client.calls.at(-1).headers.get('X-CSRF-Token'), fresh);
});
test('parallel writes share one bootstrap and recover stale tokens only once', async () => {
  let lookups = 0;
  const client = setup(async (url, options) => {
    if (url.includes('/csrf/')) { lookups++; await new Promise(r => setTimeout(r, 10)); return json({ csrf: lookups === 1 ? token : fresh }); }
    return options.headers.get('X-CSRF-Token') === fresh ? json({ success: true }) : json({ errorCode: 'CSRF_TOKEN_INVALID' }, 403);
  });
  const responses = await Promise.all([1, 2, 3].map(() => client.send('https://api.test/api/staff/preferences', { method: 'PATCH' })));
  assert.ok(responses.every(r => r.ok)); assert.equal(lookups, 2);
});
test('persistent CSRF rejection retries once; origin and unrelated failures never replay mutations', async () => {
  for (const code of ['CSRF_TOKEN_INVALID', 'CSRF_ORIGIN_INVALID', 'OTP_REQUIRED', 'FORBIDDEN']) {
    let writes = 0;
    const client = setup(url => url.includes('/csrf/') ? json({ csrf: token }) : (++writes, json({ errorCode: code }, 403)));
    assert.equal((await client.send('https://api.test/api/staff/profile', { method: 'PATCH' })).status, 403);
    assert.equal(writes, code === 'CSRF_TOKEN_INVALID' ? 2 : 1);
  }
});
test('tokens never reach public uploads, lookalike paths or third-party origins', async () => {
  const client = setup(() => json({ csrf: token })); await client.ensureToken();
  for (const url of ['https://external.test/api/staff/profile', 'https://api.test/api/public/media/sessions', 'https://api.test/api/client-evil']) {
    await client.send(url, { method: 'POST', headers: { 'X-CSRF-Token': token } });
    assert.equal(client.calls.at(-1).headers.has('X-CSRF-Token'), false);
  }
});
test('logout and authentication failures clear cached tokens; bearer-only requests need no bootstrap', async () => {
  const client = setup(url => url.includes('/csrf/') ? json({ csrf: token }) : json({ success: true }));
  await client.send('https://api.test/api/staff/profile', { method: 'PATCH', headers: { Authorization: 'Bearer explicit-token' } });
  assert.equal(client.calls.length, 1);
  await client.ensureToken(); await client.send('https://api.test/api/staff/logout', { method: 'POST' }); assert.deepEqual(client.headers(), {});
  const denied = setup(url => url.includes('/csrf/') ? json({ csrf: token }) : json({}, 401));
  await denied.ensureToken(); await denied.send('https://api.test/api/staff/me'); assert.deepEqual(denied.headers(), {});
});
test('failed bootstrap sends no mutation; cancelling one caller leaves shared bootstrap usable', async () => {
  const failed = setup(() => json({ message: 'Session expired' }, 401));
  await assert.rejects(failed.send('https://api.test/api/staff/logout', { method: 'POST' }), e => e.status === 401); assert.equal(failed.calls.length, 1);
  const client = setup(async () => { await new Promise(r => setTimeout(r, 10)); return json({ csrf: token }); });
  const controller = new AbortController();
  const cancelled = client.ensureToken('staff', { signal: controller.signal });
  const retained = client.ensureToken(); controller.abort();
  await assert.rejects(cancelled, e => e.name === 'AbortError'); assert.equal(await retained, token); assert.equal(client.calls.length, 1);
});
