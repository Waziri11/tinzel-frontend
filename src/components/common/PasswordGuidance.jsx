import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
export function passwordReady(value) { return [...value].length >= 8 && new TextEncoder().encode(value).length <= 72; }
export default function PasswordGuidance({ value }) {
  const { lang } = useLanguage(), sw = lang === 'sw';
  const ready = passwordReady(value);
  return <div className="password-guidance"><p>{sw ? 'Tumia angalau herufi 8. Jaribu maneno kadhaa yasiyohusiana; nafasi zinaruhusiwa. Usitumie nenosiri la akaunti nyingine.' : 'Use at least 8 characters. Try several unrelated words; spaces are welcome. Use a password unique to this account.'}</p>
    {value && <p role="status">{new TextEncoder().encode(value).length > 72 ? (sw ? 'Nenosiri ni refu sana; tumia hadi baiti 72.' : 'Too long; use at most 72 bytes.') : ready ? (sw ? 'Urefu unatosha. Usalama wa nenosiri utakaguliwa unapohifadhi.' : 'Length requirement met. Known breached passwords are checked when you save.') : (sw ? 'Ongeza maneno ili kufikisha herufi 8.' : 'Add more words to reach 8 characters.')}</p>}</div>;
}
