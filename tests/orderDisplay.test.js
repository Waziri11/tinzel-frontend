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

import { orderSenderName, staffOrderText } from '../src/utils/orderDisplay.js';
test('staff labels use sender names and never fall back to internal references', () => {
 assert.equal(orderSenderName({clientName:' Asha Mushi ',trackingId:'TNZ-2026-1'}),'Asha Mushi');
 assert.equal(orderSenderName({clientName:' ',trackingId:'TNZ-2026-1',_id:'internal'},'Mteja asiye na jina'),'Mteja asiye na jina');
});
test('historical staff notifications replace order references and hide raw staff links', () => {
 const order={clientName:'Asha $& Mushi',trackingId:'TNZ-2026-1',submissionId:'SUB-2026-1',_id:'507f1f77bcf86cd799439011'};
 const text=staffOrderText(`Tracking ID: ${order.trackingId}\nSubmission ID: ${order.submissionId}\n${order._id}\nhttps://tinzel.gifts/staff/design/orders/${order._id}\nVersion 2, TZS 50000, receipt PAY-123`,order);
 assert.match(text,/Asha \$& Mushi/);
 assert.doesNotMatch(text,/TNZ-|SUB-|507f1f|https:/);
 assert.match(text,/Version 2, TZS 50000, receipt PAY-123/);
 assert.equal(staffOrderText('Order TNZ-OLD-123 ready'), 'Order  ready');
});
