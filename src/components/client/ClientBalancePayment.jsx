import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { useInterfaceText } from '../../i18n/InterfaceText';
import { formatPaymentAmount } from '../../utils/paymentAmounts';
import { ActionButton } from '../common/SoftFlutter';
import OrderPaymentSummary from '../common/OrderPaymentSummary';
import PaymentOptions from './PaymentOptions';

export default function ClientBalancePayment({ order, token, focusOnOpen, onSaved }) {
  const { lang } = useLanguage();
  const tx = useInterfaceText();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const payment = order.payment;
  const [editing, setEditing] = useState(false);
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const heading = useRef(null);
  const visible = Boolean(order.approvedVersionNumber && payment && (payment.remaining > 0 || payment.history?.some(item => item.kind === 'balance')));
  const canReport = ['awaiting_balance_payment', 'balance_payment_review', 'client_approved', 'print_document_prep', 'print_manager_review'].includes(order.status) && payment?.remaining > 0 && !payment?.pending;
  useEffect(() => { if (visible && focusOnOpen) heading.current?.focus(); }, [visible, focusOnOpen]);
  if (!visible) return null;
  const refresh = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { const result = await api.client.getOrder(token); onSaved(result.order); setUncertain(false); }
    catch (err) { setError(tx(err.message)); }
    finally { lock.current = false; setBusy(false); }
  };
  const submit = async event => {
    event.preventDefault();
    if (lock.current || uncertain || !canReport) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await api.client.reportBalancePayment(token, { reference: reference.trim(), amount: Number(amount) });
      onSaved(result.order); setEditing(false); setReference(''); setAmount('');
    } catch (err) {
      setError(tx(err.message)); setUncertain(!err.status || err.status >= 500 || [408, 409].includes(err.status));
    } finally { lock.current = false; setBusy(false); }
  };
  return <section className="client-balance-payment" aria-labelledby="balance-payment-title">
    <h2 id="balance-payment-title" ref={heading} tabIndex={-1}>{payment.fullyPaid ? ui('Payment complete', 'Malipo yamekamilika') : payment.pending ? ui('Payment awaiting approval', 'Malipo yanasubiri idhini') : ui('Pay the remaining balance', 'Lipa kiasi kilichobaki')}</h2>
    <p>{payment.fullyPaid ? ui('Your full payment is confirmed. Your approved magazine can now move to printing.', 'Malipo yako yote yamethibitishwa. Jarida lako lililoidhinishwa sasa linaweza kuendelea kwa uchapishaji.') : payment.pending ? ui('We have received your payment reference. The manager will check and approve it before printing.', 'Tumepokea kumbukumbu yako ya malipo. Meneja atayakagua na kuyaidhinisha kabla ya uchapishaji.') : ui('Your magazine is approved. Complete the remaining payment, then send your payment reference. Printing starts after the manager confirms full payment.', 'Jarida lako limeidhinishwa. Kamilisha malipo yaliyobaki, kisha tuma kumbukumbu ya malipo. Uchapishaji utaanza baada ya meneja kuthibitisha malipo yote.')}</p>
    <OrderPaymentSummary payment={payment} />
    {canReport && <>
      <PaymentOptions compact paymentOptions={order.paymentOptions} lipaNambaInstructions={order.lipaNambaInstructions} />
      {!editing ? <button type="button" className="ui-button is-primary" onClick={() => { setAmount(String(payment.remaining)); setEditing(true); }}>{ui('I have paid', 'Nimelipa')}</button> : <form onSubmit={submit} aria-busy={busy}>
        <p>{ui('Send the reference from your payment confirmation. This does not make a payment.', 'Tuma kumbukumbu kutoka kwenye uthibitisho wa malipo yako. Hatua hii haifanyi malipo.')}</p>
        <label htmlFor="balance-reference">{ui('Payment reference', 'Kumbukumbu ya malipo')}<input id="balance-reference" required maxLength={120} value={reference} onChange={event => setReference(event.target.value)} disabled={busy || uncertain} /></label>
        <label htmlFor="balance-amount">{ui('Amount paid', 'Kiasi kilicholipwa')} ({payment.currency})<input id="balance-amount" type="number" required min="0.01" step="0.01" max={payment.remaining} value={amount} onChange={event => setAmount(event.target.value)} disabled={busy || uncertain} /></label>
        <p>{ui('Remaining balance', 'Kiasi kilichobaki')}: {formatPaymentAmount(payment.remaining, payment.currency)}</p>
        <div className="order-payments__actions"><ActionButton type="submit" className="ui-button is-primary" loading={busy} disabled={busy || uncertain || !reference.trim()}>{ui('Send payment for approval', 'Tuma malipo kwa idhini')}</ActionButton><button type="button" className="ui-button" disabled={busy} onClick={() => setEditing(false)}>{ui('Cancel', 'Ghairi')}</button></div>
      </form>}
    </>}
    {error && <p role="alert">{error}</p>}
    {uncertain && <p>{ui('Check the saved payment before submitting again.', 'Hakiki malipo yaliyohifadhiwa kabla ya kutuma tena.')}</p>}
    {(uncertain || payment.pending) && <ActionButton className="ui-button" loading={busy} disabled={busy} onClick={refresh}>{ui('Check payment status', 'Hakiki hali ya malipo')}</ActionButton>}
  </section>;
}
