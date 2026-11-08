import React from 'react';
import { AlertCircle, Check, Inbox, Info, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { requestState } from '../../i18n/stateMessages';
import { useInterfaceText } from '../../i18n/InterfaceText';
import TinzelLogo from './TinzelLogo';
import { ActionButton } from './SoftFlutter';
import SoftFlutter from './SoftFlutter';
import './states.css';

const icons = { empty: Inbox, error: AlertCircle, warning: ShieldAlert, success: Check, info: Info };
export default function StatePanel({ kind = 'empty', title, description, onRetry, retryLabel, children, compact = false, className = '' }) {
  const { lang } = useLanguage();
  const tx = useInterfaceText();
  const Icon = icons[kind] || Info;
  return <section className={`tinzel-state is-${kind} ${compact ? 'is-compact' : ''} ${className}`} data-state={kind} aria-busy={kind === 'loading' || undefined}>
    <div className="tinzel-state__symbol" aria-hidden="true">
      {kind === 'loading' ? <SoftFlutter size={40} /> : <><TinzelLogo variant="icon" height={38} alt="" /><span><Icon size={15} /></span></>}
    </div>
    <div className="tinzel-state__body">
      <div role={kind === 'error' ? 'alert' : 'status'} aria-live={kind === 'error' ? 'assertive' : 'polite'} aria-atomic="true">
        {title && <h2>{tx(title)}</h2>}
        {description && <div className="tinzel-state__description">{tx(description)}</div>}
      </div>
      {(onRetry || children) && <div className="tinzel-state__actions">
        {onRetry && <ActionButton type="button" className="ui-button is-primary" onClick={onRetry}>{retryLabel || (lang === 'sw' ? 'Jaribu tena' : 'Try again')}</ActionButton>}
        {children}
      </div>}
    </div>
  </section>;
}

export function StateError({ error, onRetry, title, description, children, compact = true, retryLabel }) {
  const { lang } = useLanguage();
  const state = requestState(error, lang);
  return <StatePanel {...state} title={title || state.title} description={description || state.description} onRetry={onRetry} retryLabel={retryLabel} compact={compact}>{children}</StatePanel>;
}
