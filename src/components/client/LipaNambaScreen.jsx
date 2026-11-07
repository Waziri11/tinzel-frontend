import PaymentOptions from './PaymentOptions';
import React from 'react';
import { CreditCard, Clock, ArrowRight, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function LipaNambaScreen({ order, paymentOptions, lipaNambaInstructions, onNavigateToTracking }) {
  const { t } = useLanguage();
  return (
    <div className="payment-page" style={{ maxWidth: '680px', margin: '0 auto', overflowWrap: 'anywhere' }}>
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: 'clamp(16px, 4vw, 32px)',
        }}
      >
        {/* Status Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#FBF7EE',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <CreditCard size={28} color="#8A6A30" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>{t('pay.title')}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {t('pay.uploaded', { title: order?.formTitle ?? '' })}
          </p>
        </div>

        {/* Submission status */}
        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ minWidth: 0, flex: '1 1 180px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>{t('pay.submitter')}</span>
            <span style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '0.5px' }}>{order?.clientName}</span>
          </div>
          <span
            style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #F59E0B',
              color: '#B45309',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            {t('pay.awaiting')}
          </span>
        </div>

        {/* Notice on Tracking ID */}
        <div
          style={{
            backgroundColor: '#FBF7EE',
            border: '1px solid #E7D9BD',
            borderRadius: '6px',
            padding: '14px 16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            fontSize: '13px',
            color: '#674B18',
          }}
        >
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>{t('pay.noticeTitle')}</strong>: {t('pay.notice', { phone: order?.clientWhatsApp ?? '' })}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <p><strong>{t('pay.amount')}</strong> {order?.price?.toLocaleString()} {order?.currency || 'TZS'}</p>
          <PaymentOptions paymentOptions={paymentOptions} lipaNambaInstructions={lipaNambaInstructions} />
        </div>
        {/* Bottom Actions */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}
          >
            <Clock size={14} />
            <span>{t('pay.verify')}</span>
          </div>

          <button
            onClick={onNavigateToTracking}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            {t('pay.goTracking')}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
