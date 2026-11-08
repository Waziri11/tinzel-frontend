import { Feedback } from './UI';
import { ActionButton } from './SoftFlutter';
import PasswordGuidance, { passwordReady } from './PasswordGuidance';
import PasswordInput from './PasswordInput';
import React, { useState, useRef } from 'react';
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
  const [fieldErrors, setFieldErrors] = useState({});
  const formRef = useRef(null);
  const clearFieldError = key => setFieldErrors(errors => ({ ...errors, [key]: '' }));
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const invalid = {};
    if (!passwordReady(next)) invalid.newPassword = text('Use at least 8 characters and at most 72 bytes.', 'Tumia angalau herufi 8 na hadi baiti 72.');
    if (next !== confirm) invalid.confirmPassword = text('New passwords do not match.', 'Manenosiri mapya hayalingani.');
    setFieldErrors(invalid);
    const firstInvalid = Object.keys(invalid)[0];
    if (firstInvalid) { formRef.current?.elements.namedItem(firstInvalid)?.focus(); return; }
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
            'Use at least 8 characters. Spaces and long passphrases are welcome.',
            'Tumia angalau herufi 8. Nafasi na vifungu virefu vinaruhusiwa.',
          )}
        </p>
        {error && <Feedback kind="error" title={text('Password was not changed', 'Nenosiri halijabadilishwa')}>{error}</Feedback>}
        <form ref={formRef} onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
          <label>
            {text('Initial password', 'Nenosiri la awali')}
            <PasswordInput
              disabled={busy}
              required
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              style={input}
            />
          </label>
          <label>
            {text('New password', 'Nenosiri jipya')}
            <PasswordInput
              disabled={busy}
              required
              minLength={8}
              autoComplete="new-password"
              name="newPassword"
              aria-invalid={Boolean(fieldErrors.newPassword)}
              aria-describedby={fieldErrors.newPassword ? 'initial-new-password-error' : undefined}
              value={next}
              onChange={(event) => { setNext(event.target.value); clearFieldError("newPassword"); clearFieldError("confirmPassword"); }}
              style={input}
            />
          </label>
          {fieldErrors.newPassword && <small id="initial-new-password-error" role="alert" style={{ color: 'var(--accent-danger, #B42318)', fontSize: 13 }}>{fieldErrors.newPassword}</small>}
          <label>
            {text('Confirm new password', 'Thibitisha nenosiri jipya')}
            <PasswordInput
              disabled={busy}
              required
              minLength={8}
              autoComplete="new-password"
              name="confirmPassword"
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              aria-describedby={fieldErrors.confirmPassword ? 'initial-confirm-password-error' : undefined}
              value={confirm}
              onChange={(event) => { setConfirm(event.target.value); clearFieldError("confirmPassword"); }}
              style={input}
            />
          </label>
          {fieldErrors.confirmPassword && <small id="initial-confirm-password-error" role="alert" style={{ color: 'var(--accent-danger, #B42318)', fontSize: 13 }}>{fieldErrors.confirmPassword}</small>}
          <PasswordGuidance value={next} />
          <ActionButton loading={busy}
            disabled={busy}
            style={{ padding: 12, borderRadius: 6, background: 'var(--text-main)', color: 'white' }}
          >
            {busy ? text('Saving…', 'Inahifadhi…') : text('Save password and continue', 'Hifadhi nenosiri na uendelee')}
          </ActionButton>
          <ActionButton loading={busy}
            type="button"
            disabled={busy}
            onClick={onLogout}
            style={{ padding: 8, background: 'transparent', color: 'var(--text-muted)' }}
          >
            {text('Sign out', 'Ondoka')}
          </ActionButton>
        </form>
      </section>
    </section>
  );
}
