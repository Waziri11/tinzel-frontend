import StatePanel from '../common/StatePanel';
import { useConfirm } from '../common/ConfirmDialog';
import { normalizePhone } from '../../utils/phone';
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
  const confirm = useConfirm();
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
  const [resendAt, setResendAt] = useState(0), [codeUntil, setCodeUntil] = useState(0), [now, setNow] = useState(Date.now());
  const [entryErrors, setEntryErrors] = useState({});
  const [lastLoaded, setLastLoaded] = useState(null), [loadFailed, setLoadFailed] = useState(false);
  const [decisionUncertain, setDecisionUncertain] = useState(false);
  const [errorStatus, setErrorStatus] = useState(null);
  const resendWait = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const codeExpired = otpSent && codeUntil > 0 && codeUntil <= now;
  useEffect(() => {
    if (!otpSent && !resendAt) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (!otpSent && current >= resendAt) setResendAt(0);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSent, resendAt]);

  // Reader state
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionItems, setRevisionItems] = useState([{ text: '', pageReference: '' }]);
  const [revisionAudio, setRevisionAudio] = useState(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [readerVersion, setReaderVersion] = useState(null);
  const [proofState, setProofState] = useState({ composing: false, saving: false });
  const retainedFeedbackFor = useRef(null);
  const handleUnauthorized = useCallback(() => window.dispatchEvent(new Event('tinzel:client:unauthorized')), []);
  const allowProofLeave = async () => !proofState.saving && (!proofState.composing || await confirm({ title: ui('Discard the unfinished comment?', 'Ufute maoni ambayo hayajakamilika?'), description: ui('Saved comments will remain.', 'Maoni yaliyohifadhiwa yatabaki.'), confirmLabel: ui('Discard comment', 'Futa maoni'), danger: true }));
  const hasFeedback = Boolean(revisionAudio || revisionItems.some(item => item.text.trim() || item.pageReference.trim()));
  const allowFeedbackLeave = async () => !submittingDecision && (!hasFeedback || await confirm({ title: ui('Leave unsent feedback?', 'Uache maoni ambayo hayajatumwa?'), description: ui('Your unsent written and audio feedback will be lost.', 'Maoni yako ya maandishi na sauti ambayo hayajatumwa yatapotea.'), confirmLabel: ui('Discard feedback', 'Futa maoni'), danger: true }));
  useEffect(() => {
    if (!hasFeedback) return;
    const leave = event => event.detail?.waitUntil?.(allowFeedbackLeave());
    const unload = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('tinzel:before-navigate', leave); window.addEventListener('beforeunload', unload);
    return () => { window.removeEventListener('tinzel:before-navigate', leave); window.removeEventListener('beforeunload', unload); };
  }, [hasFeedback, submittingDecision, lang, confirm]);


  useEffect(() => {
    loadOrder('cookie', true);
  }, []);
  useEffect(() => {
    if (!order || !clientToken) return;
    const refresh = () => { if (!loading && !submittingDecision) loadOrder(clientToken); };
    window.addEventListener('tinzel:refresh-order', refresh);
    return () => window.removeEventListener('tinzel:refresh-order', refresh);
  }, [order, clientToken, loading, submittingDecision]);

  const loadOrder = async (token, restore = false) => {
    setLoading(true);
    setError(null); setErrorStatus(null);
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
      if (retainedFeedbackFor.current && retainedFeedbackFor.current !== data.order._id) {
        setRevisionAudio(null); setRevisionItems([{ text: '', pageReference: '' }]); setShowRevisionForm(false);
      }
      retainedFeedbackFor.current = null;
      setOtpSent(false); setOtpCode(''); setResendAt(0); setCodeUntil(0);
      setLastLoaded(Date.now()); setLoadFailed(false); setDecisionUncertain(false);
      setSuccessMsg(null);
      const reference = data.order.submissionId || data.order.trackingId;
      if (reference) localStorage.setItem('tinzel_tracking_reference', reference);
    } catch (err) {
      setLoadFailed(true); setErrorStatus(err.status);
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
    e?.preventDefault();
    if (loading || resendWait) return;
    const invalid = {};
    if (!trackingId.trim()) invalid.reference = ui('Enter your order number.', 'Weka namba ya oda yako.');
    if (!normalizePhone(clientWhatsApp)) invalid.phone = ui('Enter the phone number used for this order.', 'Weka namba ya simu iliyotumika kwa oda hii.');
    setEntryErrors(invalid);
    if (Object.keys(invalid).length) { setError(t('track.err.enterBoth')); document.getElementById(invalid.reference ? 'track-login-id' : 'track-login-whatsapp')?.focus(); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await api.client.requestOtp(trackingId.trim(), clientWhatsApp.trim());
      if (res.clientToken) {
        await loadOrder(res.clientToken);
        return;
      }
      setOtpSent(true); setOtpCode(''); setCodeUntil(Date.now() + 600000); setResendAt(Date.now() + 60000); otpInput.current?.focus();
      if (res.devOtp) setDevOtp(res.devOtp);
      setSuccessMsg(t('track.ok.otpSent'));
    } catch (err) {
      setError(err.message || t('track.err.requestOtp')); setErrorStatus(err.status);
      if (err.status === 429) setResendAt(Date.now() + 60000);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (loading || codeExpired) return;
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setEntryErrors({ code: ui('Enter the six-digit SMS code.', 'Weka msimbo wa SMS wa tarakimu sita.') }); otpInput.current?.focus();
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
      setError(err.message || t('track.err.invalidOtp')); setErrorStatus(err.status);
      if (err.status === 429) setResendAt(Date.now() + 60000);
    } finally {
      setLoading(false);
    }
  };

  const clearSession = useCallback((preserveFeedback = false) => {
    setClientToken('');
    sessionStorage.removeItem('tinzel_client_token');
    setOrder(null);
    if (!preserveFeedback) {
      retainedFeedbackFor.current = null;
      setRevisionAudio(null);
      setRevisionItems([{ text: '', pageReference: '' }]);
      setShowRevisionForm(false);
    }
    setOtpSent(false);
    setOtpCode('');
    setResendAt(0); setCodeUntil(0);
    setSuccessMsg(null);
  }, []);
  useEffect(() => {
    const expired = () => {
      // Parallel requests may report expiry again after the order was cleared.
      // Keep the original binding until the same order is verified or the draft is discarded.
      if (hasFeedback && order?._id) retainedFeedbackFor.current = order._id;
      clearSession(hasFeedback);
      setError(t('track.err.sessionExpired'));
    };
    window.addEventListener('tinzel:client:unauthorized', expired);
    return () => window.removeEventListener('tinzel:client:unauthorized', expired);
  }, [clearSession, t, hasFeedback, order?._id]);

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
    if (decisionUncertain || (readerVersion && readerVersion !== order.currentDraftVersion)) return;
    if (!(await confirm({ title: ui('Approve this magazine for printing?', 'Uidhinishe jarida hili kwa uchapishaji?'), description: t('track.confirm.approve'), confirmLabel: t('track.decision.approve') }))) return;
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
      setError(err.message || t('track.err.approve')); setErrorStatus(err.status);
      if (!err.status || err.status >= 500 || [408, 409].includes(err.status)) setDecisionUncertain(true);
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleRequestRevision = async (e) => {
    e.preventDefault();
    if (proofState.composing || proofState.saving || decisionUncertain || (readerVersion && readerVersion !== order.currentDraftVersion)) return;
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
      setError(err.message || t('track.err.revision')); setErrorStatus(err.status);
      if (!err.status || err.status >= 500 || [408, 409].includes(err.status)) setDecisionUncertain(true);
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

          {error && <StatePanel kind="error" title={ui('We could not continue', 'Hatukuweza kuendelea')} description={error}>
            {clientToken && <ActionButton className="ui-button" loading={loading} disabled={loading} onClick={() => loadOrder(clientToken)}>{ui('Retry Loading Order', 'Jaribu kupakia oda tena')}</ActionButton>}
          </StatePanel>}
          {resendWait > 0 && !otpSent && <p role="status">{ui(`Please wait ${resendWait}s before requesting another code.`, `Subiri sekunde ${resendWait} kabla ya kuomba msimbo mwingine.`)}</p>}
          {successMsg && <StatePanel compact kind="success" title={successMsg} />}
          {retainedFeedbackFor.current && <StatePanel compact kind="info" title={ui('Your unsent feedback is still on this page', 'Maoni yako ambayo hayajatumwa bado yapo kwenye ukurasa huu')} description={ui('Verify access to the same order to continue. Keep this page open; feedback has not been submitted.', 'Thibitisha ufikiaji wa oda hii hiyo ili kuendelea. Usifunge ukurasa huu; maoni hayajawasilishwa.')} />}
          {codeExpired && <StatePanel compact kind="warning" title={ui('Your SMS code has expired', 'Msimbo wako wa SMS umeisha')} description={ui('Request a new code to continue.', 'Omba msimbo mpya ili kuendelea.')} />}
          {!otpSent ? (
            <form noValidate onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  htmlFor="track-login-id"
                  style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}
                >
                  {t('track.login.trackingId')}
                </label>
                <input
                  id="track-login-id" aria-invalid={Boolean(entryErrors.reference)} aria-describedby={entryErrors.reference ? 'track-login-id-error' : undefined}
                  type="text"
                  placeholder={t('track.login.trackingIdPh')}
                  required
                  value={trackingId}
                  onChange={(e) => { setTrackingId(e.target.value.toUpperCase()); setEntryErrors(previous => ({ ...previous, reference: null })); }}
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
                {entryErrors.reference && <p id="track-login-id-error" style={{ color: 'var(--accent-danger)' }}>{entryErrors.reference}</p>}
              </div>

              <div>
                <label
                  htmlFor="track-login-whatsapp"
                  style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}
                >
                  {t('track.login.whatsapp')}
                </label>
                <PhoneInput
                  id="track-login-whatsapp" aria-invalid={Boolean(entryErrors.phone)} aria-describedby={entryErrors.phone ? 'track-login-whatsapp-error' : undefined}
                  type="tel"
                  autoComplete="tel"
                  placeholder={t('track.login.whatsappPh')}
                  required
                  value={clientWhatsApp}
                  onChange={(e) => { setClientWhatsApp(e.target.value); setEntryErrors(previous => ({ ...previous, phone: null })); }}
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
                {entryErrors.phone && <p id="track-login-whatsapp-error" style={{ color: 'var(--accent-danger)' }}>{entryErrors.phone}</p>}
              </div>

              <ActionButton
                type="submit"
                disabled={loading || (!otpSent && resendWait > 0)}
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
                {loading ? ui('Sending SMS code…', 'Tunatuma msimbo wa SMS…') : t('track.login.sendCode')}
              </ActionButton>
            </form>
          ) : (
            <form noValidate onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  htmlFor="track-login-otp"
                  style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}
                >
                  {t('track.login.enterOtp')}
                </label>
                <input
                  id="track-login-otp"
                  aria-invalid={Boolean(entryErrors.code)}
                  aria-describedby={entryErrors.code ? 'track-code-error' : undefined}
                  ref={otpInput}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="123456"
                  required
                  value={otpCode}
                  onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setEntryErrors(previous => ({ ...previous, code: null })); }}
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
                {entryErrors.code && <p id="track-code-error" style={{ color: 'var(--accent-danger)' }}>{entryErrors.code}</p>}
                {devOtp && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--info)' }}>
                    {t('track.login.devOtp')} <strong>{devOtp}</strong>
                  </div>
                )}
              </div>

              <ActionButton
                type="submit"
                disabled={loading || codeExpired}
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
                {loading ? ui('Verifying access…', 'Tunathibitisha ufikiaji…') : t('track.login.verify')}
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
              <ActionButton loading={loading} type="button" className="ui-button" disabled={loading || resendWait > 0} onClick={handleRequestOtp}>
                {resendWait > 0 ? ui(`Resend available in ${resendWait}s`, `Tuma tena baada ya sekunde ${resendWait}`) : ui('Resend verification code', 'Tuma msimbo tena')}
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
          <ClientNotifications token={clientToken} onUnauthorized={handleUnauthorized} />
          <button type="button" className="ui-button" onClick={async () => { if (await allowProofLeave() && await allowFeedbackLeave()) handleLogout(true); }}>
            {ui('Stop remembering this order', 'Usikumbuke oda hii tena')}
          </button>
          <ActionButton onClick={async () => { if (await allowProofLeave() && await allowFeedbackLeave()) handleLogout(); }}>
            <LogOut size={13} /> {t('track.signOut')}
          </ActionButton>
        </div>
      </div>

      <StatePanel compact kind={journey.complete ? 'success' : order.status === 'on_hold' || order.status === 'awaiting_payment' ? 'warning' : 'info'} title={t(journey.statusKey)} description={order.status === 'on_hold' ? order.holdReason || t(journey.detailKey) : t(journey.detailKey)}>
        <ActionButton className="ui-button" loading={loading} disabled={loading || submittingDecision} onClick={() => loadOrder(clientToken)}>{ui('Refresh order', 'Sasisha oda')}</ActionButton>
        {lastLoaded && <small>{ui('Last checked: ', 'Ilihakikiwa mwisho: ')}{new Date(lastLoaded).toLocaleTimeString(lang === 'sw' ? 'sw-TZ' : 'en-TZ')}</small>}
      </StatePanel>
      {loadFailed && <StatePanel compact kind="warning" title={ui('These details may be out of date', 'Taarifa hizi huenda si za sasa')} description={ui('We could not refresh your order. Your previously loaded details remain visible.', 'Hatukuweza kusasisha oda yako. Taarifa zilizopakiwa awali bado zinaonekana.')} />}
      {/* Awaiting Payment Guidance Banner */}
      {order.status === 'awaiting_payment' && (
        <div
          style={{
            backgroundColor: 'var(--accent-gold-light)',
            border: '1px solid var(--border-color)',
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
              color: 'var(--text-gold)',
              fontWeight: '700',
              fontSize: '15px',
            }}
          >
            <CreditCard size={18} />
            <span>{t('pay.title')}</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '12px', lineHeight: '1.5' }}>
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

      {successMsg && <StatePanel kind="success" title={successMsg} />}
      {error && <StatePanel kind="error" title={errorStatus === 409 ? ui('This order has changed', 'Oda hii imebadilika') : ui('The action could not finish', 'Hatua haikukamilika')} description={error}><ActionButton className="ui-button" loading={loading} disabled={loading} onClick={() => loadOrder(clientToken)}>{ui('Check latest order', 'Hakiki oda ya sasa')}</ActionButton></StatePanel>}
      {decisionUncertain && <StatePanel kind="warning" title={ui('Check the result before trying again', 'Hakiki matokeo kabla ya kujaribu tena')} description={ui('We could not confirm your decision. Refresh the order to check its current status. Your unsent feedback is still here.', 'Hatukuweza kuthibitisha uamuzi wako. Sasisha oda uhakiki hali yake. Maoni yako ambayo hayajatumwa bado yapo.')}><ActionButton className="ui-button" loading={loading} disabled={loading} onClick={() => loadOrder(clientToken)}>{ui('Check decision status', 'Hakiki hali ya uamuzi')}</ActionButton></StatePanel>}
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
              onChange={async (e) => { const next = Number(e.target.value); if (await allowProofLeave()) setReaderVersion(next); }}
            >
              {(order.draftVersions || []).map((v) => (
                <option key={v.versionNumber} value={v.versionNumber}>
                  {ui('Version', 'Toleo')} {v.versionNumber}
                </option>
              ))}
            </select>
          </label>
          {readerVersion && readerVersion !== order.currentDraftVersion && <StatePanel compact kind="info" title={ui('You are viewing an earlier version', 'Unaangalia toleo la awali')} description={ui('Open the current version before approving or requesting changes.', 'Fungua toleo la sasa kabla ya kuidhinisha au kuomba marekebisho.')}><ActionButton className="ui-button" onClick={async () => { if (await allowProofLeave()) setReaderVersion(order.currentDraftVersion); }}>{ui('Open current version', 'Fungua toleo la sasa')}</ActionButton></StatePanel>}
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
                    disabled={submittingDecision || audioBusy || proofState.composing || proofState.saving || decisionUncertain || Boolean(readerVersion && readerVersion !== order.currentDraftVersion)}
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
                    disabled={submittingDecision || audioBusy || proofState.composing || proofState.saving || decisionUncertain || Boolean(readerVersion && readerVersion !== order.currentDraftVersion)}
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
                      disabled={submittingDecision || audioBusy || proofState.composing || proofState.saving || decisionUncertain || Boolean(readerVersion && readerVersion !== order.currentDraftVersion)}
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
                      onClick={async () => { if (await allowFeedbackLeave()) { setShowRevisionForm(false); setRevisionAudio(null); setRevisionItems([{ text: '', pageReference: '' }]); } }}
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
            <StatePanel compact kind="success" title={t('track.approved.title', { version: order.approvedVersionNumber })} description={t('track.approved.body')} />
          ) : order.status === 'revision_requested' ? (
            <StatePanel compact kind="info" title={t('track.revreq.title')} description={t('track.revreq.body')} />
          ) : null}
        </div>
      ) : <StatePanel kind="info" title={journey.complete ? ui('No magazine preview is available', 'Hakuna hakikisho la jarida linalopatikana') : ui('Your magazine preview is not ready yet', 'Hakikisho la jarida lako bado halijawa tayari')} description={journey.complete ? ui('This order is complete. A preview is no longer available here; contact Tinzel if you need help with this order.', 'Oda hii imekamilika. Hakikisho halipatikani hapa; wasiliana na Tinzel ukihitaji msaada wa oda hii.') : order.status === 'awaiting_payment' ? ui('Follow the payment instructions above. Your preview will appear here when it is ready for review.', 'Fuata maelekezo ya malipo hapo juu. Hakikisho litaonekana hapa likiwa tayari kukaguliwa.') : ui('Your order is still in progress. The preview will appear here when it is released for you to review.', 'Oda yako bado inaendelea. Hakikisho litaonekana hapa likitolewa kwa ajili yako kukagua.')} />}

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
