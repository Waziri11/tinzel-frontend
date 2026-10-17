import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PhotoUploadQueue, checkSelection } from '../src/utils/photoUploadQueue.js';

test('rapid batches and submit share two slots; completed files are not repeated', async () => {
  let active = 0, peak = 0, count = 0;
  const queue = new PhotoUploadQueue(async (item) => {
    active++; count++; peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 2)); active--;
    return { assetId: item.id };
  });
  for (let n = 0; n < 100; n++) queue.add({ id: String(n) }, {});
  assert.equal((await queue.wait()).length, 100);
  queue.add({ id: '0' }, {});
  await queue.wait();
  assert.equal(count, 100); assert.equal(peak, 2);
  assert.ok([...queue.tasks.values()].every((i) => !i.file));
});
test('failed file can be retried without repeating successful files', async () => {
  const calls = [];
  const queue = new PhotoUploadQueue(async ({ id }) => {
    calls.push(id); if (id === 'b' && calls.filter((i) => i === 'b').length === 1) throw new Error('offline');
    return { assetId: id };
  });
  queue.add({ id: 'a' }, {}); queue.add({ id: 'b' }, {});
  await assert.rejects(queue.wait(), /attention/); queue.retry('b');
  await queue.wait(); assert.deepEqual(calls, ['a', 'b', 'b']);
});
test('removed active file never returns to the queue and slots recover', async () => {
  const queue = new PhotoUploadQueue(async ({ id }, signal) => {
    if (id === 'a') await new Promise((resolve, reject) => { signal.addEventListener('abort', () => reject(new Error('cancelled'))); });
    return { assetId: id };
  }, { concurrency: 1 });
  queue.add({ id: 'a' }, {}); queue.add({ id: 'b' }, {});
  await new Promise((r) => setTimeout(r, 0)); queue.remove('a');
  assert.deepEqual(await queue.wait(), [{ assetId: 'b' }]);
});
test('restored pending files request reselection; completed files remain usable', async () => {
  const queue = new PhotoUploadQueue(async ({ id }) => ({ assetId: id }));
  queue.restore([{ id: 'a', photo: { assetId: 'a' } }, { id: 'b', state: 'uploading' }]);
  await assert.rejects(queue.wait(), /attention/);
  queue.add({ id: 'b' }, {}); assert.equal((await queue.wait()).length, 2);
});
test('selection applies single-field and total byte limits before upload', () => {
  const limits = { maxFiles: 10, maxFileBytes: 100, maxTotalBytes: 150 };
  assert.throws(() => checkSelection([{ fieldId: 'p', size: 1 }], { fieldId: 'p', type: 'photo_upload' }, [{ size: 1 }], limits), /at most 1/);
  assert.throws(() => checkSelection([], { fieldId: 'p' }, [{ size: 80 }, { size: 80 }], limits), /capacity/);
});
