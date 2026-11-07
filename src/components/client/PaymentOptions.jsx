import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { ActionButton } from '../common/SoftFlutter';
import { useLanguage } from '../../i18n/LanguageContext';

export default function PaymentOptions({ paymentOptions, lipaNambaInstructions }) {
  const { isSwahili, t } = useLanguage();
  const [copied, setCopied] = useState(null);
  const [copyError, setCopyError] = useState(null);
  const options = (Array.isArray(paymentOptions) ? paymentOptions : lipaNambaInstructions?.tillNumber ? [{
    id: 'legacy-till', name: 'Lipa Namba', type: 'till', number: lipaNambaInstructions.tillNumber, ...lipaNambaInstructions,
  }] : []).filter(option => option.enabled !== false);
  const text = (en, sw) => isSwahili ? sw : en;
  return <section aria-label={text('Payment options', 'Njia za malipo')}>
    <h2 style={{ fontSize: 18 }}>{text('Ways to pay', 'Njia za kulipa')}</h2>
    {options.length ? <p>{text('Choose one of the payment options below.', 'Chagua mojawapo ya njia za malipo hapa chini.')}</p>
      : <p role="status">{text('Payment details are currently unavailable. Please contact Tinzel for payment instructions. Your submission has been saved.', 'Taarifa za malipo hazipatikani kwa sasa. Tafadhali wasiliana na Tinzel kupata maelekezo ya malipo. Uwasilishaji wako umehifadhiwa.')}</p>}
    {options.map(option => <article key={option.id} style={{ background: 'var(--bg-primary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 20, margin: '16px 0', overflowWrap: 'anywhere' }}>
      <h3 style={{ margin: '0 0 12px' }}>{isSwahili && option.nameSw ? option.nameSw : option.name}</h3>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{option.type === 'bank' ? text('Account number', 'Namba ya akaunti') : option.type === 'mobile' ? text('Phone number', 'Namba ya simu') : option.type === 'till' ? 'Lipa Namba' : text('Payment number', 'Namba ya malipo')}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, margin: '4px 0 12px' }}>
        <strong style={{ fontSize: 22 }}>{option.number}</strong>
        <ActionButton type="button" className="ui-button" aria-label={`${text('Copy', 'Nakili')} ${option.name}`} onClick={async () => {
          try { await navigator.clipboard.writeText(option.number); setCopied(option.id); setCopyError(null); }
          catch { setCopyError(option.id); setCopied(null); }
        }}><Copy size={14} /> {copied === option.id ? t('pay.copied') : t('pay.copy')}</ActionButton>
      </div>
      <p><strong>{t('pay.account')}</strong> {option.accountName}</p>
      <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{isSwahili && option.instructionsSw ? option.instructionsSw : option.instructions}</p>
      {copyError === option.id && <p role="alert">{text('Copy the number above manually.', 'Nakili namba iliyo juu kwa mkono.')}</p>}
    </article>)}
  </section>;
}
