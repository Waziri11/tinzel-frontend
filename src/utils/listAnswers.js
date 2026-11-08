// Drafts keep empty rows while editing; review and submission contain written items only.
export function listAnswerItems(value) {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return items.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean);
}

export function normalizeListAnswers(fields, answers) {
  const normalized = { ...answers };
  for (const field of fields || []) {
    if (field.type === 'list' && Object.hasOwn(normalized, field.fieldId)) {
      normalized[field.fieldId] = listAnswerItems(normalized[field.fieldId]);
    }
  }
  return normalized;
}
