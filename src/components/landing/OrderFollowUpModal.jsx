import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert } from 'antd';
import { SearchOutlined, LockOutlined, CheckCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

export default function OrderFollowUpModal({ open, onCancel, onSuccess }) {
  const [step, setStep] = useState('enter_order'); // 'enter_order' | 'enter_otp'
  const [orderNumber, setOrderNumber] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [devOtp, setDevOtp] = useState(null);

  const handleRequestOtp = async () => {
    if (!orderNumber.trim() || !whatsappPhone.trim()) {
      setError('Please provide both your Magazine Order Number and WhatsApp phone number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.client.requestOtp(orderNumber.trim(), whatsappPhone.trim());
      if (res.devOtp) setDevOtp(res.devOtp);
      setStep('enter_otp');
    } catch (err) {
      setError(err.message || 'Could not locate order. Please check the order number and WhatsApp phone.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit WhatsApp verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.client.verifyOtp(orderNumber.trim(), otpCode.trim());
      sessionStorage.setItem('tinzel_client_token', res.clientToken);
      onSuccess(res.clientToken);
      resetState();
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setStep('enter_order');
    setOrderNumber('');
    setWhatsappPhone('');
    setOtpCode('');
    setError(null);
    setDevOtp(null);
  };

  const handleModalClose = () => {
    resetState();
    onCancel();
  };

  return (
    <Modal
      open={open}
      onCancel={handleModalClose}
      footer={null}
      centered
      width={460}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1C1917' }}>
          <img src="/brand/tinzel-butterfly.png" alt="Tinzel" style={{ height: '24px', width: 'auto' }} />
          <span style={{ fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)', fontStyle: 'italic', fontSize: '24px', fontWeight: '600' }}>
            Magazine Order Follow Up
          </span>
        </div>
      }
    >
      <div style={{ paddingTop: '12px' }}>
        <p style={{ fontSize: '13px', color: '#78716C', marginBottom: '20px', lineHeight: '1.5' }}>
          Follow your magazine's editorial progress, review designer drafts, and approve your printed edition.
        </p>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: '16px', borderRadius: '6px' }}
          />
        )}

        {step === 'enter_order' ? (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#1C1917',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Magazine Order Number *
              </label>
              <Input
                size="large"
                placeholder="e.g. TNZ-2026-0001 or SUB-2026-XXXXX"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                prefix={<SearchOutlined style={{ color: '#C5A059' }} />}
                style={{ borderRadius: '6px' }}
              />
              <span style={{ fontSize: '11px', color: '#78716C', marginTop: '4px', display: 'block' }}>
                Issued upon payment verification (TNZ-...) or initial submission (SUB-...).
              </span>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#1C1917',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                WhatsApp Phone Number *
              </label>
              <Input
                size="large"
                placeholder="e.g. +255712345678"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                prefix={<LockOutlined style={{ color: '#B45309' }} />}
                style={{ borderRadius: '6px' }}
              />
              <span style={{ fontSize: '11px', color: '#78716C', marginTop: '4px', display: 'block' }}>
                A 6-digit security code will be sent to this number to protect your photos and drafts.
              </span>
            </div>

            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleRequestOtp}
              style={{
                backgroundColor: '#991B1B',
                borderColor: '#991B1B',
                color: '#FFFFFF',
                height: '46px',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Continue to Private Review
            </Button>
          </div>
        ) : (
          <div>
            <div
              style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '18px',
                fontSize: '12px',
                color: '#92400E',
              }}
            >
              A 6-digit WhatsApp verification code was sent to <strong>{whatsappPhone}</strong> for Order{' '}
              <strong>{orderNumber}</strong>.
            </div>

            {devOtp && (
              <div style={{ marginBottom: '14px', fontSize: '12px', color: '#B45309', fontWeight: '600' }}>
                [Dev Mode] Verification Code: {devOtp}
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#1C1917',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  textAlign: 'center',
                }}
              >
                Enter 6-Digit Verification Code
              </label>
              <Input
                size="large"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                style={{
                  textAlign: 'center',
                  fontSize: '22px',
                  letterSpacing: '8px',
                  fontWeight: '700',
                  height: '50px',
                  borderRadius: '6px',
                }}
              />
            </div>

            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleVerifyOtp}
              style={{
                backgroundColor: '#991B1B',
                borderColor: '#991B1B',
                color: '#FFFFFF',
                height: '46px',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '10px',
              }}
            >
              Verify & Enter Order Portal
            </Button>

            <Button
              type="text"
              block
              onClick={() => setStep('enter_order')}
              style={{ color: '#78716C', fontSize: '12px' }}
            >
              Change Order Number or WhatsApp
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
