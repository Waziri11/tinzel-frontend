import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hideSubmissionReference } from '../src/utils/orderDisplay.js';

test('historical notices hide temporary IDs while keeping names, tracking numbers and action links', () => {
  for (const label of ['Temporary Submission ID', 'Submission ID', 'Namba ya Muda ya Uwasilishaji', 'Namba ya Mawasilisho']) {
    const text = hideSubmissionReference(`Christine Christoph\n${label}: SUB-2026-ABC123\nTNZ-2026-42\nhttps://tinzel.gifts/staff/pre-design?orderId=abc123`);
    assert.doesNotMatch(text, /SUB-|Submission ID|Namba ya/);
    assert.match(text, /Christine Christoph/);
    assert.match(text, /TNZ-2026-42/);
    assert.match(text, /orderId=abc123/);
  }
  assert.equal(hideSubmissionReference('Order (SUB-2026-abcdef) received').includes('SUB-'), false);
  assert.equal(hideSubmissionReference(null), '');
});
