import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uploadSummary, uploadIsStalled, formatUploadBytes } from '../src/utils/uploadProgress.js';

test('overall progress is weighted by bytes, not by the number of files', () => {
  const summary = uploadSummary([{ size: 100, state: 'complete' }, { size: 900, state: 'uploading', progress: 50 }]);
  assert.equal(summary.percent, 55); assert.equal(summary.sentBytes, 550); assert.equal(summary.done, 1);
});
test('only confirmed files produce ready and 100 percent', () => {
  assert.equal(uploadSummary([{ size: 100, state: 'uploading', progress: 100 }]).percent, 99);
  assert.equal(uploadSummary([{ size: 100, state: 'complete' }]).percent, 100);
  assert.equal(uploadSummary([]).ready, false);
  assert.equal(uploadSummary([{ size: 100, state: 'failed', progress: 20 }]).attention.length, 1);
  assert.equal(uploadSummary([{ size: 100, state: 'needs_file' }]).attention.length, 1);
});
test('slow-transfer notice requires all active files to stop progressing for 20 seconds', () => {
  assert.equal(uploadIsStalled([], 30000), false);
  assert.equal(uploadIsStalled([{ lastProgressAt: 10000 }], 29999), false);
  assert.equal(uploadIsStalled([{ lastProgressAt: 10000 }], 30000), true);
  assert.equal(uploadIsStalled([{ lastProgressAt: 10000 }, { lastProgressAt: 29000 }], 30000), false);
  assert.equal(uploadIsStalled([{}], 30000), false);
});
test('byte labels use consistent binary units', () => {
  assert.equal(formatUploadBytes(1024), '1 KiB');
  assert.equal(formatUploadBytes(1048576), '1.0 MiB');
});
