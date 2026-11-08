import { customerJourney, customerChangeStatusKey } from '../../utils/customerJourney';
import { orderSenderName } from '../../utils/orderDisplay';
import PaymentOptions from './PaymentOptions';
import RevisionAudioInput from '../common/RevisionAudioInput';
import RevisionAudioPlayer from '../common/RevisionAudioPlayer';
import PhoneInput from '../common/PhoneInput';
import PageSkeleton from '../common/PageSkeleton';
import SoftFlutter, { ActionButton } from '../common/SoftFlutter';
import React, { lazy, useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Send,
  Truck,
  Printer,
  Sparkles,
  LogOut,
  CreditCard,
} from 'lucide-react';
import { useAccountLanguage } from '../../hooks/useAccountLanguage';
import ClientNotifications from './ClientNotifications';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

const PdfBookReader = lazy(() => import('../common/PdfBookReader'));

const STAGES = [
  { key: 'submission', labelKey: 'track.stage.submission' },
  { key: 'payment', labelKey: 'track.stage.payment' },
  { key: 'design', labelKey: 'track.stage.design' },
  { key: 'review', labelKey: 'track.stage.review' },
  { key: 'printing', labelKey: 'track.stage.printing' },
  { key: 'delivery', labelKey: 'track.stage.delivery' },
];

