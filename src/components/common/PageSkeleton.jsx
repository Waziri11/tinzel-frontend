import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import './pageSkeleton.css';
import TinzelLogo from './TinzelLogo';
import './states.css';

function Block({ className = '' }) {
  return <span className={`page-skeleton__block ${className}`} />;
}

export default function PageSkeleton({ variant = 'table', title, compact = false }) {
  const { lang } = useLanguage();
  const label = title || (lang === 'sw' ? 'Inapakia maudhui…' : 'Loading content…');
  const cards = variant === 'catalogue' || variant === 'board';
  const form = variant === 'form' || variant === 'detail';
  return (
    <section className={`page-skeleton ${compact ? 'page-skeleton--compact' : ''}`} aria-busy="true" aria-label={label}>
      <div className="page-skeleton__brand" role="status"><TinzelLogo variant="icon" height={24} alt="" /><span>{label}</span></div>
      <div aria-hidden="true">
        {!compact && <div className="page-skeleton__heading"><Block className="is-title" /><Block className="is-subtitle" /></div>}
        {variant === 'dashboard' && <div className="page-skeleton__summary">
          {[0, 1, 2, 3].map(index => <div className="page-skeleton__card" key={index}><Block className="is-title" /><Block /><Block className="is-subtitle" /></div>)}
        </div>}
        {cards ? (
          <div className={`page-skeleton__grid is-${variant}`}>
            {Array.from({ length: variant === 'catalogue' ? 3 : 4 }, (_, index) => (
              <div className="page-skeleton__card" key={index}>
                <Block className={variant === 'catalogue' ? 'is-cover' : 'is-title'} />
                {variant === 'board' ? [0, 1, 2].map((row) => <Block className="is-order" key={row} />)
                  : <><Block /><Block className="is-subtitle" /><Block className="is-field" /></>}
              </div>
            ))}
          </div>
        ) : form ? (
          <div className="page-skeleton__panel">
            <Block className="is-title" />
            {Array.from({ length: variant === 'detail' ? 6 : 4 }, (_, index) => (
              <div className="page-skeleton__field" key={index}><Block className="is-label" /><Block className="is-field" /></div>
            ))}
          </div>
        ) : (
          <div className="page-skeleton__panel">
            <Block className="is-toolbar" />
            {Array.from({ length: 6 }, (_, index) => (
              <div className="page-skeleton__row" key={index}><Block /><Block /><Block /><Block /></div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
