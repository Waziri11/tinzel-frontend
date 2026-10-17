import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import TinzelLogo from '../common/TinzelLogo';

function LanguageCard({ label, code, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        height: '200px',
        backgroundColor: hovered ? '#C5A059' : '#FFFFFF',
        border: '2px solid #C5A059',
        outline: '1px solid #D4AF37',
        outlineOffset: '-10px',
        borderRadius: '14px',
        color: hovered ? '#FFFFFF' : '#C5A059',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 14px 30px rgba(197, 160, 89, 0.28)' : '0 4px 14px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.25s ease',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
          fontStyle: 'italic',
          fontSize: '40px',
          fontWeight: '600',
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '2px' }}>{code}</span>
    </button>
  );
}

export default function LanguageSelect() {
  const { setLang } = useLanguage();

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 0 60px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
        <TinzelLogo variant="full" height={56} />
      </div>

      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
            fontSize: '48px',
            fontWeight: '600',
            color: '#1C1917',
            margin: '0 0 8px 0',
            lineHeight: 1.2,
          }}
        >
          Choose your language
        </h1>
        <p style={{ fontSize: '18px', color: '#78716C', margin: 0 }}>Chagua lugha yako</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '28px' }}>
        <LanguageCard label="English" code="EN" onClick={() => setLang('en')} />
        <LanguageCard label="Kiswahili" code="SW" onClick={() => setLang('sw')} />
      </div>
    </div>
  );
}