export default function ClientTrackingPortal() {
  const { t, lang } = useLanguage();
  const ui = (en, sw) => (lang === 'sw' ? sw : en);
  const otpInput = useRef(null);
  const [trackingId, setTrackingId] = useState('');
  const [clientWhatsApp, setClientWhatsApp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  useEffect(() => {
    if (otpSent) otpInput.current?.focus();
  }, [otpSent]);
  const [clientToken, setClientToken] = useState('cookie');
  const [order, setOrder] = useState(null);
  useAccountLanguage('client', clientToken, order?._id, order?.clientPreferredLanguage, (message) => setError(message));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [devOtp, setDevOtp] = useState(null);

  // Reader state
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionItems, setRevisionItems] = useState([{ text: '', pageReference: '' }]);
  const [revisionAudio, setRevisionAudio] = useState(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [readerVersion, setReaderVersion] = useState(null);
  const [proofState, setProofState] = useState({ composing: false, saving: false });
  const allowProofLeave = () => !proofState.saving && (!proofState.composing || window.confirm(ui('Discard the unfinished comment? Saved comments will remain.', 'Ungependa kufuta maoni ambayo hayajakamilika? Maoni yaliyohifadhiwa yatabaki.')));


  useEffect(() => {
    loadOrder('cookie', true);
  }, []);

  const loadOrder = async (token, restore = false) => {
    setLoading(true);
    setError(null);
    try {
      let data;
      try {
        // Missing access is expected when a customer first opens tracking.
        data = await api.client.getOrder(token, { silentUnauthorized: restore });
      } catch (err) {
        const lastSubmission = localStorage.getItem('tinzel_tracking_reference');
        if (!restore || !lastSubmission || err.status !== 401) throw err;
        const resumed = await api.client.resumeTracking(lastSubmission);
        if (!resumed.clientToken) {
          localStorage.removeItem('tinzel_tracking_reference');
          throw err;
        }
        data = await api.client.getOrder(resumed.clientToken, { silentUnauthorized: restore });
      }
      setError(null);
      setClientToken(token);
      setOrder(data.order);
      setSuccessMsg(null);
      const reference = data.order.submissionId || data.order.trackingId;
      if (reference) localStorage.setItem('tinzel_tracking_reference', reference);
    } catch (err) {
      const accessRejected = err.status === 401 || err.status === 403;
      setError(accessRejected
        ? (restore ? null : t('track.err.sessionExpired'))
        : (err.message || t('track.err.sessionExpired')));
      // Only clear credentials if access is rejected by the server (401/403)
      // Preserve session and allow retry on 5xx server issues or network drops
      if (accessRejected) {
        setClientToken('');
        sessionStorage.removeItem('tinzel_client_token');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!trackingId.trim() || !clientWhatsApp.trim()) {
      setError(t('track.err.enterBoth'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.client.requestOtp(trackingId.trim(), clientWhatsApp.trim());
      if (res.clientToken) {
        await loadOrder(res.clientToken);
        return;
      }
      setOtpSent(true);
      if (res.devOtp) setDevOtp(res.devOtp);
      setSuccessMsg(t('track.ok.otpSent'));
    } catch (err) {
      setError(err.message || t('track.err.requestOtp'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError(t('track.err.enterOtp'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.client.verifyOtp(trackingId.trim(), otpCode.trim());
      setClientToken(res.clientToken);
      sessionStorage.removeItem('tinzel_client_token');
      await loadOrder(res.clientToken);
    } catch (err) {
      setError(err.message || t('track.err.invalidOtp'));
    } finally {
      setLoading(false);
    }
  };

  const clearSession = useCallback(() => {
    setClientToken('');
    sessionStorage.removeItem('tinzel_client_token');
    setOrder(null);
    setRevisionAudio(null);
    setRevisionItems([{ text: '', pageReference: '' }]);
    setShowRevisionForm(false);
    setOtpSent(false);
    setOtpCode('');
    setSuccessMsg(null);
  }, []);
  useEffect(() => {
    const expired = () => {
      clearSession();
      setError(t('track.err.sessionExpired'));
    };
    window.addEventListener('tinzel:client:unauthorized', expired);
    return () => window.removeEventListener('tinzel:client:unauthorized', expired);
  }, [clearSession, t]);

  const handleLogout = async (forgetDevice = false) => {
    try {
      try {
        await api.client.logout(forgetDevice);
      } catch (err) {
        if (err.status !== 401) throw err;
        // An idle session can expire while the order is still on screen.
        const reference = order?.submissionId || order?.trackingId;
        if (forgetDevice && reference) {
          const restored = await api.client.resumeTracking(reference);
          if (restored.clientToken) await api.client.logout(true);
        }
      }
      localStorage.removeItem('tinzel_tracking_reference');
      clearSession();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApproveWholeMagazine = async () => {
    if (proofState.composing || proofState.saving) return;
    if (!confirm(t('track.confirm.approve'))) return;
    setSubmittingDecision(true);
    setError(null);
    try {
      const res = await api.client.approveDraft(
        clientToken,
        'Client approved whole magazine.',
        order.currentDraftVersion,
      );
      setOrder(res.order);
      setSuccessMsg(t('track.ok.approved'));
    } catch (err) {
      setError(err.message || t('track.err.approve'));
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleRequestRevision = async (e) => {
    e.preventDefault();
    if (proofState.composing || proofState.saving) return;
    const items = revisionItems
      .map((item) => ({ text: item.text.trim(), pageReference: item.pageReference.trim() }))
      .filter((item) => item.text);
    if (audioBusy) return;
    if (!items.length && !revisionAudio) {
      setError(ui('Describe the changes or add an audio message.', 'Eleza marekebisho au ongeza ujumbe wa sauti.'));
      return;
    }

    setSubmittingDecision(true);
    setError(null);
    try {
      const res = await api.client.requestRevision(clientToken, items, order.currentDraftVersion, revisionAudio);
      setOrder(res.order);
      setShowRevisionForm(false);
      setRevisionAudio(null);
      setRevisionItems([{ text: '', pageReference: '' }]);
      setSuccessMsg(t('track.ok.revisionSent'));
    } catch (err) {
      setError(err.message || t('track.err.revision'));
    } finally {
      setSubmittingDecision(false);
    }
  };

  if (clientToken && !order && !error) return <PageSkeleton variant="detail" />;

  // Login Gate View
  if (!clientToken || !order) {
    return (
      <div className="tracking-access">
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '32px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: 'var(--accent-gold-light)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}
            >
              <KeyRound size={24} color="var(--accent-primary)" />
            </div>
            <h1 className="ui-title">{t('track.login.title')}</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('track.login.subtitle')}</p>
          </div>

          {error && (
            <div role="alert" style={{ marginBottom: '18px' }}>
              <div
                style={{
                  backgroundColor: '#450a0a',
                  border: '1px solid var(--accent-danger)',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  color: '#fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
              {clientToken && (
                <ActionButton
                  type="button"
                  onClick={() => loadOrder(clientToken)}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Retry Loading Order
                </ActionButton>
              )}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                backgroundColor: '#064e3b',
                border: '1px solid var(--accent-success)',
                borderRadius: '6px',
                padding: '12px 14px',
                marginBottom: '18px',
                fontSize: '13px',
                color: '#6ee7b7',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  htmlFor="track-login-id"
                  style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}
                >
                  {t('track.login.trackingId')}
                </label>
                <input
                  id="track-login-id"
                  type="text"
                  placeholder={t('track.login.trackingIdPh')}
                  required
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    letterSpacing: '0.5px',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="track-login-whatsapp"
                  style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}
                >
                  {t('track.login.whatsapp')}
                </label>
                <PhoneInput
                  id="track-login-whatsapp"
                  type="tel"
                  autoComplete="tel"
                  placeholder={t('track.login.whatsappPh')}
                  required
                  value={clientWhatsApp}
                  onChange={(e) => setClientWhatsApp(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <ActionButton
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? <SoftFlutter size={16} /> : <Lock size={16} />}
                {t('track.login.sendCode')}
              </ActionButton>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  htmlFor="track-login-otp"
                  style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}
                >
                  {t('track.login.enterOtp')}
                </label>
                <input
                  id="track-login-otp"
                  ref={otpInput}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="123456"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    textAlign: 'center',
                    fontSize: '24px',
                    letterSpacing: '8px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                  }}
                />
                {devOtp && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--info)' }}>
                    {t('track.login.devOtp')} <strong>{devOtp}</strong>
                  </div>
                )}
              </div>

              <ActionButton
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? <SoftFlutter size={16} /> : <CheckCircle2 size={16} />}
                {t('track.login.verify')}
              </ActionButton>

              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtpCode('');
                  setError(null);
                  setSuccessMsg(null);
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  textAlign: 'center',
                  padding: '4px',
                }}
              >
                {t('track.login.change')}
              </button>
              <ActionButton loading={loading} type="button" className="ui-button" disabled={loading} onClick={handleRequestOtp}>
                {ui('Resend verification code', 'Tuma msimbo tena')}
              </ActionButton>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Active Order & Whole-Magazine Review Portal View
  const journey = customerJourney(order);
  const currentStageIdx = journey.stage;
  const releasedDraft =
    (order.draftVersions || []).find((v) => v.versionNumber === order.currentDraftVersion) ||
    (order.draftVersions || []).at(-1);

  return (
    <div className="tracking-order">
      {/* Top Banner / Order Summary */}
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="customer-order-name" style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '0.5px' }}>
              {orderSenderName(order, ui('Your magazine', 'Jarida lako'))}
            </span>
            <span
              style={{
                backgroundColor: 'var(--accent-gold-light)',
                color: 'var(--accent-primary)',
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
              }}
            >
              {t(journey.statusKey)}
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {t('track.magazine')}{' '}
            <strong>{order.formTitle}</strong>
          </p>
          <p className="customer-status-description" style={{ fontSize: 14, lineHeight: 1.6, marginTop: 10, maxWidth: 600 }}>{t(journey.detailKey)}</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <ClientNotifications token={clientToken} onUnauthorized={clearSession} />
          <button type="button" className="ui-button" onClick={() => { if (allowProofLeave()) handleLogout(true); }}>
            {ui('Stop remembering this order', 'Usikumbuke oda hii tena')}
          </button>
          <ActionButton onClick={() => { if (allowProofLeave()) handleLogout(); }}>
            <LogOut size={13} /> {t('track.signOut')}
          </ActionButton>
        </div>
      </div>

      {/* On-Hold Explanatory Banner */}
      {order.status === 'on_hold' && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FCD34D',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <Clock size={20} color="#B45309" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ color: '#B45309', fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>
              {t('track.status.on_hold')}
            </div>
            <p style={{ color: '#78350F', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
              {order.holdReason ||
                t('track.detail.on_hold')}
            </p>
          </div>
        </div>
      )}

      {/* Awaiting Payment Guidance Banner */}
      {order.status === 'awaiting_payment' && (
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            padding: '20px 24px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              color: '#1E40AF',
              fontWeight: '700',
              fontSize: '15px',
            }}
          >
            <CreditCard size={18} />
            <span>{t('pay.title')}</span>
          </div>
          <p style={{ fontSize: '13px', color: '#1E3A8A', marginBottom: '12px', lineHeight: '1.5' }}>
            {t('pay.verify')} {order.price ? `(${order.price.toLocaleString()} ${order.currency})` : ''}
          </p>
          <PaymentOptions paymentOptions={order.paymentOptions} lipaNambaInstructions={order.lipaNambaInstructions} />
        </div>
      )}

      {/* Visual Conveyor Belt Progress Bar */}
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '20px 24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '14px', color: 'var(--text-muted)' }}>
          {t('track.progress')}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '8px',
          }}
        >
          {STAGES.map((stg, i) => {
            const isCompleted = journey.complete || i < currentStageIdx;
            const isCurrent = !journey.complete && i === currentStageIdx;
            return (
              <div
                key={stg.key}
                aria-current={isCurrent ? 'step' : undefined}
                style={{
                  backgroundColor: isCompleted ? '#F0FDF4' : isCurrent ? '#EFF6FF' : 'var(--bg-primary)',
                  border: `1px solid ${isCompleted ? '#16A34A' : isCurrent ? '#2563EB' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  padding: '10px 8px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: isCompleted ? '#15803D' : isCurrent ? '#1D4ED8' : 'var(--text-muted)',
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {t(stg.labelKey)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {successMsg && (
        <div
          style={{
            backgroundColor: '#064e3b',
            border: '1px solid var(--accent-success)',
            borderRadius: '6px',
            padding: '14px 16px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: '#450a0a',
            border: '1px solid var(--accent-danger)',
            borderRadius: '6px',
            padding: '14px 16px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {(order.revisionRequests || []).length > 0 && (
        <section
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>{ui('Your requested changes', 'Marekebisho uliyoomba')}</h2>
          {(order.revisionRequests || [])
            .slice()
            .reverse()
            .map((request) => (
              <div key={request._id} style={{ borderTop: '1px solid var(--border-color)', padding: '12px 0' }}>
                <strong style={{ fontSize: 13 }}>
                  {ui('Request', 'Ombi')} {request.roundNumber} · {t(customerChangeStatusKey(request.status))}
                </strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                  {request.items.map((item) => (
                    <li key={item._id} style={{ fontSize: 13, marginBottom: 4 }}>
                      {item.pageReference ? `${ui('Page', 'Ukurasa')} ${item.pageReference}: ` : ''}
                      {item.audio && item.text === 'Audio feedback' ? ui('Voice message', 'Ujumbe wa sauti') : item.text}
                      <RevisionAudioPlayer client token={clientToken} requestId={request._id} item={item} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </section>
      )}

      {/* Whole-Magazine Reader Section */}
      {releasedDraft ? (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
                {t('track.proof.title', { version: releasedDraft?.versionNumber })}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('track.proof.hint')}</p>
            </div>
          </div>

          <label>
            {ui('Magazine version', 'Toleo la jarida')}{' '}
            <select
              aria-label={ui('Magazine version', 'Toleo la jarida')}
              value={readerVersion || releasedDraft?.versionNumber}
              onChange={(e) => { if (allowProofLeave()) setReaderVersion(Number(e.target.value)); }}
            >
              {(order.draftVersions || []).map((v) => (
                <option key={v.versionNumber} value={v.versionNumber}>
                  {ui('Version', 'Toleo')} {v.versionNumber}
                </option>
              ))}
            </select>
          </label>
          <PdfBookReader
            onReviewStateChange={setProofState}
            token={clientToken}
            version={readerVersion || releasedDraft?.versionNumber}
            client
            title={t('track.proof.title', { version: readerVersion || releasedDraft?.versionNumber })}
            onReviewed={() => loadOrder(clientToken)}
          />

          {/* Action Decision Controls (Whole-Magazine Approval Gate) */}
          {order.status === 'client_review' ? (
            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '24px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>{t('track.decision.title')}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                {t('track.decision.desc')}
              </p>

              {!showRevisionForm ? (
                <div className="client-decision-actions">
                  <ActionButton loading={submittingDecision}
                    onClick={handleApproveWholeMagazine}
                    disabled={submittingDecision || audioBusy || proofState.composing || proofState.saving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'var(--accent-success)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '700',
                    }}
                  >
                    <CheckCircle2 size={18} />
                    {t('track.decision.approve')}
                  </ActionButton>

                  <button
                    onClick={() => setShowRevisionForm(true)}
                    disabled={submittingDecision || audioBusy || proofState.composing || proofState.saving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      padding: '12px 20px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    {t('track.decision.requestChanges')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestRevision}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    {ui('Describe your changes in writing or with audio', 'Eleza marekebisho kwa maandishi au sauti')}
                  </label>
                  <RevisionAudioInput file={revisionAudio} onChange={setRevisionAudio} disabled={submittingDecision} onBusyChange={setAudioBusy} />
                  {revisionItems.map((item, index) => (
                    <div
                      key={index}
                      className="client-revision-row"
                    >
                      <input
                        aria-label={ui(`Page number ${index + 1}`, `Namba ya ukurasa ${index + 1}`)}
                        placeholder={ui('Page (optional)', 'Ukurasa (si lazima)')}
                        value={item.pageReference}
                        onChange={(e) =>
                          setRevisionItems((rows) =>
                            rows.map((row, i) => (i === index ? { ...row, pageReference: e.target.value } : row)),
                          )
                        }
                        style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 6 }}
                      />
                      <textarea
                        rows={2}
                        aria-label={ui(`Written feedback ${index + 1}`, `Maoni ya maandishi ${index + 1}`)}
                        disabled={submittingDecision}
                        placeholder={t('track.decision.describePh')}
                        value={item.text}
                        onChange={(e) =>
                          setRevisionItems((rows) =>
                            rows.map((row, i) => (i === index ? { ...row, text: e.target.value } : row)),
                          )
                        }
                        style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 6 }}
                      />
                      {revisionItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRevisionItems((rows) => rows.filter((_, i) => i !== index))}
                          style={{ border: 0, background: 'transparent', color: '#991B1B' }}
                        >
                          {ui('Remove', 'Ondoa')}
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRevisionItems((rows) => [...rows, { text: '', pageReference: '' }])}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      borderRadius: 6,
                      padding: '8px 12px',
                      marginBottom: 16,
                    }}
                  >
                    {ui('Add another change', 'Ongeza marekebisho mengine')}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ActionButton loading={submittingDecision}
                      type="submit"
                      disabled={submittingDecision || audioBusy || proofState.composing || proofState.saving}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'var(--accent-warning)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                      }}
                    >
                      <Send size={14} />
                      {t('track.decision.submit')}
                    </ActionButton>
                    <button
                      type="button"
                      disabled={submittingDecision}
                      onClick={() => { setShowRevisionForm(false); setRevisionAudio(null); }}
                      style={{
                        backgroundColor: 'transparent',
                        color: 'var(--text-muted)',
                        padding: '10px 16px',
                        fontSize: '13px',
                      }}
                    >
                      {t('track.decision.cancel')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : order.status === 'client_approved' ? (
            <div
              style={{
                backgroundColor: '#064e3b',
                border: '1px solid var(--accent-success)',
                borderRadius: '6px',
                padding: '16px',
                color: '#6ee7b7',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <CheckCircle2 size={20} />
              <div>
                <strong>{t('track.approved.title', { version: order.approvedVersionNumber })}</strong>!{' '}
                {t('track.approved.body')}
              </div>
            </div>
          ) : order.status === 'revision_requested' ? (
            <div
              style={{
                backgroundColor: '#451a03',
                border: '1px solid var(--accent-warning)',
                borderRadius: '6px',
                padding: '16px',
                color: '#fcd34d',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Clock size={20} />
              <div>
                <strong>{t('track.revreq.title')}</strong>: {t('track.revreq.body')}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Printing & Delivery Tracking Details */}
      {['printing_sent', 'printing_in_progress', 'printing_completed', 'dispatched', 'delivered', 'closed'].includes(
        order.status,
      ) && (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Printer size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{t('track.print.title')}</h3>
          </div>
          <div className="client-delivery-grid">
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                {ui('Current step:', 'Hatua ya sasa:')}
              </span>
              <span>{t(journey.statusKey)}</span>
            </div>
            {order.dispatchDetails?.trackingReference && (
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  {t('track.print.courier')}
                </span>
                <span>
                  {order.dispatchDetails.carrier}: {order.dispatchDetails.trackingReference}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
