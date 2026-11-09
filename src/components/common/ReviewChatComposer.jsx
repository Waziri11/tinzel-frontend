import React from 'react';
import { ArrowUp, MessageSquare, X } from 'lucide-react';
import { ActionButton } from './SoftFlutter';
import './pdfBookReader.css';

// Shared contents for the anchored page-comment widget and whole-magazine feedback.
export default function ReviewChatComposer({ title, cancelLabel, onCancel, cancelDisabled, quote, inputRef,
  value, onChange, inputLabel, placeholder, maxLength = 4000, disabled, attachments, children,
  footer, submitLabel, submitting, submitDisabled }) {
  return <>
    <div className="proof-composer-heading">
      <span className="proof-comment-symbol"><MessageSquare size={18} aria-hidden="true" /></span>
      <strong>{title}</strong>
      <button type="button" className="proof-chat-icon" aria-label={cancelLabel} title={cancelLabel} disabled={cancelDisabled}
        onClick={onCancel}><X size={19} aria-hidden="true" /></button>
    </div>
    <div className="proof-composer-body">
      {quote && <blockquote>{quote}</blockquote>}
      <div className="proof-chat-message">
        <textarea ref={inputRef} aria-label={inputLabel} value={value} onChange={onChange} disabled={disabled}
          maxLength={maxLength} placeholder={placeholder} />
        {attachments}
      </div>
      {children}
    </div>
    <div className="proof-composer-actions">
      {footer}
      <ActionButton className="proof-chat-send" type="submit" aria-label={submitLabel} title={submitLabel} loading={submitting} disabled={submitDisabled}>
        <ArrowUp size={22} aria-hidden="true" />
      </ActionButton>
    </div>
  </>;
}
