import React from 'react';
import { ActionButton } from '../common/SoftFlutter';
import { useLanguage } from '../../i18n/LanguageContext';

export default function PaymentOptionsSettings({ value, onChange, onSave, busy, disabled, feedback }) {
  const { isSwahili } = useLanguage();
  const t = (en, sw) => isSwahili ? sw : en;
  const options = Array.isArray(value) ? value : [];
  const update = (index, key, next) => onChange(options.map((option, i) => i === index ? { ...option, [key]: next } : option));
  const move = (index, offset) => {
    const next = [...options];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  };
  return <article className="system-settings-card" style={{ gridColumn: '1 / -1' }}>
    <h3>{t('Payment options', 'Njia za malipo')}</h3>
    <p>{t('Customers see enabled options after submitting any magazine. Add the provider or bank name, payment number, account name and instructions.', 'Wateja huona njia zilizowashwa baada ya kuwasilisha jarida lolote. Ongeza jina la mtoa huduma au benki, namba ya malipo, jina la akaunti na maelekezo.')}</p>
    {value === undefined && <p>{t('Until you save here, existing forms keep their previous payment details.', 'Hadi uhifadhi hapa, fomu zilizopo zitaendelea kutumia taarifa zao za awali za malipo.')}</p>}
    <form onSubmit={event => { event.preventDefault(); onSave(); }}>
      <fieldset disabled={disabled || busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
        {options.map((option, index) => <fieldset key={option.id} style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 16, marginBottom: 16, minWidth: 0 }}>
          <legend>{t('Payment option', 'Njia ya malipo')} {index + 1}</legend>
          <div className="system-payment-fields">
          <div>
          <label htmlFor={`payment-type-${option.id}`}>{t('Payment type', 'Aina ya malipo')}</label>
            <select id={`payment-type-${option.id}`} value={option.type} onChange={event => update(index, 'type', event.target.value)}>
              <option value="till">Lipa Namba</option>
              <option value="mobile">{t('Mobile money', 'Pesa kwa simu')}</option>
              <option value="bank">{t('Bank transfer', 'Uhamisho wa benki')}</option>
              <option value="other">{t('Other', 'Nyingine')}</option>
            </select>
          </div>
          {[
            ['name', 'Provider / bank name', 'Jina la mtoa huduma / benki', 120],
            ['nameSw', 'Display name in Kiswahili (optional)', 'Jina la kuonyesha kwa Kiswahili (si lazima)', 120],
            ['number', 'Till / phone / account number', 'Lipa Namba / simu / namba ya akaunti', 120],
            ['accountName', 'Account name', 'Jina la akaunti', 160],
            ['instructions', 'Payment instructions', 'Maelekezo ya malipo', 2000],
            ['instructionsSw', 'Instructions in Kiswahili (optional)', 'Maelekezo kwa Kiswahili (si lazima)', 2000],
          ].map(([key, en, sw, maxLength]) => <label key={key}>
            {t(en, sw)}
            {key.startsWith('instructions')
              ? <textarea required={!key.endsWith('Sw')} maxLength={maxLength} rows={3} value={option[key] || ''} onChange={event => update(index, key, event.target.value)} />
              : <input type="text" required={!key.endsWith('Sw')} maxLength={maxLength} value={option[key] || ''} onChange={event => update(index, key, event.target.value)} />}
          </label>)}
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={option.enabled} onChange={event => update(index, 'enabled', event.target.checked)} />
            {t('Show to customers', 'Onyesha kwa wateja')}
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="ui-button" disabled={index === 0} onClick={() => move(index, -1)}>{t('Move up', 'Sogeza juu')}</button>
            <button type="button" className="ui-button" disabled={index === options.length - 1} onClick={() => move(index, 1)}>{t('Move down', 'Sogeza chini')}</button>
            <button type="button" className="ui-button" onClick={() => onChange(options.filter((_, i) => i !== index))}>{t('Remove option', 'Ondoa njia')}</button>
          </div>
        </fieldset>)}
        {!options.some(option => option.enabled) && <p>{t('Saving with no enabled options shows customers that payment details are currently unavailable.', 'Kuhifadhi bila njia iliyowashwa huwaonyesha wateja kuwa taarifa za malipo hazipatikani kwa sasa.')}</p>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="ui-button" disabled={options.length >= 20} onClick={() => onChange([...options, { id: crypto.randomUUID(), type: 'till', name: '', nameSw: '', number: '', accountName: '', instructions: '', instructionsSw: '', enabled: true }])}>{t('Add payment option', 'Ongeza njia ya malipo')}</button>
          <ActionButton className="ui-button is-primary" loading={busy}>{t('Save payment options', 'Hifadhi njia za malipo')}</ActionButton>
        </div>
      </fieldset>
      {feedback}
    </form>
  </article>;
}
