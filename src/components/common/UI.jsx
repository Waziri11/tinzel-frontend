import React from 'react';
import { ActionButton } from './SoftFlutter';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
export function Button({ variant = '', className = '', ...props }) {
  return <ActionButton type="button" className={`ui-button ${variant ? `is-${variant}` : ''} ${className}`} {...props} />;
}
export function Feedback({ kind = 'info', title, children }) {
  const Icon = kind === 'error' ? AlertCircle : kind === 'success' ? CheckCircle2 : Info;
  return (
    <div className={`ui-feedback is-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon size={20} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}
export function EmptyState({ title, description, children }) {
  return (
    <section className="ui-empty">
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  );
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
          <Feedback kind="error" title={lang === 'sw' ? 'Ukurasa haujafunguka' : 'This page could not open'}>
            {lang === 'sw'
              ? 'Jaribu kufungua ukurasa tena. Taarifa zilizohifadhiwa zitabaki.'
              : 'Reload to try again. Saved information will remain available.'}
          </Feedback>
          <Button onClick={() => window.location.reload()}>{lang === 'sw' ? 'Jaribu tena' : 'Reload page'}</Button>
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
