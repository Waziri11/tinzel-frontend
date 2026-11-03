import PasswordGuidance, { passwordReady } from './PasswordGuidance';
import React, { useState } from 'react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import TinzelLogo from './TinzelLogo';

export default function InitialPasswordSetup({ token, user, onComplete, onLogout }) {
  const { lang } = useLanguage(),
    sw = lang === 'sw';
  const [current, setCurrent] = useState(''),
    [next, setNext] = useState(''),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const text = (en, swahili) => (sw ? swahili : en);
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (next !== confirm) {
      setError(text('New passwords do not match.', 'Manenosiri mapya hayalingani.'));
      return;
    }
    if (!passwordReady(next)) { setError(text('Use at least 15 characters and at most 72 bytes.', 'Tumia angalau herufi 15 na hadi baiti 72.')); return; }
    setBusy(true);
    try {
      const result = await api.staffAuth.changePassword(token, current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      onComplete(result);
    } catch (error) {
      setError(error.message || text('Unable to change the password.', 'Imeshindikana kubadilisha nenosiri.'));
    } finally {
      setBusy(false);
    }
  };
  const input = {
    display: 'block',
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: 6,
    marginTop: 5,
    fontSize: 16,
  };
  return (
    <section
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background: 'var(--bg-primary)',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 24,
          border: '1px solid var(--border-color)',
          borderRadius: 10,
          background: 'var(--bg-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <TinzelLogo variant="full" height={32} />
          <LanguageSwitcher />
        </div>
        <h1 style={{ fontSize: 24, margin: '20px 0 8px' }}>{text('Set your own password', 'Weka nenosiri lako')}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{user.email}</p>
        <p style={{ fontSize: 14, margin: '12px 0' }}>
          {text(
            'Before using Tinzel, replace the initial password sent by SMS and email.',
            'Kabla ya kutumia Tinzel, badilisha nenosiri la awali ulilotumiwa kwa SMS na barua pepe.',
          )}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          {text(
            'Use at least 15 characters. Spaces and long passphrases are welcome.',
            'Tumia angalau herufi 15. Nafasi na vifungu virefu vinaruhusiwa.',
          )}
        </p>
        {error && (
          <p role="alert" style={{ color: 'var(--accent-danger)', fontSize: 14, marginBottom: 12 }}>
            {error}
          </p>
        )}
        <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
          <label>
            {text('Initial password', 'Nenosiri la awali')}
            <input
              required
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              style={input}
            />
          </label>
          <label>
            {text('New password', 'Nenosiri jipya')}
            <input
              required
              type="password"
              minLength={15}
              autoComplete="new-password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              style={input}
            />
          </label>
          <label>
            {text('Confirm new password', 'Thibitisha nenosiri jipya')}
            <input
              required
              type="password"
              minLength={15}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              style={input}
            />
          </label>
          <PasswordGuidance value={next} />
          <button
            disabled={busy}
            style={{ padding: 12, borderRadius: 6, background: 'var(--text-main)', color: 'white' }}
          >
            {busy ? text('Saving…', 'Inahifadhi…') : text('Save password and continue', 'Hifadhi nenosiri na uendelee')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onLogout}
            style={{ padding: 8, background: 'transparent', color: 'var(--text-muted)' }}
          >
            {text('Sign out', 'Ondoka')}
          </button>
        </form>
      </section>
    </section>
  );
}
