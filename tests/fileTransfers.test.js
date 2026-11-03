import test from 'node:test';
import assert from 'node:assert/strict';
import { readDownload, runTransfer, getTransfers, dismissTransfer, cancelTransfer, clearTransfers } from '../src/services/fileTransfers.js';
import { uploadMultipart } from '../src/services/uploadTransport.js';

const streamResponse = (chunks, headers = {}) => new Response(new ReadableStream({ start(controller) { chunks.forEach(chunk => controller.enqueue(new Uint8Array(chunk))); controller.close(); } }), { headers });
test('downloads report received bytes and never claim completion before the stream ends', async () => {
  const seen = [];
  const blob = await readDownload(streamResponse([[1,2], [3,4]], { 'content-length': '4' }), { progress: value => seen.push(value) });
  assert.equal(blob.size, 4);
  assert.equal(seen.at(-1).bytes, 4);
  assert.equal(seen.at(-1).percent, 99);
  assert(seen.every(value => value.percent < 100));
});
test('unknown and encoded response lengths never invent a percentage', async () => {
  for (const headers of [{}, { 'content-length': '2', 'content-encoding': 'gzip' }]) {
    const seen = [];
    await readDownload(streamResponse([[1,2,3,4]], headers), { progress: value => seen.push(value) });
    assert(seen.every(value => value.percent === null));
    assert.equal(seen.at(-1).bytes, 4);
  }
});
test('HTTP errors and truncated downloads fail instead of producing a complete file', async () => {
  await assert.rejects(readDownload(new Response('{"message":"Access expired"}', { status: 403 }), { progress() {} }), /Access expired/);
  await assert.rejects(readDownload(streamResponse([[1]], { 'content-length': '5' }), { progress() {} }), /interrupted/);
});
test('one transfer per key survives subscriptions, and cancellation is not completion', async () => {
  let release;
  const first = runTransfer({ key: 'test-dedupe', name: 'test.pdf' }, ({ signal }) => new Promise((resolve, reject) => {
    release = resolve; signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  const same = runTransfer({ key: 'test-dedupe', name: 'test.pdf' }, () => { throw new Error('duplicate'); });
  assert.equal(first, same);
  await Promise.resolve();
  const job = getTransfers().at(-1);
  cancelTransfer(job.id);
  await assert.rejects(first, { name: 'AbortError' });
  assert.equal(getTransfers().at(-1).stage, 'cancelled');
  dismissTransfer(job.id);
  assert.equal(getTransfers().length, 0);
});
test('upload transport keeps authentication, caps byte progress, and waits for the response', async () => {
  const events = [], headers = {};
  let xhr;
  const request = uploadMultipart('/api/file', new FormData(), { headers: { 'X-CSRF-Token': 'test-token' }, progress: value => events.push(value), xhrFactory: () => (xhr = {
    upload: {}, open() {}, setRequestHeader(k,v) { headers[k] = v; }, send() {}, getResponseHeader() { return 'application/json'; },
  }) });
  assert.equal(xhr.withCredentials, true);
  assert.equal(headers['X-CSRF-Token'], 'test-token');
  xhr.upload.onprogress({ loaded: 10, total: 10, lengthComputable: true });
  assert.equal(events.at(-1).percent, 99);
  xhr.upload.onload();
  assert.equal(events.at(-1).stage, 'finalizing');
  assert.equal(events.at(-1).percent, null);
  xhr.status = 201; xhr.responseText = '{"saved":true}'; xhr.onload(); xhr.onloadend();
  assert.equal((await request).status, 201);
  assert.equal(events.some(event => event.stage === 'complete'), false);
});

test('clearing a session removes transfer details and cancels pending work', async () => {
  let called = false;
  const pending = runTransfer({ key: 'old-session', name: 'private.pdf' }, async () => { called = true; });
  clearTransfers();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(called, false);
  assert.deepEqual(getTransfers(), []);
});
