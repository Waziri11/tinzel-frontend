import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { paymentAmounts, formatPaymentAmount } from '../../utils/paymentAmounts';
import './paymentPage.css';

export default function DepositSummary({ total, currency = 'TZS', showDeposit = true, showBreakdown = true, isExpress = false }) {
  const { t } = useLanguage();
  const amounts = paymentAmounts(total);
  const money = value => `${value.toLocaleString('en-TZ')} ${currency}`;
  return <div className="payment-deposit-summary">
    <p>{amounts ? t(isExpress ? 'pay.expressDepositExplanation' : 'pay.depositExplanation', {
      amount: formatPaymentAmount(amounts.deposit, currency),
      total: formatPaymentAmount(amounts.total, currency),
    }) : t('pay.depositUnavailable')}</p>
    {amounts && showBreakdown && <dl>
      <div><dt>{t('pay.orderTotal')}</dt><dd>{money(amounts.total)}</dd></div>
      {showDeposit && <div><dt>{t('pay.amount')}</dt><dd>{money(amounts.deposit)}</dd></div>}
      <div><dt>{t('pay.remainingBalance')}</dt><dd>{money(amounts.balance)}</dd></div>
    </dl>}
  </div>;
}
