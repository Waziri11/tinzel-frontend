import StatePanel from './StatePanel';
import { useLanguage, localized, localizedList } from '../../i18n/LanguageContext';
import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { listAnswerItems } from '../../utils/listAnswers';
import './orderAnswersView.css';

const normalizeAnswers = (submittedData) => {
  if (typeof submittedData !== 'string') return submittedData;
  try {
    return JSON.parse(submittedData);
  } catch {
    return submittedData;
  }
};

const displayValue = (value, lang = 'en') => {
  const empty = lang === 'sw' ? 'Jibu halijatolewa' : 'No answer provided';
  if (value === null || value === undefined || value === '') return empty;
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => displayValue(item, lang)).join(', ') : empty;
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${displayValue(item, lang)}`)
      .join(' · ');
  }
  if (typeof value === 'boolean') return value ? (lang === 'sw' ? 'Ndiyo' : 'Yes') : (lang === 'sw' ? 'Hapana' : 'No');
  return String(value);
};

export default function OrderAnswersView({ submittedData, submittedFields = [], formFields = [], collapseLongAnswers = false }) {
  const { lang } = useLanguage();
  const [expandedField, setExpandedField] = useState(null);
  const answerId = useId();
  const answers = normalizeAnswers(submittedData);
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    if (!answers) return <StatePanel compact title={lang === 'sw' ? 'Hakuna majibu yaliyoandikwa' : 'No written answers'} description={lang === 'sw' ? 'Mteja hajawasilisha majibu ya maandishi kwa oda hii.' : 'No written answers were submitted for this order.'} />;
    return <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{displayValue(answers, lang)}</p>;
  }

  const definitions = submittedFields.length ? submittedFields : formFields;
  const labels = new Map(definitions.map((field) => [field.fieldId, field]));
  const entries = Object.entries(answers).sort(([first], [second]) => {
    const firstOrder = labels.get(first)?.order ?? Number.MAX_SAFE_INTEGER;
    const secondOrder = labels.get(second)?.order ?? Number.MAX_SAFE_INTEGER;
    return firstOrder - secondOrder;
  });

  if (entries.length === 0) {
    return <StatePanel compact title={lang === 'sw' ? 'Hakuna majibu yaliyoandikwa' : 'No written answers'} description={lang === 'sw' ? 'Majibu yataonekana hapa baada ya kuwasilishwa.' : 'Submitted answers will appear here.'} />;
  }

  return (
    <dl className={collapseLongAnswers ? 'order-answers order-answers--collapsible' : 'order-answers'} style={{ margin: 0, display: 'grid', gap: collapseLongAnswers ? 0 : '10px' }}>
      {entries.map(([fieldId, value], index) => {
        const field = labels.get(fieldId);
        const listItems = field?.type === 'list' ? listAnswerItems(value) : null;
        const label = localized(field, 'label', lang) ||
          (fieldId.startsWith('field_') ? `${lang === 'sw' ? 'Swali' : 'Question'} ${index + 1}` : fieldId.replace(/[_-]/g, ' '));
        const formatted = displayValue((() => {
          if (lang !== 'sw' || !field?.options?.length) return value;
          const translated = localizedList(field, 'options', lang);
          const option = (v) => translated[field.options.indexOf(v)] || v;
          return Array.isArray(value)
            ? value.map(option)
            : typeof value === 'object' && value
              ? Object.fromEntries(
                  Object.entries(value).map(([row, v]) => [
                    localizedList(field, 'rows', lang)[field.rows?.indexOf(row)] || row,
                    Array.isArray(v) ? v.map(option) : option(v),
                  ]),
                )
              : option(value);
        })(), lang);
        const collapsible = !listItems && collapseLongAnswers && typeof value === 'string' &&
          (formatted.length > 180 || formatted.trim().split('\n').length > 2);
        const expanded = expandedField === fieldId;
        const preview = formatted.replace(/\s+/g, ' ').trim();
        const contentId = `${answerId}-${index}`;
        return (
        <div
          key={fieldId}
          className={collapseLongAnswers ? 'order-answers__row' : undefined}
          style={collapseLongAnswers ? undefined : { padding: '10px 12px', border: '1px solid #E7E5E4', borderRadius: '6px', backgroundColor: '#FFFFFF' }}
        >
          <dt style={{ fontSize: '12px', fontWeight: '700', color: '#78716C', marginBottom: '4px' }}>
            {collapsible ? <button type="button" className="order-answers__toggle" id={`${contentId}-toggle`} aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpandedField(current => current === fieldId ? null : fieldId)}>
              <span>{label}</span>
              <span className="order-answers__toggle-label">{expanded ? (lang === 'sw' ? 'Ficha jibu' : 'Hide answer') : (lang === 'sw' ? 'Soma jibu' : 'Read answer')}</span>
              <ChevronDown size={18} aria-hidden="true" />
            </button> : label}
          </dt>
          <dd
            style={{ margin: 0, fontSize: '14px', color: '#1C1917', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
          >
            {listItems ? (listItems.length ? <ol className="order-answers__list" aria-label={label}>
              {listItems.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
            </ol> : displayValue([], lang)) : collapsible ? <>
              {!expanded && <span className="order-answers__excerpt" aria-hidden="true">{preview.length > 140 ? `${preview.slice(0, 140).trimEnd()}…` : preview}</span>}
              <div id={contentId} role="region" aria-labelledby={`${contentId}-toggle`} hidden={!expanded}>{formatted}</div>
            </> : formatted}
          </dd>
        </div>
        );
      })}
    </dl>
  );
}
