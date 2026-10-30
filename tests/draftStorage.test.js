import test from 'node:test';
import assert from 'node:assert/strict';

test('personal drafts: respect 24-hour expiration TTL and handle structured storage', () => {
  const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  const storage = new Map();

  const mockLocalStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, val) => storage.set(key, String(val)),
    removeItem: (key) => storage.delete(key),
  };

  const loadDraft = (slug, now = Date.now()) => {
    const draftKey = 'tinzel:answers:v2:' + slug;
    const raw = mockLocalStorage.getItem(draftKey);
    if (!raw) return { draft: {}, hasSavedDraft: false };
    try {
      const parsed = JSON.parse(raw);
      const savedAt = parsed?.savedAt;
      const data = parsed?.data || parsed || {};
      if (savedAt && (now - savedAt > DRAFT_MAX_AGE_MS)) {
        mockLocalStorage.removeItem(draftKey);
        return { draft: {}, hasSavedDraft: false };
      }
      const hasContent = Boolean(data.clientName || data.clientWhatsApp || data.clientEmail || (data.answers && Object.keys(data.answers).length > 0));
      return { draft: data, hasSavedDraft: hasContent };
    } catch {
      return { draft: {}, hasSavedDraft: false };
    }
  };

  const saveDraft = (slug, { clientName, clientWhatsApp, clientEmail, answers }, now = Date.now()) => {
    const draftKey = 'tinzel:answers:v2:' + slug;
    const hasContent = Boolean(clientName || clientWhatsApp || clientEmail || Object.keys(answers || {}).length > 0);
    if (hasContent) {
      mockLocalStorage.setItem(draftKey, JSON.stringify({
        savedAt: now,
        data: { clientName, clientWhatsApp, clientEmail, answers },
      }));
    } else {
      mockLocalStorage.removeItem(draftKey);
    }
  };

  const now = Date.parse('2026-10-30T12:00:00Z');

  // 1. Fresh draft saves and loads
  saveDraft('wedding-mag', { clientName: 'Amani', clientWhatsApp: '0712345678', answers: { theme: 'Gold' } }, now);
  const loadedFresh = loadDraft('wedding-mag', now + 3600 * 1000); // 1 hour later
  assert.equal(loadedFresh.hasSavedDraft, true);
  assert.equal(loadedFresh.draft.clientName, 'Amani');
  assert.equal(loadedFresh.draft.answers.theme, 'Gold');

  // 2. Draft older than 24 hours is automatically purged
  const loadedExpired = loadDraft('wedding-mag', now + (25 * 3600 * 1000)); // 25 hours later
  assert.equal(loadedExpired.hasSavedDraft, false);
  assert.deepEqual(loadedExpired.draft, {});
  assert.equal(mockLocalStorage.getItem('tinzel:answers:v2:wedding-mag'), null);

  // 3. Legacy unversioned draft fallback works gracefully
  mockLocalStorage.setItem('tinzel:answers:v2:legacy-mag', JSON.stringify({ clientName: 'Baraka', answers: {} }));
  const loadedLegacy = loadDraft('legacy-mag', now);
  assert.equal(loadedLegacy.hasSavedDraft, true);
  assert.equal(loadedLegacy.draft.clientName, 'Baraka');

  // 4. Empty draft clears storage
  saveDraft('empty-mag', { clientName: '', clientWhatsApp: '', answers: {} }, now);
  assert.equal(mockLocalStorage.getItem('tinzel:answers:v2:empty-mag'), null);
});
