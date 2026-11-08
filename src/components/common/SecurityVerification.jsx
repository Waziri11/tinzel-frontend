import { Feedback } from './UI';
import TinzelLogo from './TinzelLogo';
import { ActionButton } from './SoftFlutter';
import './security-controls.css';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useLanguage } from '../../i18n/LanguageContext';
import React, { useEffect, useState } from 'react';
export default function SecurityVerification() {
  const { lang } = useLanguage(), t = (en, sw) => lang === 'sw' ? sw : en;
  const [request, setRequest] = useState(null), [code, setCode] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [trust, setTrust] = useState(false), [cooldown, setCooldown] = useState(0), [expires, setExpires] = useState(0);
  useEffect(() => {
    const handler = e => { setRequest(e.detail); setCode(''); setError(''); setMessage(''); setTrust(false); setCooldown(e.detail.challengeId ? Math.max(0, e.detail.resendAfter ?? 60) : 0); setExpires(e.detail.challengeId ? Math.max(0, e.detail.expiresIn ?? 300) : 0); };
    window.addEventListener('tinzel:verify', handler);
    const timer = setInterval(() => { setCooldown(x => Math.max(0, x - 1)); setExpires(x => Math.max(0, x - 1)); }, 1000);
    return () => { window.removeEventListener('tinzel:verify', handler); clearInterval(timer); };
  }, []);
  const close = () => { if (busy) return; request?.reject(new Error(t('Verification cancelled', 'Uthibitishaji umeghairiwa'))); setRequest(null); };
  useDialogFocus(Boolean(request), close);
  if (!request) return null;
  return <div className="auth-overlay" style={{ zIndex: 10000 }}><section className="security-panel auth-card" role="dialog" aria-modal="true" aria-labelledby="verification-title">
    <TinzelLogo variant="wordmark" height={28} /><h2 id="verification-title">{t('Verify your identity', 'Thibitisha utambulisho')}</h2>
    <p>{request.challengeId ? t('Enter the six-digit code sent by SMS.', 'Ingiza msimbo wa tarakimu sita uliotumwa kwa SMS.') : t('Send an SMS verification code to your account phone number.', 'Tuma msimbo wa SMS kwenye simu ya akaunti yako.')}</p>
    {error && <Feedback kind="error" title={t("Verification needs attention", "Uthibitishaji unahitaji kuangaliwa")}>{error}</Feedback>}{message && <Feedback kind="success" title={message} />}
    <form className="verification-form" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); setMessage(''); try { const result = await request.verify(code, trust); request.resolve(result); setRequest(null); } catch (err) { setError(err.message); } finally { setBusy(false); } }}>
      <label>{t('Verification code', 'Msimbo wa uthibitishaji')}<input autoFocus aria-label={t('Verification code', 'Msimbo wa uthibitishaji')} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></label>
      {request.allowTrust && <label className="trust-choice"><input type="checkbox" checked={trust} onChange={e => setTrust(e.target.checked)} />{t('Trust this private device. Do not select on a shared computer.', 'Amini kifaa hiki binafsi. Usichague kwenye kompyuta ya pamoja.')}</label>}
      {request.challengeId && expires > 0 && <p>{t(`Code expires in ${Math.ceil(expires / 60)} min.`, `Msimbo unaisha baada ya dakika ${Math.ceil(expires / 60)}.`)}</p>}
      {request.challengeId && !expires && <p role="status">{t('Code expired. Request a new one.', 'Msimbo umeisha muda. Omba mpya.')}</p>}
      <ActionButton loading={busy} className="verification-primary" disabled={busy || !request.challengeId || !expires} type="submit">{t('Verify code', 'Thibitisha msimbo')}</ActionButton>
    </form>
    <div className="verification-links"><ActionButton loading={busy} className="verification-link" type="button" disabled={busy || cooldown > 0} onClick={async () => { setBusy(true); setError(''); setMessage(''); try { const next = await request.resend('sms'); setRequest({ ...request, ...next }); setCode(''); setCooldown(Math.max(0, next.resendAfter ?? 60)); setExpires(Math.max(0, next.expiresIn ?? 300)); setMessage(t('A new code was sent.', 'Msimbo mpya umetumwa.')); } catch (err) { setError(err.message); } finally { setBusy(false); } }}>{cooldown ? t(`Resend in ${cooldown}s`, `Tuma tena baada ya sekunde ${cooldown}`) : t('Request a new code', 'Omba msimbo mpya')}</ActionButton><button className="verification-link" type="button" disabled={busy} onClick={close}>{t('Cancel', 'Ghairi')}</button></div>
  </section></div>;
}
