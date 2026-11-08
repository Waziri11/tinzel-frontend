import butterfly from '../../assets/brand/tinzel-butterfly.svg';
import React, { Children, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import './loading.css';

/** Lightweight butterfly motion, with the same static mark when motion is reduced. */
export default function SoftFlutter({ size = 24, className = '' }) {
  return <span className={`soft-flutter ${className}`} style={{ '--flutter-size': `${size}px`, '--flutter-image': `url(${butterfly})` }} aria-hidden="true" />;
}

export function InlineLoading({ children, size = 28, className = '' }) {
  const { lang } = useLanguage();
  return <span className={`inline-loading ${className}`} role="status" aria-live="polite">
    <SoftFlutter size={size} />{children || (lang === 'sw' ? 'Inapakia…' : 'Loading…')}
  </span>;
}

/** Preserves native button/form semantics and locks promise-returning actions. */
export function ActionButton({ loading = false, disabled, children, onClick, loadingLabel, className = '', style, ...props }) {
  const [pending, setPending] = useState(false);
  const [initiated, setInitiated] = useState(false);
  const [dimensions, setDimensions] = useState(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!initiated || loading || pending) return;
    // Implicit Enter submission follows the click's native default action.
    // Clear idle clicks on the next task, after a real submission can start.
    const timer = setTimeout(() => setInitiated(false), 0);
    return () => clearTimeout(timer);
  }, [loading, pending, initiated]);
  // A shared request may disable several controls; animate only its initiating action.
  const busy = pending || (loading && initiated);
  const hasIndicator = Children.toArray(children).some(child => child?.type === SoftFlutter);
  const click = async event => {
    if (lock.current || loading || pending) { event.preventDefault(); return; }
    const bounds = event.currentTarget.getBoundingClientRect();
    setDimensions({ width: bounds.width, height: bounds.height });
    setInitiated(true);
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
  return <button {...props} className={`action-button ${className}`} style={{ ...style, ...(busy && dimensions ? { width: dimensions.width, minHeight: dimensions.height, maxWidth: '100%', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: style?.justifyContent || 'center' } : {}) }} disabled={disabled || loading || pending} aria-busy={busy || undefined} onClick={click}>
    {busy && !hasIndicator && <SoftFlutter size={dimensions?.width < 40 ? Math.max(10, dimensions.width - 8) : 20} />}<span className="action-button__label">{busy && loadingLabel ? loadingLabel : children}</span>
  </button>;
}
