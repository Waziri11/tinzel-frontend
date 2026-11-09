import { useEffect, useRef } from 'react';
const isVisible = element => element.getClientRects().length > 0 && !['hidden', 'collapse'].includes(window.getComputedStyle(element).visibility);
const topDialog = () => [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter(isVisible).at(-1);
// Custom dialogs get the same keyboard containment and focus return as Ant Design dialogs.
export function useDialogFocus(open, onClose) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    // Capture this opening's visible dialog now. Closed Ant Design dialogs stay
    // mounted, and a later animation frame must not switch to another dialog.
    const dialog = topDialog();
    if (!dialog) return;
    const focusable = () =>
      [
        ...dialog.querySelectorAll(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
        ),
      ].filter(isVisible);
    const frame = requestAnimationFrame(() => {
      if (dialog === topDialog()) {
        dialog.tabIndex = -1;
        // A tap or autofill may already have focused a field before this frame.
        if (!dialog.contains(document.activeElement)) (focusable()[0] || dialog).focus();
      }
    });
    const key = (event) => {
      if (dialog !== topDialog()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close.current?.();
      }
      if (event.key === 'Tab') {
        const items = focusable(),
          first = items[0],
          last = items.at(-1);
        if (!items.length) {
          event.preventDefault();
          dialog.focus();
        } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', key, true);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [Boolean(open)]);
}
