import test from 'node:test';
import assert from 'node:assert/strict';
import { workingMilliseconds, expressCountdown, compareExpressPriority } from '../src/utils/expressOrder.js';
const order = { isExpress: true, status: 'in_design', expressStartedAt: '2026-11-07T10:00:00+03:00', expressDueAt: '2026-11-09T10:00:00+03:00' };
test('countdown pauses for the whole Tanzanian Sunday and resumes on Monday', () => {
  assert.deepEqual(expressCountdown(order, order.expressStartedAt), { state: 'active', hours: 24, minutes: 0, paused: false });
  for (const now of ['2026-11-08T00:00:00+03:00', '2026-11-08T15:30:00+03:00', '2026-11-08T23:59:59+03:00']) {
    assert.deepEqual(expressCountdown(order, now), { state: 'active', hours: 10, minutes: 0, paused: true });
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
