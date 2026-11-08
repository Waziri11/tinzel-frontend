import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { EXPRESS_FEE } from '../../utils/expressOrder';
import DepositSummary from './DepositSummary';
import '../common/expressOrder.css';

export function OrderPriceBreakdown({ basePrice, expressFee, currency = 'TZS', showTotal = true }) {
  const { lang } = useLanguage();
  const sw = lang === 'sw';
  const money = amount => `${Number(amount || 0).toLocaleString('en-TZ')} ${currency}`;
  return <dl className="express-price-breakdown">
    <div><dt>{sw ? 'Bei ya jarida' : 'Magazine price'}</dt><dd>{money(basePrice)}</dd></div>
    <div><dt>{sw ? 'Ada ya Express' : 'Express fee'}</dt><dd>{money(expressFee)}</dd></div>
    {showTotal && <div><dt>{sw ? 'Jumla ya oda' : 'Order total'}</dt><dd>{money(Number(basePrice || 0) + Number(expressFee || 0))}</dd></div>}
  </dl>;
}

export default function ExpressOrderChoice({ form, value, onChange }) {
  const { lang } = useLanguage();
  const sw = lang === 'sw';
  if (!['TZS', 'TSH'].includes((form.currency || 'TZS').toUpperCase())) return null;
  return <section className="express-choice" aria-labelledby="express-choice-title">
    <h2 id="express-choice-title">{sw ? 'Pata oda yako ndani ya saa 24 kwa Express' : 'Get your order within 24 hours with Express'}</h2>
    <p id="express-choice-help">{sw ? 'Oda ya kawaida: siku 3. Express: saa 24. Muda huanza malipo yako ya awali yanapothibitishwa. Saa zote za Jumatatu hadi Jumamosi huhesabiwa; Jumapili haihesabiwi (saa za Tanzania).' : 'Standard orders take 3 days; Express takes 24 hours. The countdown starts when your deposit is confirmed. All hours Monday–Saturday count; Sundays are excluded (Tanzania time).'}</p>
    <label><input type="radio" name="delivery-speed" value="standard" checked={!value} onChange={() => onChange(false)} aria-describedby="express-choice-help" /><span><strong>{sw ? 'Oda ya kawaida · Siku 3' : 'Standard order · 3 days'}</strong><small>{sw ? 'Hakuna ada ya ziada' : 'No extra fee'}</small></span></label>
    <label><input type="radio" name="delivery-speed" value="express" checked={value} onChange={() => onChange(true)} aria-describedby="express-choice-help" /><span><strong>Express · +TSh 20,000</strong><small>{sw ? 'Kipaumbele katika usanifu, uchapishaji na uwasilishaji' : 'Priority through design, printing and delivery'}</small></span></label>
    <OrderPriceBreakdown basePrice={form.price} expressFee={value ? EXPRESS_FEE : 0} currency={form.currency} />
    <DepositSummary total={Number(form.price) + (value ? EXPRESS_FEE : 0)} currency={form.currency} isExpress={value} showBreakdown={false} />
  </section>;
}
