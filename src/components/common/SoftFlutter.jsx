import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import './loading.css';

/** Frames from the approved SoftFlutter clip, shared by every loading control. */
export default function SoftFlutter({ size = 24, className = '' }) {
  return <span className={`soft-flutter ${className}`} style={{ '--flutter-size': `${size}px` }} aria-hidden="true" />;
}

export function InlineLoading({ children, size = 28, className = '' }) {
  const { lang } = useLanguage();
  return <span className={`inline-loading ${className}`} role="status" aria-live="polite">
    <SoftFlutter size={size} />{children || (lang === 'sw' ? 'Inapakia…' : 'Loading…')}
  </span>;
}

/** Preserves native button/form semantics and locks promise-returning actions. */
export function ActionButton({ loading = false, disabled, children, onClick, loadingLabel, className = '', ...props }) {
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const busy = loading || pending;
  const click = async event => {
    if (lock.current || busy) { event.preventDefault(); return; }
    const result = onClick?.(event);
    if (result && typeof result.then === 'function') {
      lock.current = true;
      setPending(true);
      try { await result; } finally {
        lock.current = false;
        if (mounted.current) setPending(false);
      }
    }
  };
  return <button {...props} className={`action-button ${className}`} disabled={disabled || busy} aria-busy={busy || undefined} onClick={click}>
    {busy && <SoftFlutter />}{busy && loadingLabel ? loadingLabel : children}
  </button>;
}
