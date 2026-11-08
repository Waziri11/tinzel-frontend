import React, { useEffect, useRef, useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { ActionButton } from '../common/SoftFlutter';
import TinzelLogo from '../common/TinzelLogo';
import LanguageSwitcher from '../common/LanguageSwitcher';
import StatePanel, { StateError } from '../common/StatePanel';
import { useLanguage } from '../../i18n/LanguageContext';
import { downloadFile, fetchWithTimeout } from '../../services/api';
import '../common/security-controls.css';

export default function PrinterPortal() {
  const id = location.pathname.split('/')[2];
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const [challenge, setChallenge] = useState(null), [code, setCode] = useState('');
  const [accessUntil, setAccessUntil] = useState(0), [codeUntil, setCodeUntil] = useState(0);
  const [resendAt, setResendAt] = useState(0), [now, setNow] = useState(Date.now());
  const [error, setError] = useState(null), [notice, setNotice] = useState(''), [busy, setBusy] = useState('');
  const [codeError, setCodeError] = useState('');
  const codeInput = useRef(null);
  const verified = accessUntil > now;
  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const expired = challenge && codeUntil <= now;
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (challenge) codeInput.current?.focus(); }, [challenge]);
  const request = async (action, body) => {
    const response = await fetchWithTimeout(`${import.meta.env.VITE_API_URL || ''}/api/printer/invitations/${encodeURIComponent(id)}/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.message || ui('Unable to complete printer verification.', 'Hatukuweza kukamilisha uthibitishaji wa mchapishaji.')), { status: response.status });
    return data;
  };
  const run = async (operation, action) => {
    if (busy) return;
    setBusy(operation); setError(null); setNotice('');
    try { await action(); }
    catch (failure) {
      setError(failure);
      if (failure.status === 429) setResendAt(Date.now() + 60000);
      if (operation === 'download' && [401, 403, 404].includes(failure.status)) setAccessUntil(0);
    } finally { setBusy(''); }
  };
  const send = () => run('send', async () => {
    const result = await request('otp', {});
    setChallenge(result); setCode(''); setCodeError(''); setCodeUntil(Date.now() + (result.expiresIn || 300) * 1000);
    setResendAt(Date.now() + 60000); setNotice('sent');
  });
  const verify = event => {
    event.preventDefault();
    if (busy || expired) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setCodeError(ui('Enter the six-digit SMS code.', 'Weka msimbo wa tarakimu sita kutoka SMS.'));
      codeInput.current?.focus(); return;
    }
    setCodeError('');
    run('verify', async () => {
      await request('verify', { challengeId: challenge.challengeId, code: code.trim() });
      setChallenge(null); setCode(''); setAccessUntil(Date.now() + 600000); setNotice('verified');
    });
  };
  const download = () => run('download', async () => {
    await downloadFile(`/api/printer/invitations/${encodeURIComponent(id)}/file`, 'tinzel-magazine.pdf');
    setNotice('download');
  });
  const unavailable = error?.status === 404;
  const verificationError = error?.status === 401 && challenge;
  return <main className="ui-page" style={{ maxWidth: 640, padding: 'clamp(20px, 5vw, 48px)', margin: '3vh auto' }}>
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
      <a href="/" aria-label={ui('Tinzel home', 'Mwanzo wa Tinzel')}><TinzelLogo variant="full" height={44} /></a><LanguageSwitcher />
    </header>
    <h1 className="ui-title">{ui('Printer access', 'Ufikiaji wa mchapishaji')}</h1>
    <p className="ui-description">{ui('Verify with the SMS code sent to the printer phone selected by the manager. Download access lasts ten minutes after verification.', 'Thibitisha kwa msimbo wa SMS unaotumwa kwa simu ya mchapishaji iliyochaguliwa na meneja. Ufikiaji wa kupakua hudumu dakika kumi baada ya uthibitishaji.')}</p>
    {unavailable ? <StatePanel kind="warning" title={ui('This invitation is unavailable', 'Mwaliko huu haupatikani')} description={ui('The link may have expired, been revoked, or no longer match the approved print file. Ask the Tinzel manager for a new invitation.', 'Kiungo kinaweza kuwa kimeisha, kimeondolewa, au hakilingani tena na faili lililoidhinishwa. Mwombe meneja wa Tinzel mwaliko mpya.')}><a className="ui-button" href="/">{ui('Return home', 'Rudi mwanzo')}</a></StatePanel> : <>
      {error && (error.status === 401 && !challenge ? <StatePanel kind="warning" title={ui('Verify printer access again', 'Thibitisha tena ufikiaji wa mchapishaji')} description={ui('Your download session is no longer active. Request a new code below to continue.', 'Kipindi chako cha kupakua hakifanyi kazi tena. Omba msimbo mpya hapa chini ili kuendelea.')} /> : verificationError ? <StatePanel kind="error" title={ui('Check your verification code', 'Hakiki msimbo wako')} description={ui('The code is incorrect, expired, already used, or has reached its attempt limit. Check the latest SMS or request a new code.', 'Msimbo si sahihi, umeisha, umetumika, au umefikia kikomo cha majaribio. Hakiki SMS ya mwisho au omba msimbo mpya.')} /> : <StateError error={error} onRetry={!challenge && !verified && !cooldown ? send : verified ? download : undefined} />)}
      {notice === 'sent' && <StatePanel compact kind="success" title={ui('SMS code requested', 'Msimbo wa SMS umeombwa')} description={ui('Use the latest code. If the SMS is delayed, wait before requesting another.', 'Tumia msimbo wa mwisho. SMS ikichelewa, subiri kabla ya kuomba mwingine.')} />}
      {accessUntil > 0 && !verified && <StatePanel kind="warning" title={ui('Download access has ended', 'Ufikiaji wa kupakua umeisha')} description={ui('Verify again to download the approved file.', 'Thibitisha tena ili kupakua faili lililoidhinishwa.')} />}
      {!verified && <section className="ui-card" style={{ padding: 24 }}>
        {challenge && <form onSubmit={verify}>
          <label htmlFor="printer-code">{ui('SMS code', 'Msimbo wa SMS')}</label>
          <input ref={codeInput} id="printer-code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setCodeError(''); }} aria-invalid={Boolean(codeError || verificationError)} aria-describedby={codeError ? 'printer-code-error' : undefined} style={{ display: 'block', width: '100%', padding: 12, margin: '8px 0 16px', fontSize: 22, letterSpacing: 6 }} />
          {codeError && <p role="alert" id="printer-code-error" style={{ color: 'var(--accent-danger)' }}>{codeError}</p>}
          {expired && <StatePanel compact kind="warning" title={ui('The SMS code has expired', 'Msimbo wa SMS umeisha')} description={ui('Request a new code below.', 'Omba msimbo mpya hapa chini.')} />}
          <ActionButton className="ui-button is-primary" loading={busy === 'verify'} disabled={Boolean(busy) || expired}><ShieldCheck size={16} />{busy === 'verify' ? ui('Verifying access…', 'Tunathibitisha ufikiaji…') : ui('Verify access', 'Thibitisha ufikiaji')}</ActionButton>
        </form>}
        <ActionButton type="button" className="ui-button" style={{ marginTop: 16 }} loading={busy === 'send'} disabled={Boolean(busy) || cooldown > 0} onClick={send}>{busy === 'send' ? ui('Sending SMS code…', 'Tunatuma msimbo wa SMS…') : cooldown ? ui(`Request another code in ${cooldown}s`, `Omba msimbo mwingine baada ya sekunde ${cooldown}`) : challenge ? ui('Request a new SMS code', 'Omba msimbo mpya wa SMS') : ui('Send SMS code', 'Tuma msimbo wa SMS')}</ActionButton>
      </section>}
      {verified && <StatePanel kind="success" title={ui('Printer access verified', 'Ufikiaji wa mchapishaji umethibitishwa')} description={ui('You can download the approved print file. Access expires ten minutes after verification.', 'Unaweza kupakua faili lililoidhinishwa kwa uchapishaji. Ufikiaji unaisha dakika kumi baada ya uthibitishaji.')}><ActionButton className="ui-button is-primary" loading={busy === 'download'} disabled={Boolean(busy)} onClick={download}><Download size={16} />{busy === 'download' ? ui('Downloading print file…', 'Tunapakua faili la uchapishaji…') : ui('Download authorized print file', 'Pakua faili lililoidhinishwa')}</ActionButton></StatePanel>}
      {notice === 'download' && <StatePanel compact kind="success" title={ui('File handed to your browser', 'Faili limekabidhiwa kwa kivinjari')} description={ui('Check your browser downloads to open or save the print file.', 'Angalia upakuaji wa kivinjari chako ili kufungua au kuhifadhi faili.')} />}
    </>}
  </main>;
}
