import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { securityRequest } from './SecurityCenter';
import { requestVerification } from '../../services/api';
const activity = {
  AUTH_OTP_FAILED: ['Incorrect sign-in code', 'Msimbo wa kuingia si sahihi'], AUTH_RECOVERY_VERIFY_FAILED: ['Failed recovery verification', 'Uthibitishaji wa urejeshaji umeshindikana'],
  AUTH_LOGIN_SUCCEEDED: ['Signed in', 'Ameingia'], AUTH_LOGIN_FAILED: ['Failed sign-in', 'Kuingia kumeshindikana'], AUTH_LOGOUT: ['Signed out', 'Ametoka'],
  AUTH_RECOVERY_REQUESTED: ['Recovery requested', 'Urejeshaji umeombwa'], AUTH_RECOVERY_DELIVERY_FAILED: ['Recovery SMS unavailable', 'SMS ya urejeshaji haijapatikana'], AUTH_RECOVERY_VERIFIED: ['Recovery code verified', 'Msimbo wa urejeshaji umethibitishwa'],
  AUTH_PASSWORD_RESET: ['Password reset', 'Nenosiri limewekwa upya'], AUTH_PASSWORD_CHANGED: ['Password changed', 'Nenosiri limebadilishwa'], AUTH_CONTACT_CHANGED: ['Recovery phone changed', 'Simu ya urejeshaji imebadilishwa'],
  AUTH_ASSISTED_RECOVERY: ['Administrator-assisted recovery', 'Urejeshaji kwa msaada wa msimamizi'], AUTH_SESSION_REVOKED: ['Session revoked', 'Kipindi kimeondolewa'], AUTH_DEVICE_REVOKED: ['Trusted device removed', 'Kifaa kilichoaminika kimeondolewa'], AUTH_ALL_ACCESS_REVOKED: ['All access revoked', 'Ufikiaji wote umeondolewa'],
};
export default function AccountSecurity({ user }) {
  const { lang } = useLanguage(), t = (en, sw) => lang === 'sw' ? sw : en;
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(''), [phone, setPhone] = useState(''), [evidence, setEvidence] = useState(''), [confirmed, setConfirmed] = useState(false), [message, setMessage] = useState('');
  const reload = async () => setData(await securityRequest('staff/security'));
  useEffect(() => { let active = true; securityRequest('staff/security').then(result => { if (active) setData(result); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  const run = async fn => { setBusy(true); setError(''); setMessage(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const revoke = (kind, id) => run(async () => { const result = await securityRequest('staff/security/revoke', { kind, id }); if (result.signedOut) window.location.reload(); else await reload(); });
  const date = value => value ? new Date(value).toLocaleString(lang === 'sw' ? 'sw-TZ' : 'en-GB') : t('Unavailable', 'Haipatikani');
  return <section aria-label={t('Account access', 'Ufikiaji wa akaunti')}>
    <h3>{t('Your sessions and devices', 'Vipindi na vifaa vyako')}</h3>
    <p>{t('Removing a trusted device requires SMS verification at its next sign-in. Revoke its active session too to end current access.', 'Kuondoa kifaa kilichoaminika kutahitaji SMS kinapoingia tena. Ondoa pia kipindi chake ili kukomesha ufikiaji wa sasa.')}</p>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <button disabled={busy} onClick={() => run(reload)}>{t('Refresh activity', 'Sasisha shughuli')}</button>
    <button disabled={busy} onClick={() => run(async () => { await securityRequest('staff/security/revoke-all', {}); window.location.reload(); })}>{t('Sign out everywhere and forget devices', 'Toka kila mahali na uondoe vifaa')}</button>
    {!data && <p role="status">{t('Loading account activity…', 'Inapakia shughuli za akaunti…')}</p>}
    {data && <><h4>{t('Active sessions', 'Vipindi hai')}</h4>{!data.sessions.length && <p>{t('No active sessions.', 'Hakuna vipindi hai.')}</p>}{data.sessions.map(s => <div className="auth-record" key={s.id}><strong>{s.current ? t('This session', 'Kipindi hiki') : t('Other session', 'Kipindi kingine')}</strong><small>{s.browser || t('Browser details unavailable', 'Taarifa za kivinjari hazipatikani')}</small><small>{s.ipAddress} · {t('Last active', 'Ilitumika mwisho')}: {date(s.lastSeenAt || s.createdAt)}</small><button disabled={busy} onClick={() => revoke('session', s.id)}>{t('Sign out session', 'Ondoa kipindi')}</button></div>)}
      <h4>{t('Trusted devices', 'Vifaa vinavyoaminika')}</h4>{!data.devices.length && <p>{t('No trusted devices.', 'Hakuna vifaa vinavyoaminika.')}</p>}{data.devices.map(d => <div className="auth-record" key={d.id}><strong>{d.current ? t('This device', 'Kifaa hiki') : t('Other device', 'Kifaa kingine')}</strong><small>{d.browser}</small><small>{t('Trusted until', 'Kinaaminika hadi')}: {date(d.expiresAt)}</small><button disabled={busy} onClick={() => revoke('device', d.id)}>{t('Forget device', 'Ondoa kifaa')}</button></div>)}
      <details><summary>{t('Recent security activity', 'Shughuli za hivi karibuni za usalama')}</summary>{!data.events.length && <p>{t('No activity yet.', 'Hakuna shughuli bado.')}</p>}{data.events.map(e => <div className="auth-record" key={e.eventId}><strong>{activity[e.action]?.[lang === 'sw' ? 1 : 0] || t('Security event', 'Tukio la usalama')}</strong><small>{date(e.createdAt)} · {e.ipAddress}</small></div>)}</details></>}
    {user.role === 'admin' && <details><summary>{t('Help a staff member recover a lost phone', 'Msaidie mfanyakazi kurejesha simu iliyopotea')}</summary>
      <p>{t('For active managers and designers only. Verify identity independently using a known staff contact or in person. Record a case reference, never identity documents or passwords. Administrator accounts require your organization’s separate recovery process.', 'Kwa mameneja na wasanifu hai pekee. Thibitisha utambulisho kupitia mawasiliano ya kazi yanayojulikana au ana kwa ana. Andika rejea ya tukio, si nyaraka za utambulisho au manenosiri. Akaunti za wasimamizi zinahitaji utaratibu tofauti wa taasisi.')}</p>
      <form className="auth-fields" onSubmit={e => { e.preventDefault(); run(async () => {
        const body = { email, phone, evidence, identityConfirmed: confirmed };
        let challenge = await securityRequest('staff/security/assisted-recovery', body);
        await requestVerification({ ...challenge, verify: code => securityRequest('staff/security/assisted-recovery/verify', { challengeId: challenge.challengeId, code }), resend: async () => { challenge = await securityRequest('staff/security/assisted-recovery', body); return challenge; } });
        setMessage(t('Phone verified. The account owner can now use Forgot password.', 'Simu imethibitishwa. Mwenye akaunti anaweza kutumia Umesahau nenosiri.')); setEmail(''); setPhone(''); setEvidence(''); setConfirmed(false);
      }); }}>
        <label>{t('Staff email', 'Barua pepe ya mfanyakazi')}<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>{t('Replacement phone', 'Simu mpya')}<input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} /></label>
        <label>{t('Verification method and case reference', 'Njia ya uthibitishaji na rejea ya tukio')}<textarea minLength={20} maxLength={500} required value={evidence} onChange={e => setEvidence(e.target.value)} /></label>
        <label className="trust-choice"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{t('I independently verified this person’s identity.', 'Nimethibitisha utambulisho wa mtu huyu kwa njia huru.')}</label>
        <button disabled={busy}>{t('Verify replacement phone by SMS', 'Thibitisha simu mpya kwa SMS')}</button>
      </form>
    </details>}
  </section>;
}
