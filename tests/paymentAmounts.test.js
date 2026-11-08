import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentAmounts } from '../src/utils/paymentAmounts.js';
test('standard and express totals show half up front and preserve the remaining balance', () => {
  assert.deepEqual(paymentAmounts(50000), { total: 50000, deposit: 25000, balance: 25000 });
  assert.deepEqual(paymentAmounts(70000), { total: 70000, deposit: 35000, balance: 35000 });
  assert.deepEqual(paymentAmounts(50001), { total: 50001, deposit: 25001, balance: 25000 });
  for (const total of [null, undefined, '', -1, 'invalid']) assert.equal(paymentAmounts(total), null);
});
