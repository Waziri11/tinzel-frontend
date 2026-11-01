import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import TinzelLogo from '../common/TinzelLogo';
export default function LanguageSelect() {
  const { setLang } = useLanguage();
  return (
    <section style={{ width: 'min(520px,100%)' }}>
      <TinzelLogo variant="full" height={48} />
      <div style={{ margin: '48px 0 28px' }}>
        <span className="ui-eyebrow">Karibu · Welcome</span>
        <h1 className="ui-title">Choose your language</h1>
        <p className="ui-description">Chagua lugha yako. You can change this at any time.</p>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {[
          ['English', 'EN', 'en'],
          ['Kiswahili', 'SW', 'sw'],
        ].map(([label, code, lang]) => (
          <button className="language-card" key={lang} onClick={() => setLang(lang)}>
            <span>{label}</span>
            <span>{code}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
