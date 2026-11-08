import test from 'node:test';
import assert from 'node:assert/strict';
import { requestState } from '../src/i18n/stateMessages.js';

test('failure recovery distinguishes missing content, access, conflict, throttling and service failure in both languages', () => {
  const cases = [[404, 'unavailable', 'hayapatikani'], [401, 'Verify', 'Thibitisha'], [403, 'not available', 'hairuhusiwi'], [409, 'changed', 'zimebadilika'], [429, 'wait', 'subiri'], [503, 'could not', 'Hatukuweza']];
  for (const [status, en, sw] of cases) {
    assert.ok(requestState({ status }, 'en').title.includes(en));
    assert.ok(requestState({ status }, 'sw').title.includes(sw));
  }
  assert.equal(requestState({ status: 503, message: 'private provider internal error' }, 'sw').description.includes('private'), false);
});

test('expired verification code is actionable rather than a generic expired session', () => {
  assert.equal(requestState({ status: 401, code: 'OTP_EXPIRED' }, 'en').title, 'This code has expired');
  assert.equal(requestState({ status: 401, code: 'INVALID_CODE' }, 'sw').title, 'Hakiki msimbo wa uthibitishaji');
  assert.match(requestState({ status: 504 }, 'en').description, /saved result/);
});
