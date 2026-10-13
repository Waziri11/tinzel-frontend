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

export default function LipaNambaScreen({ order, lipaNambaInstructions, onNavigateToTracking }) {
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
            Submission Received — Complete Payment
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Your photos and responses for <strong>{order?.formTitle}</strong> are safely uploaded.
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
              Temporary Submission ID:
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
            Awaiting Payment
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
            <strong>Tracking ID Notice</strong>: Your official <strong>Magazine Tracking ID</strong> will be
            issued and sent directly to your WhatsApp (<strong>{order?.clientWhatsApp}</strong>) once our
            manager verifies your Lipa Namba transaction.
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
            <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Lipa Namba Payment Instructions</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Lipa Namba (Till Number):
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
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Amount to Pay:
              </span>
              <span style={{ fontSize: '22px', fontWeight: '800', color: '#4ade80' }}>
                {order?.price?.toLocaleString()} {order?.currency || 'TZS'}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <span style={{ display: 'block', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
              Account Name:
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
            {lipaNambaInstructions?.instructions ||
              '1. Piga *150*00# (M-Pesa) au *150*01# (Tigo Pesa).\n2. Chagua Lipa kwa Simu -> Lipa Namba.\n3. Weka Lipa Namba 55667788 na jina lako kama kumbukumbu.'}
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <Clock size={14} />
            <span>Verifications typically take 5-15 minutes</span>
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
            Go to Tracking Portal
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
