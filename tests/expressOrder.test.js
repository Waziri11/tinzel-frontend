import test from 'node:test';
import assert from 'node:assert/strict';
import { workingMilliseconds, expressCountdown, orderCountdown, compareExpressPriority } from '../src/utils/expressOrder.js';
const order = { isExpress: true, status: 'in_design', expressStartedAt: '2026-11-07T10:00:00+03:00', expressDueAt: '2026-11-09T10:00:00+03:00' };
test('standard has its own 72-hour clock with Sunday pause, completion, pending and overdue states', () => {
  const standard = { isExpress: false, standardStartedAt: '2026-11-06T10:00:00+03:00', standardDueAt: '2026-11-10T10:00:00+03:00' };
  assert.equal(orderCountdown(standard, standard.standardStartedAt).hours, 72);
  for (const now of ['2026-11-08T00:00:00+03:00', '2026-11-08T23:59:59+03:00']) {
    assert.deepEqual(orderCountdown(standard, now), { state: 'active', hours: 34, minutes: 0, seconds: 0, paused: true, resumesAt: Date.parse('2026-11-09T00:00:00+03:00') });
  }
  assert.deepEqual(orderCountdown(standard, '2026-11-09T00:00:01+03:00'), { state: 'active', hours: 33, minutes: 59, seconds: 59, paused: false });
  assert.equal(orderCountdown(standard, '2026-11-10T10:00:01+03:00').state, 'overdue');
  assert.equal(orderCountdown({}).state, 'pending');
  assert.equal(orderCountdown({ ...standard, orderStatus: 'delivered' }).state, 'complete');
  assert.equal(orderCountdown(null), null);
});
test('countdown pauses for the whole Tanzanian Sunday and resumes on Monday', () => {
  assert.deepEqual(expressCountdown(order, order.expressStartedAt), { state: 'active', hours: 24, minutes: 0, seconds: 0, paused: false });
  for (const now of ['2026-11-08T00:00:00+03:00', '2026-11-08T15:30:00+03:00', '2026-11-08T23:59:59+03:00']) {
    assert.deepEqual(expressCountdown(order, now), { state: 'active', hours: 10, minutes: 0, seconds: 0, paused: true, resumesAt: Date.parse('2026-11-09T00:00:00+03:00') });
  }
  assert.equal(expressCountdown(order, '2026-11-09T09:00:00+03:00').hours, 1);
  assert.equal(expressCountdown(order, order.expressDueAt).state, 'overdue');
  assert.equal(expressCountdown(order, '2026-11-09T11:00:00+03:00').hours, 1);
  assert.equal(expressCountdown({ ...order, status: 'delivered' }).state, 'complete');
  assert.equal(expressCountdown({ ...order, status: 'closed' }).state, 'complete');
  assert.equal(expressCountdown({ isExpress: true }).state, 'pending');
  assert.equal(expressCountdown({ isExpress: false }), null);
});
test('overdue durations exclude intervening Sundays and priority preserves express deadlines', () => {
  assert.equal(workingMilliseconds('2026-11-09T10:00:00+03:00', '2026-11-23T10:00:00+03:00'), 12 * 24 * 3600000);
  const standard = { isExpress: false }, later = { ...order, expressDueAt: '2026-11-10T10:00:00+03:00' };
  assert.deepEqual([standard, later, order].sort(compareExpressPriority), [order, later, standard]);
  assert.equal(compareExpressPriority({}, standard), 0);
});

test('countdown changes each second and resumes at Tanzania midnight without resetting its deadline', () => {
  assert.deepEqual(expressCountdown(order, '2026-11-09T00:00:01+03:00'), { state: 'active', hours: 9, minutes: 59, seconds: 59, paused: false });
  assert.deepEqual(expressCountdown(order, '2026-11-09T00:00:02+03:00'), { state: 'active', hours: 9, minutes: 59, seconds: 58, paused: false });
  assert.deepEqual(expressCountdown(order, '2026-11-09T10:00:01+03:00'), { state: 'overdue', hours: 0, minutes: 0, seconds: 1, paused: false });
});
