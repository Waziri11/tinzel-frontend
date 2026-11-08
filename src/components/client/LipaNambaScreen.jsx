import ExpressOrderBadge from '../common/ExpressOrderBadge';
import { OrderPriceBreakdown } from './ExpressOrderChoice';
import PaymentOptions from './PaymentOptions';
import React from 'react';
import { CheckCircle2, ArrowRight, MessageSquare } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import './paymentPage.css';

export default function LipaNambaScreen({ order, paymentOptions, lipaNambaInstructions, onNavigateToTracking, confirmationRef }) {
  const { t, isSwahili } = useLanguage();
  return (
    <section className="payment-page" aria-labelledby="payment-heading">
      <header className="payment-page__header">
        <div>
          <p className="payment-page__saved" role="status"><CheckCircle2 size={18} aria-hidden="true" />{isSwahili ? 'Oda yako imehifadhiwa' : 'Your order has been saved'}</p>
          <h1 id="payment-heading" ref={confirmationRef} tabIndex={-1}>{isSwahili ? 'Kamilisha malipo' : 'Complete your payment'}</h1>
        </div>
      </header>

      <div className="payment-page__body">
        <section className="payment-page__summary" aria-label={isSwahili ? 'Muhtasari wa oda' : 'Order summary'}>
          <div className="payment-page__amount">
            <span>{t('pay.amount')}</span>
            <strong>{order?.price?.toLocaleString()} <small>{order?.currency || 'TZS'}</small></strong>
          </div>
          <div className="payment-page__customer">
            <span>{t('pay.submitter')}</span>
            <strong>{order?.clientName}</strong>
            <p>{order?.formTitle}</p>
          </div>
          {order?.isExpress && <div className="payment-page__express">
            <ExpressOrderBadge order={order} />
            <OrderPriceBreakdown basePrice={order.basePrice} expressFee={order.expressFee} currency={order.currency} showTotal={false} />
          </div>}
          <p className="payment-page__notice"><MessageSquare size={17} aria-hidden="true" /><span>{t('pay.notice', { phone: order?.clientWhatsApp ?? '' })}</span></p>
        </section>
        <PaymentOptions compact paymentOptions={paymentOptions} lipaNambaInstructions={lipaNambaInstructions} />
      </div>

      <footer className="payment-page__footer">
        <button type="button" className="ui-button is-primary" onClick={onNavigateToTracking}>{t('pay.goTracking')}<ArrowRight size={16} aria-hidden="true" /></button>
      </footer>
    </section>
  );
}
