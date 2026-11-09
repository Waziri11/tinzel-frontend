import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatPaymentAmount } from '../../utils/paymentAmounts';
import './orderPayments.css';

export function orderPayment(order) {
  if (order.payment) return order.payment;
  const raw = order.totalPrice ?? order.price ?? order.formId?.price;
  if (raw == null || !Number.isFinite(Number(raw))) return null;
  const paid = order.paymentDetails?.verifiedAt ? Number(order.paymentDetails.amountPaid || 0) : 0;
  return { total: Number(raw), paid, remaining: Math.max(0, Number(raw) - paid), fullyPaid: paid >= Number(raw), currency: order.currency || order.formId?.currency || 'TZS', history: [], pending: null };
}

export default function OrderPaymentSummary({ payment, history = true }) {
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const money = value => value == null ? '—' : formatPaymentAmount(value, payment?.currency);
  if (!payment) return <p>{ui('Payment details are unavailable. Refresh the order.', 'Taarifa za malipo hazipatikani. Sasisha oda.')}</p>;
  return <div className="order-payments">
    <dl className="order-payments__totals">
      {[[ui('Order total', 'Jumla ya oda'), payment.total], [ui('Approved payments', 'Malipo yaliyoidhinishwa'), payment.paid], [ui('Remaining balance', 'Kiasi kilichobaki'), payment.remaining]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{money(value)}</dd></div>)}
    </dl>
    {payment.fullyPaid && <p className="order-payments__complete" role="status">{ui('Fully paid', 'Malipo yamekamilika')}</p>}
    {history && <>
      <h3>{ui('Payment history', 'Historia ya malipo')}</h3>
      {!payment.history?.length && <p>{ui('No payments have been approved yet.', 'Bado hakuna malipo yaliyoidhinishwa.')}</p>}
      <ol className="order-payments__history">
        {(payment.history || []).map(item => <li key={item._id}>
          <div><strong>{money(item.amount)}</strong><span>{item.kind === 'initial' ? ui('Initial payment', 'Malipo ya awali') : ui('Balance payment', 'Malipo ya kiasi kilichobaki')}</span></div>
          <div><span>{ui('Payment reference', 'Kumbukumbu ya malipo')}: {item.reference || '—'}</span><strong>{item.status === 'approved' ? ui('Approved', 'Yameidhinishwa') : item.status === 'pending' ? ui('Awaiting manager approval', 'Yanasubiri idhini ya meneja') : ui('Needs correction', 'Yanahitaji marekebisho')}</strong></div>
          {item.reviewedByName && <p>{ui('Reviewed by', 'Yamekaguliwa na')}: {item.reviewedByName}</p>}
          {(item.reviewedAt || item.submittedAt) && <time dateTime={item.reviewedAt || item.submittedAt}>{new Date(item.reviewedAt || item.submittedAt).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-TZ')}</time>}
          {item.rejectionReason && <p>{item.rejectionReason}</p>}
        </li>)}
      </ol>
    </>}
  </div>;
}
