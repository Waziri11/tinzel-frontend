import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Copy,
  Clock,
  ArrowRight,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function LipaNambaScreen({ order, lipaNambaInstructions, onNavigateToTracking }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copyTillNumber = () => {
    if (lipaNambaInstructions?.tillNumber) {
      navigator.clipboard.writeText(lipaNambaInstructions.tillNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '32px',
        }}
      >
        {/* Status Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#1e3a8a',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <CreditCard size={28} color="#93c5fd" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
            {t('pay.title')}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {t('pay.uploaded', { title: order?.formTitle ?? '' })}
          </p>
        </div>

        {/* Temporary Submission ID Banner */}
        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>
              {t('pay.tempId')}
            </span>
            <span style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '0.5px' }}>
              {order?.submissionId}
            </span>
          </div>
          <span
            style={{
              backgroundColor: '#451a03',
              color: '#fcd34d',
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
            backgroundColor: '#172554',
            border: '1px solid #1e40af',
            borderRadius: '6px',
            padding: '14px 16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            fontSize: '13px',
            color: '#bfdbfe',
          }}
        >
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>{t('pay.noticeTitle')}</strong>: {t('pay.notice', { phone: order?.clientWhatsApp ?? '' })}
          </div>
        </div>

        {/* Lipa Namba Details Box */}
        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Smartphone size={18} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '16px', fontWeight: '600' }}>{t('pay.instrTitle')}</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                {t('pay.till')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '1px', color: '#60a5fa' }}>
                  {lipaNambaInstructions?.tillNumber || '55667788'}
                </span>
                <button
                  onClick={copyTillNumber}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Copy size={12} />
                  {copied ? t('pay.copied') : t('pay.copy')}
                </button>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                {t('pay.amount')}
              </span>
              <span style={{ fontSize: '22px', fontWeight: '800', color: '#4ade80' }}>
                {order?.price?.toLocaleString()} {order?.currency || 'TZS'}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <span style={{ display: 'block', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
              {t('pay.account')}
            </span>
            {lipaNambaInstructions?.accountName || 'Tinzel Media Ltd'}
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '6px',
              padding: '12px 14px',
              fontSize: '13px',
              lineHeight: '1.5',
            }}
          >
            {lipaNambaInstructions?.instructions || t('pay.defaultInstr')}
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
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
