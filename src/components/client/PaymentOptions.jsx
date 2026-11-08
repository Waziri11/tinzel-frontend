import React, { useId, useState } from 'react';
import { Copy } from 'lucide-react';
import { ActionButton } from '../common/SoftFlutter';
import { useLanguage } from '../../i18n/LanguageContext';
import StatePanel from '../common/StatePanel';
import { navigate } from '../../navigation/location';

export default function PaymentOptions({ paymentOptions, lipaNambaInstructions, compact = false }) {
  const { isSwahili, t } = useLanguage();
  const [copied, setCopied] = useState(null);
  const [copyError, setCopyError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const selectId = useId();
  const options = (Array.isArray(paymentOptions) ? paymentOptions : lipaNambaInstructions?.tillNumber ? [{
    id: 'legacy-till', name: 'Lipa Namba', type: 'till', number: lipaNambaInstructions.tillNumber, ...lipaNambaInstructions,
  }] : []).filter(option => option.enabled !== false);
  const text = (en, sw) => isSwahili ? sw : en;
  const optionName = option => isSwahili && option.nameSw ? option.nameSw : option.name;
  const selected = options.find(option => option.id === selectedId) || options[0];
  const visibleOptions = compact ? (selected ? [selected] : []) : options;
  return <section className={compact ? 'payment-options payment-options--compact' : undefined} aria-label={text('Payment options', 'Njia za malipo')}>
    <h2 style={compact ? undefined : { fontSize: 18 }}>{text('Ways to pay', 'Njia za kulipa')}</h2>
    {compact && options.length > 1 && <label className="payment-options__selector" htmlFor={selectId}>
      {text('Payment method', 'Njia ya malipo')}
      <select id={selectId} value={selected.id} onChange={event => { setSelectedId(event.target.value); setCopied(null); setCopyError(null); }}>
        {options.map(option => <option key={option.id} value={option.id}>{optionName(option)}</option>)}
      </select>
    </label>}
    {options.length > 0 && !compact && <p>{text('Choose one of the payment options below.', 'Chagua mojawapo ya njia za malipo hapa chini.')}</p>}
    {!options.length && <StatePanel compact kind="warning" title={text('Payment details are currently unavailable.', 'Taarifa za malipo hazipatikani kwa sasa.')} description={text('Your submission has been saved. Use your existing Tinzel contact to ask for payment instructions. You can check your order for updated details.', 'Uwasilishaji wako umehifadhiwa. Tumia mawasiliano yako ya Tinzel kuomba maelekezo ya malipo. Unaweza kuangalia oda yako kupata taarifa mpya.')}>
          <button type="button" className="ui-button" onClick={() => { if (window.location.pathname === '/track') window.dispatchEvent(new Event('tinzel:refresh-order')); else navigate('/track'); }}>{text('Check order and payment details', 'Hakiki oda na taarifa za malipo')}</button>
        </StatePanel>}
    {visibleOptions.map(option => <article key={option.id} className={compact ? 'payment-options__details' : undefined} style={compact ? undefined : { background: 'var(--bg-primary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 20, margin: '16px 0', overflowWrap: 'anywhere' }}>
      <h3 className={compact && (options.length > 1 || (option.type === 'till' && optionName(option) === 'Lipa Namba')) ? 'payment-options__sr-only' : undefined} style={compact ? undefined : { margin: '0 0 12px' }}>{optionName(option)}</h3>
      <span className={compact && options.length > 1 && option.type === 'till' && optionName(option) === 'Lipa Namba' ? 'payment-options__sr-only' : undefined} style={{ color: 'var(--text-muted)', fontSize: 13 }}>{option.type === 'bank' ? text('Account number', 'Namba ya akaunti') : option.type === 'mobile' ? text('Phone number', 'Namba ya simu') : option.type === 'till' ? 'Lipa Namba' : text('Payment number', 'Namba ya malipo')}</span>
      <div className={compact ? 'payment-options__number' : undefined} style={compact ? undefined : { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, margin: '4px 0 12px' }}>
        <strong style={{ fontSize: 22 }}>{option.number}</strong>
        <ActionButton type="button" className="ui-button" aria-label={`${text('Copy', 'Nakili')} ${optionName(option)}`} onClick={async () => {
          try { await navigator.clipboard.writeText(option.number); setCopied(option.id); setCopyError(null); }
          catch { setCopyError(option.id); setCopied(null); }
        }}><Copy size={14} /> {copied === option.id ? t('pay.copied') : t('pay.copy')}</ActionButton>
      </div>
      <p><strong>{t('pay.account')}</strong> {option.accountName}</p>
      <p className={compact ? 'payment-options__instructions' : undefined} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{isSwahili && option.instructionsSw ? option.instructionsSw : option.instructions}</p>
      {copied === option.id && <p className={compact ? 'payment-options__sr-only' : undefined} role="status">{text('Payment number copied.', 'Namba ya malipo imenakiliwa.')}</p>}
      {copyError === option.id && (compact ? <p role="alert" className="payment-options__copy-error">{text('Copy is unavailable in this browser. Copy the number above manually.', 'Kunakili hakupatikani kwenye kivinjari hiki. Nakili namba iliyo juu kwa mkono.')}</p> : <StatePanel compact kind="warning" title={text('Copy is unavailable in this browser', 'Kunakili hakupatikani kwenye kivinjari hiki')} description={text('Copy the number above manually.', 'Nakili namba iliyo juu kwa mkono.')} />)}
    </article>)}
  </section>;
}
