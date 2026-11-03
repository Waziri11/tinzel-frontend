import { ActionButton } from './SoftFlutter';
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import TurnstileCheck from './TurnstileCheck';
import PasswordGuidance, { passwordReady } from './PasswordGuidance';
import './security-controls.css';
export default function PasswordRecovery({ initialEmail, onClose }) {
  const { lang } = useLanguage(), t = (en, sw) => lang === 'sw' ? sw : en;
  const [stage, setStage] = useState('request'), [email, setEmail] = useState(initialEmail || ''), [code, setCode] = useState('');
  const [challenge, setChallenge] = useState(''), [grant, setGrant] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [captcha, setCaptcha] = useState(''), [reset, setReset] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState(''), [seconds, setSeconds] = useState(0), [expires, setExpires] = useState(0);
  useDialogFocus(true, () => { if (!busy) onClose(); });
  useEffect(() => { const timer = setInterval(() => { setSeconds(x => Math.max(0, x - 1)); setExpires(x => Math.max(0, x - 1)); }, 1000); return () => clearInterval(timer); }, []);
  const run = async fn => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const request = () => run(async () => {
    try { const data = await api.staffAuth.recovery('request', { email, captchaToken: captcha }); setChallenge(data.challengeId); setCode(''); setSeconds(data.resendAfter); setExpires(data.expiresIn); setStage('verify'); }
    finally { setCaptcha(''); setReset(x => x + 1); }
  });
  return <div className="auth-overlay"><section className="security-panel auth-card" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
    <button type="button" disabled={busy} onClick={onClose}>{t('Back to sign in', 'Rudi kuingia')}</button>
    <h2 id="recovery-title">{t('Recover your account', 'Rejesha akaunti yako')}</h2>
    {error && <p role="alert">{error}</p>}
    {stage === 'request' && <form className="verification-form" onSubmit={e => { e.preventDefault(); request(); }}>
      <p>{t('We will send a verification code to the phone registered to your account.', 'Tutatuma msimbo wa uthibitishaji kwenye simu iliyosajiliwa kwenye akaunti yako.')}</p>
      <label>{t('Work email', 'Barua pepe ya kazi')}<input type="email" autoComplete="username" required autoFocus value={email} onChange={e => setEmail(e.target.value)} /></label>
      <TurnstileCheck action="recovery" onToken={setCaptcha} resetKey={reset} />
      <ActionButton loading={busy} className="verification-primary" disabled={busy || !captcha}>{t('Send recovery code', 'Tuma msimbo wa kurejesha')}</ActionButton>
    </form>}
    {stage === 'verify' && <><p>{t('If an eligible account exists, a code will arrive by SMS. Delivery can take a moment. Check your email spelling if it does not arrive.', 'Ikiwa akaunti inayostahili ipo, msimbo utatumwa kwa SMS. Unaweza kuchelewa kidogo. Hakiki barua pepe kama haujafika.')}</p>
      <form className="verification-form" onSubmit={e => { e.preventDefault(); run(async () => { const data = await api.staffAuth.recovery('verify', { challengeId: challenge, code }); setGrant(data.resetToken); setCode(''); setExpires(data.expiresIn); setStage('reset'); }); }}>
        <label>{t('Verification code', 'Msimbo wa uthibitishaji')}<input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></label>
        <p>{expires ? t(`Code expires in ${Math.ceil(expires / 60)} min.`, `Msimbo unaisha baada ya dakika ${Math.ceil(expires / 60)}.`) : t('Code expired. Request a new one.', 'Msimbo umeisha muda. Omba mpya.')}</p>
        <ActionButton loading={busy} className="verification-primary" disabled={busy || !expires}>{t('Verify code', 'Thibitisha msimbo')}</ActionButton>
      </form>
      {!seconds && <TurnstileCheck action="recovery" onToken={setCaptcha} resetKey={reset} />}
      <ActionButton loading={busy} type="button" disabled={busy || seconds > 0 || !captcha} onClick={request}>{seconds ? t(`Resend in ${seconds}s`, `Tuma tena baada ya sekunde ${seconds}`) : t('Send a new code', 'Tuma msimbo mpya')}</ActionButton>
      <button type="button" disabled={busy} onClick={() => { setStage('request'); setError(''); }}>{t('Change email', 'Badilisha barua pepe')}</button>
    </>}
    {stage === 'reset' && <form className="verification-form" onSubmit={e => { e.preventDefault(); if (password !== confirm) { setError(t('Passwords do not match.', 'Manenosiri hayalingani.')); return; } run(async () => { await api.staffAuth.recovery('reset', { resetToken: grant, newPassword: password }); setGrant(''); setPassword(''); setConfirm(''); setStage('done'); }); }}>
      <label>{t('New password', 'Nenosiri jipya')}<input autoFocus type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <PasswordGuidance value={password} />
      <label>{t('Confirm new password', 'Thibitisha nenosiri jipya')}<input type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
      {!expires && <p role="alert">{t('Recovery expired. Start again.', 'Muda wa kurejesha umeisha. Anza tena.')}</p>}
      <ActionButton loading={busy} className="verification-primary" disabled={busy || !passwordReady(password) || !expires}>{t('Reset password', 'Weka nenosiri upya')}</ActionButton>
      {!expires && <button type="button" onClick={() => { setStage('request'); setGrant(''); setError(''); }}>{t('Start again', 'Anza tena')}</button>}
    </form>}
    {stage === 'done' && <p role="status">{t('Your password has been reset and previous access revoked. Return to sign in with your new password.', 'Nenosiri limewekwa upya na ufikiaji wa awali umeondolewa. Rudi kuingia kwa nenosiri lako jipya.')}</p>}
    {stage !== 'done' && <p>{t('No access to your registered phone? Contact your Tinzel administrator for identity verification and phone replacement. Never share your password.', 'Huna simu iliyosajiliwa? Wasiliana na msimamizi wa Tinzel kuthibitisha utambulisho na kubadilisha simu. Usishiriki nenosiri lako.')}</p>}
  </section></div>;
}
