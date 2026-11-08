export function paymentAmounts(total) {
  if (total == null || total === '') return null;
  const amount = Number(total);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const deposit = Math.ceil(amount / 2);
  return { total: amount, deposit, balance: amount - deposit };
}

export function formatPaymentAmount(amount, currency = 'TZS') {
  const label = ['TZS', 'TSH'].includes(currency.toUpperCase()) ? 'TSh' : currency;
  return `${label} ${amount.toLocaleString('en-TZ')}`;
}
