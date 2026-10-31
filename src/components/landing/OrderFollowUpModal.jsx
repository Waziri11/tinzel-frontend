import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert } from 'antd';
import { SearchOutlined, LockOutlined, CheckCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

export default function OrderFollowUpModal({ open, onCancel, onSuccess }) {
  const { t } = useLanguage();
  const [step, setStep] = useState('enter_order'); // 'enter_order' | 'enter_otp'
  const [orderNumber, setOrderNumber] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [devOtp, setDevOtp] = useState(null);

  const handleRequestOtp = async () => {
    if (!orderNumber.trim() || !whatsappPhone.trim()) {
      setError(t('follow.errBoth'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.client.requestOtp(orderNumber.trim(), whatsappPhone.trim());
      if (res.devOtp) setDevOtp(res.devOtp);
      setStep('enter_otp');
    } catch (err) {
      setError(err.message || t('follow.errLocate'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setError(t('follow.errCode'));
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
      setError(err.message || t('follow.errInvalid'));
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
            {t('follow.title')}
          </span>
        </div>
      }
    >
      <div style={{ paddingTop: '12px' }}>
        <p style={{ fontSize: '13px', color: '#78716C', marginBottom: '20px', lineHeight: '1.5' }}>
          {t('follow.intro')}
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
                htmlFor="follow-up-order-number"
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
                {t('follow.orderNumber')}
              </label>
              <Input
                id="follow-up-order-number"
                size="large"
                placeholder={t('follow.orderPlaceholder')}
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                prefix={<SearchOutlined style={{ color: '#C5A059' }} />}
                style={{ borderRadius: '6px' }}
              />
              <span style={{ fontSize: '11px', color: '#78716C', marginTop: '4px', display: 'block' }}>
                {t('follow.orderHint')}
              </span>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="follow-up-whatsapp"
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
                {t('follow.whatsapp')}
              </label>
              <Input
                id="follow-up-whatsapp"
                size="large"
                placeholder="e.g. +255712345678"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                prefix={<LockOutlined style={{ color: '#B45309' }} />}
                style={{ borderRadius: '6px' }}
              />
              <span style={{ fontSize: '11px', color: '#78716C', marginTop: '4px', display: 'block' }}>
                {t('follow.whatsappHint')}
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
              {t('follow.continue')}
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
              {t('follow.sentTo', { phone: whatsappPhone, order: orderNumber })}
            </div>

            {devOtp && (
              <div style={{ marginBottom: '14px', fontSize: '12px', color: '#B45309', fontWeight: '600' }}>
                {t('follow.devCode', { code: devOtp })}
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
                {t('follow.enterCode')}
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
              {t('follow.verify')}
            </Button>

            <Button
              type="text"
              block
              onClick={() => setStep('enter_order')}
              style={{ color: '#78716C', fontSize: '12px' }}
            >
              {t('follow.change')}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
