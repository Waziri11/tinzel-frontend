import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftQueue } from '../src/services/backgroundDraftQueue.js';
const tick = () => new Promise(resolve => setImmediate(resolve));
const input = (orderId = 'one') => ({ staffId: 'designer', token: 'test', orderId, file: { name: `${orderId}.pdf` }, metadata: { expectedVersion: 1 } });

test('page subscription can unmount while upload continues; jobs run sequentially and duplicates are blocked', async () => {
  const runs = [];
  const queue = createDraftQueue({ transfer: args => new Promise(resolve => runs.push({ ...args, resolve })), cancelSaved: async () => {} });
  let updates = 0;
  const unsubscribe = queue.subscribe(() => updates++);
  queue.enqueue(input());
  assert.throws(() => queue.enqueue(input()), /already has an upload/);
  queue.enqueue(input('two'));
  unsubscribe();
  const before = updates;
  runs[0].onProgress({ percent: 60 });
  assert.equal(updates, before);
  assert.equal(runs[0].signal.aborted, false);
  assert.equal(queue.getSnapshot()[0].progress.percent, 60);
  assert.equal(queue.getSnapshot()[1].status, 'queued');
  runs[0].resolve({ version: 2 }); await tick();
  assert.equal(runs.length, 2);
  runs[1].resolve({ version: 2 }); await tick();
  assert.deepEqual(queue.getSnapshot().map(job => job.status), ['complete', 'complete']);
  assert.equal(queue.hasActive(), false);
});

test('retry retains the original file and metadata; corrected drafts stop at ready', async () => {
  const calls = [];
  const queue = createDraftQueue({ transfer: async args => { calls.push(args); if (calls.length === 1) throw new Error('Offline'); return { id: 'saved', readyForReview: true }; }, cancelSaved: async () => {} });
  const original = { ...input(), deferSubmission: true };
  const id = queue.enqueue(original); await tick();
  assert.equal(queue.getSnapshot()[0].status, 'error');
  queue.retry(id); await tick();
  assert.equal(calls[1].file, original.file);
  assert.deepEqual(calls[1].metadata, original.metadata);
  assert.equal(queue.getSnapshot()[0].status, 'ready');
  queue.finishReview('one');
  assert.equal(queue.getSnapshot()[0].status, 'complete');
});

test('cancellation waits for transfer to stop before deleting its saved session or starting another upload', async () => {
  const events = [];
  const queue = createDraftQueue({ transfer: ({ orderId, signal }) => new Promise((resolve, reject) => {
    events.push(`start:${orderId}`);
    signal.addEventListener('abort', () => { events.push('aborted'); reject(new DOMException('Cancelled', 'AbortError')); });
  }), cancelSaved: async () => { events.push('deleted'); } });
  const id = queue.enqueue(input()); queue.enqueue(input('two'));
  await queue.cancel(id);
  assert.deepEqual(events, ['start:one', 'aborted', 'deleted', 'start:two']);
  assert.equal(queue.getSnapshot().length, 1);
  queue.reset();
});

test('finalizing cannot be canceled; resetting for another account aborts and clears old work', async () => {
  let current, deletes = 0;
  const queue = createDraftQueue({ transfer: args => new Promise(resolve => { current = { ...args, resolve }; }), cancelSaved: async () => { deletes++; } });
  const id = queue.enqueue(input());
  current.onProgress({ stage: 'finalizing', percent: 99 });
  await queue.cancel(id);
  assert.equal(deletes, 0);
  assert.equal(current.signal.aborted, false);
  queue.setOwner('another-designer');
  assert.equal(current.signal.aborted, true);
  current.resolve({ version: 2 }); await tick();
  assert.deepEqual(queue.getSnapshot(), []);
});
