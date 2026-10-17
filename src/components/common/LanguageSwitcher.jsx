import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

/** Small EN / SW toggle shown in headers so visitors can switch language later. */
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();
  const active = lang || 'en';

  const pill = (code, label) => (
    <button
      type="button"
      onClick={() => setLang(code)}
      aria-pressed={active === code}
      style={{
        padding: '6px 12px',
        border: 'none',
        backgroundColor: active === code ? '#C5A059' : '#FFFFFF',
        color: active === code ? '#FFFFFF' : '#1C1917',
        fontSize: '12px',
        fontWeight: '700',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      role="group"
      aria-label={t('lang.change')}
      style={{ display: 'inline-flex', border: '1px solid #C5A059', borderRadius: '6px', overflow: 'hidden' }}
    >
      {pill('en', 'EN')}
      {pill('sw', 'SW')}
    </div>
  );
}
