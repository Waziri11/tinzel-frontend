import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';

export default function ProofMobilePanel({ title, closeLabel, onClose, closeDisabled = false, children }) {
  const backdrop = useRef(null);
  const close = () => { if (!closeDisabled) onClose(); };
  useDialogFocus(true, close);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const fit = () => {
      backdrop.current?.style.setProperty('--panel-keyboard-offset', `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`);
      backdrop.current?.style.setProperty('--panel-visible-height', `${viewport.height}px`);
    };
    fit();
    viewport.addEventListener('resize', fit);
    viewport.addEventListener('scroll', fit);
    return () => {
      viewport.removeEventListener('resize', fit);
      viewport.removeEventListener('scroll', fit);
    };
  }, []);
  return (
    <div ref={backdrop} className="proof-mobile-backdrop" onClick={close}>
      <section className="proof-mobile-panel" role="dialog" aria-modal="true" aria-label={title}
        onClick={event => event.stopPropagation()}>
        <header className="proof-mobile-panel-heading">
          <strong>{title}</strong>
          <button type="button" aria-label={closeLabel} disabled={closeDisabled} onClick={close}><X size={20} aria-hidden="true" /></button>
        </header>
        {children}
      </section>
    </div>
  );
}
