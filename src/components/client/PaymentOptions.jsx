import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { ActionButton } from '../common/SoftFlutter';
import { useLanguage } from '../../i18n/LanguageContext';
import StatePanel from '../common/StatePanel';
import { navigate } from '../../navigation/location';

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
      : <StatePanel compact kind="warning" title={text('Payment details are currently unavailable.', 'Taarifa za malipo hazipatikani kwa sasa.')} description={text('Your submission has been saved. Use your existing Tinzel contact to ask for payment instructions. You can check your order for updated details.', 'Uwasilishaji wako umehifadhiwa. Tumia mawasiliano yako ya Tinzel kuomba maelekezo ya malipo. Unaweza kuangalia oda yako kupata taarifa mpya.')}>
          <button type="button" className="ui-button" onClick={() => { if (window.location.pathname === '/track') window.dispatchEvent(new Event('tinzel:refresh-order')); else navigate('/track'); }}>{text('Check order and payment details', 'Hakiki oda na taarifa za malipo')}</button>
        </StatePanel>}
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
      {copied === option.id && <p role="status">{text('Payment number copied.', 'Namba ya malipo imenakiliwa.')}</p>}
      {copyError === option.id && <StatePanel compact kind="warning" title={text('Copy is unavailable in this browser', 'Kunakili hakupatikani kwenye kivinjari hiki')} description={text('Copy the number above manually.', 'Nakili namba iliyo juu kwa mkono.')} />}
    </article>)}
  </section>;
}
