import React from 'react';
import { ActionButton } from './SoftFlutter';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import StatePanel from './StatePanel';
import { useInterfaceText } from '../../i18n/InterfaceText';
export function Button({ variant = '', className = '', ...props }) {
  return <ActionButton type="button" className={`ui-button ${variant ? `is-${variant}` : ''} ${className}`} {...props} />;
}
export function Feedback({ kind = 'info', title, children }) {
  const tx = useInterfaceText();
  const Icon = kind === 'error' ? AlertCircle : kind === 'success' ? CheckCircle2 : Info;
  return (
    <div className={`ui-feedback is-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon size={20} aria-hidden="true" />
      <div>
        <strong>{tx(title)}</strong>
        {children && <div>{tx(children)}</div>}
      </div>
    </div>
  );
}
export function EmptyState({ title, description, children }) {
  return <StatePanel title={title} description={description}>{children}</StatePanel>;
}
class Boundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}
export function PageBoundary({ children }) {
  const { lang } = useLanguage();
  return (
    <Boundary
      fallback={
        <div className="ui-error-boundary">
          <StatePanel kind="error" title={lang === 'sw' ? 'Ukurasa haujafunguka' : 'This page could not open'} description={lang === 'sw' ? 'Fungua ukurasa upya ili kujaribu tena. Mabadiliko ambayo hayajahifadhiwa yanaweza kupotea.' : 'Reload to try again. Changes that have not been saved may be lost.'} onRetry={() => window.location.reload()} retryLabel={lang === 'sw' ? 'Fungua upya' : 'Reload page'}>
            <a className="ui-button" href={window.location.pathname.startsWith('/staff') ? '/staff' : '/'}>{lang === 'sw' ? 'Rudi mwanzo' : 'Return home'}</a>
          </StatePanel>
        </div>
      }
    >
      {children}
    </Boundary>
  );
}
export function tabListKeys(event) {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
  const tabs = [...event.currentTarget.querySelectorAll('[role="tab"]')],
    index = tabs.indexOf(document.activeElement);
  if (index < 0) return;
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  event.preventDefault();
  tabs[next].focus();
  tabs[next].click();
}
