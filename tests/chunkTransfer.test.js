import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { encodeUploadPart, transferChunks, hashBytes } from '../src/services/chunkTransfer.js';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
test('lossless transport compression restores every byte and skips incompressible files', async () => {
  const bytes = Buffer.from('Original PDF colours, fonts and images\n'.repeat(12000));
  const encoded = await encodeUploadPart(new Blob([bytes]));
  assert.equal(encoded.headers['Content-Encoding'], 'gzip');
  assert.deepEqual(gunzipSync(Buffer.from(await encoded.body.arrayBuffer())), bytes);
  const random = new Blob([randomBytes(256 * 1024)]);
  const skipped = await encodeUploadPart(random);
  assert.equal(skipped.body, random);
  assert.deepEqual(skipped.headers, {});
  assert.equal((await encodeUploadPart(new Blob([bytes]), { enabled: false })).headers['Content-Encoding'], undefined);
});
test('parallel uploads share four slots, verify resumed parts, and finish with exact bytes', async () => {
  let active = 0, peak = 0;
  const data = randomBytes(512 * 1024 + 17), file = new Blob([data]), size = 65536;
  const received = [{ n: 0, sha256: await hashBytes(data.subarray(0, size)) }];
  const run = async () => {
    const stored = new Map([[0, data.subarray(0, size)]]), updates = [];
    await transferChunks({ file, chunkBytes: size, received, concurrency: 3,
      onProgress: value => updates.push(value.bytes),
      send: async ({ n, body, progress, sha256 }) => {
        active++; peak = Math.max(peak, active); await pause(5);
        const bytes = Buffer.from(await body.arrayBuffer()); assert.equal(await hashBytes(bytes), sha256);
        progress(body.size); stored.set(n, bytes); active--;
      },
    });
    assert.deepEqual(Buffer.concat([...stored].sort((a,b) => a[0]-b[0]).map(([,b]) => b)), data);
    assert.equal(updates.at(-1), file.size); assert.ok(updates.every(n => n <= file.size));
  };
  await Promise.all([run(), run()]); assert.equal(peak, 4);
  await assert.rejects(transferChunks({ file, chunkBytes: size, received: [{ n: 0, sha256: 'wrong' }], send: async () => {} }), /differs/);
});
test('a failed part aborts siblings and releases queued slots for subsequent uploads', async () => {
  let completed = 0;
  await assert.rejects(transferChunks({ file: new Blob([randomBytes(1024)]), chunkBytes: 128, concurrency: 4,
    send: async ({ n, signal }) => {
      if (n === 0) throw new Error('transfer failed');
      await new Promise((resolve, reject) => { const timer = setTimeout(resolve, 100); signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true }); }); completed++;
    },
  }), /transfer failed/);
  assert.equal(completed, 0);
  await transferChunks({ file: new Blob(['new file']), chunkBytes: 4, send: async () => { completed++; } });
  assert.equal(completed, 2);
});
test('batched transfers skip saved parts, verify their hashes, and preserve every byte', async () => {
  const size = 65536, data = Buffer.alloc(size * 14 + 37, 32), stored = new Map(), sent = [];
  for (const n of [1, 5]) stored.set(n, data.subarray(n * size, (n + 1) * size));
  const received = await Promise.all([...stored].map(async ([n, bytes]) => ({ n, sha256: await hashBytes(bytes) })));
  await transferChunks({ file: new Blob([data]), chunkBytes: size, batchParts: 3, concurrency: 4, received, compression: true,
    send: async ({ n, count, body, sha256, headers }) => {
      const wire = Buffer.from(await body.arrayBuffer()), bytes = headers['Content-Encoding'] === 'gzip' ? gunzipSync(wire) : wire; assert.equal(await hashBytes(bytes), sha256);
      assert.ok(count <= 3); sent.push({ n, count });
      for (let i = 0; i < count; i++) { assert.ok(!stored.has(n + i)); stored.set(n + i, bytes.subarray(i * size, (i + 1) * size)); }
    },
  });
  assert.ok(sent.some(part => part.count === 3)); assert.equal(sent.length, 5);
  assert.deepEqual(Buffer.concat([...stored].sort((a,b) => a[0]-b[0]).map(([,b]) => b)), data);
  await assert.rejects(transferChunks({ file: new Blob([data]), chunkBytes: size, batchParts: 3,
    received: [{ n: 0, sha256: 'changed' }], send: async () => {} }), /differs/);
});
test('incompressible batches split back into small parallel requests', async () => {
  const size = 65536, data = randomBytes(size * 15 + 17), stored = [], sent = [];let active = 0, peak = 0;
  await transferChunks({ file: new Blob([data]), chunkBytes: size, batchParts: 3, concurrency: 4, compression: true,
    send: async ({ n, count, body }) => { assert.equal(count,1);active++;peak=Math.max(peak,active);await pause(5);stored[n]=Buffer.from(await body.arrayBuffer());sent.push(n);active--; },
  });
  assert.equal(sent.length,16);assert.equal(new Set(sent).size,16);assert.equal(peak,4);assert.deepEqual(Buffer.concat(stored),data);
});
