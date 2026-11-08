import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractSavedGoogleForm, MAX_GOOGLE_FORM_FILE_BYTES } from '../src/utils/googleFormsImport.js';

const question = [1, 'Your name &quot; [test]', 'A \\"quote', 0, [[11, null, 1]]];
const data = ['private-metadata', ['Description', [question], 'account-info'], null, 'A &amp; B', 'other-data'];
test('saved Google Form extracts only definition data without executing or sending the page', () => {
  const html = `<script>throw new Error('do not run');</script><input value="unsent answer"><script>var FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify(data)}; privateCredential = 'not-for-upload';</script>`;
  const result = extractSavedGoogleForm(html);
  assert.deepEqual(result, [null, ['Description', [question]], null, 'A &amp; B']);
  assert.doesNotMatch(JSON.stringify(result), /private|credential|unsent|account-info|other-data/i);
});
test('saved form rejects login pages, malformed data and oversized files', () => {
  for (const html of ['<html>Sign in</html>', 'FB_PUBLIC_LOAD_DATA_ = [', 'FB_PUBLIC_LOAD_DATA_ = [null, ["", []]];', 'FB_PUBLIC_LOAD_DATA_ = [null, ["", [null]]];']) {
    assert.throws(() => extractSavedGoogleForm(html), error => error.code === 'GOOGLE_FORM_INVALID_FILE');
  }
  assert.throws(() => extractSavedGoogleForm('x'.repeat(MAX_GOOGLE_FORM_FILE_BYTES + 1)), error => error.code === 'GOOGLE_FORM_FILE_TOO_LARGE');
});
