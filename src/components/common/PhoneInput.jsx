import React, { useId } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { normalizePhone } from '../../utils/phone';

export default function PhoneInput({ as: Input = 'input', onChange, onBlur, ...props }) {
  const { lang } = useLanguage();
  const helpId = useId();
  const hint = lang === 'sw'
    ? 'Namba za Tanzania hubadilishwa kuwa +255. Kwa nchi nyingine, weka msimbo wa nchi (mfano +254).'
    : 'Local numbers use +255. For another country, include its country code (for example +254).';
  return <>
    <Input {...props} type="tel" aria-describedby={[props['aria-describedby'], helpId].filter(Boolean).join(' ')}
      onChange={onChange}
      onBlur={event => {
        const canonical = normalizePhone(event.target.value);
        if (canonical && canonical !== event.target.value && !props.readOnly) {
          event.target.value = canonical;
          onChange?.(event);
        }
        onBlur?.(event);
      }} />
    <small id={helpId} aria-hidden="true" style={{ display: 'block', marginTop: 4, fontSize: 12, fontWeight: 400, lineHeight: 1.5 }}>{hint}</small>
  </>;
}
