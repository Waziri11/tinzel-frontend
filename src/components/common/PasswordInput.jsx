import React, { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import './password-input.css';

export default function PasswordInput({ id, disabled, style, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);
  const { lang } = useLanguage();
  const toggleLabel = lang === 'sw'
    ? (visible ? 'Ficha nenosiri' : 'Onyesha nenosiri')
    : (visible ? 'Hide password' : 'Show password');

  return (
    <span className="password-input">
      <input
        {...props}
        id={inputId}
        disabled={disabled}
        type={visible ? 'text' : 'password'}
        style={{ ...style, paddingRight: 52 }}
      />
      <button
        type="button"
        className="password-input-toggle"
        disabled={disabled}
        aria-label={toggleLabel}
        aria-controls={inputId}
        title={toggleLabel}
        onClick={() => setVisible(value => !value)}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </span>
  );
}
