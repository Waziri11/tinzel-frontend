import test from 'node:test';
import assert from 'node:assert/strict';
import { customerJourney, customerChangeStatusKey } from '../src/utils/customerJourney.js';
import { trackingTranslations } from '../src/i18n/trackingTranslations.js';

test('every order stage has customer wording and a next-step explanation in both languages', () => {
  const statuses = ['awaiting_payment', 'payment_verified', 'queued_for_assignment', 'assigned', 'in_design', 'draft_manager_review', 'client_review', 'revision_requested', 'client_approved', 'print_document_prep', 'print_manager_review', 'printing_sent', 'printing_in_progress', 'printing_completed', 'dispatched', 'delivered', 'closed', 'on_hold'];
  for (const status of statuses) {
    const journey = customerJourney({ status });
    assert.notEqual(journey.statusKey, 'track.status.unknown', status);
    for (const lang of ['en', 'sw']) for (const key of [journey.statusKey, journey.detailKey]) {
      assert.ok(trackingTranslations[key]?.[lang], `${status}: ${lang}`);
      assert.doesNotMatch(trackingTranslations[key][lang], /assigned|manager|conveyor|approval loop|print document|meneja|kupangiwa/i);
    }
  }
});

test('payment, requested changes, and delivery progress reflect what the customer is waiting for', () => {
  assert.equal(customerJourney({ status: 'awaiting_payment' }).stage, 1);
  assert.equal(customerJourney({ status: 'revision_requested' }).stage, 2);
  assert.equal(customerJourney({ status: 'printing_completed' }).stage, 5);
  assert.equal(customerJourney({ status: 'dispatched' }).complete, false);
  assert.equal(customerJourney({ status: 'delivered' }).complete, true);
  assert.equal(customerJourney({ status: 'closed' }).complete, true);
  assert.equal(customerJourney({ status: 'on_hold', previousStatusBeforeHold: 'printing_in_progress' }).stage, 4);
});

test('active customer changes stay visible after work resumes and unknown states never leak raw codes', () => {
  for (const status of ['in_design', 'draft_manager_review']) {
    assert.equal(customerJourney({ status, revisionRequests: [{ status: 'open' }] }).statusKey, 'track.status.revision_requested');
    assert.equal(customerJourney({ status, revisionRequests: [{ source: 'manager', status: 'open' }] }).statusKey, `track.status.${status}`);
    assert.equal(customerJourney({ status, revisionRequests: [{ status: 'resolved' }] }).statusKey, `track.status.${status}`);
  }
  assert.equal(customerJourney({ status: 'internal_new_stage' }).statusKey, 'track.status.unknown');
  assert.equal(customerChangeStatusKey('new_internal_stage'), 'track.changes.unknown');
});
