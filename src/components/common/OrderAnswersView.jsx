import StatePanel from './StatePanel';
import InterfaceText from '../../i18n/InterfaceText';
import { useLanguage, localized, localizedList } from '../../i18n/LanguageContext';
import React from 'react';

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

export default function OrderAnswersView({ submittedData, submittedFields = [], formFields = [] }) {
  const { lang } = useLanguage();
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
    <dl style={{ margin: 0, display: 'grid', gap: '10px' }}>
      {entries.map(([fieldId, value], index) => (
        <div
          key={fieldId}
          style={{ padding: '10px 12px', border: '1px solid #E7E5E4', borderRadius: '6px', backgroundColor: '#FFFFFF' }}
        >
          <dt style={{ fontSize: '12px', fontWeight: '700', color: '#78716C', marginBottom: '4px' }}>
            {localized(labels.get(fieldId), 'label', lang) ||
              (fieldId.startsWith('field_') ? `${lang === 'sw' ? 'Swali' : 'Question'} ${index + 1}` : fieldId.replace(/[_-]/g, ' '))}
          </dt>
          <dd
            style={{ margin: 0, fontSize: '14px', color: '#1C1917', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
          >
            {displayValue(
              (() => {
                const field = labels.get(fieldId);
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
              })(), lang,
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
