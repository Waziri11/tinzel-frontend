import { createPortal } from 'react-dom';
import { Feedback } from './UI';
import { useConfirm } from './ConfirmDialog';
import PhoneInput from './PhoneInput';
import { ActionButton } from './SoftFlutter';
import PasswordGuidance, { passwordReady } from './PasswordGuidance';
import React, { useState, useEffect, useRef } from 'react';
import { normalizePhone } from '../../utils/phone';
import { Dropdown, Modal } from 'antd';
import { useLanguage } from '../../i18n/LanguageContext';
import { api } from '../../services/api';
export default function StaffProfile({
  user,
  token,
  onUpdate,
  onLogout,
  onCloseSidebar,
}) {
  const { lang } = useLanguage(),
    t = (en, sw) => (lang === 'sw' ? sw : en);
  const confirmAction = useConfirm();
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const formRef = useRef(null);
  const clearFieldError = key => setFieldErrors(errors => ({ ...errors, [key]: '' }));
  useEffect(() => { if (!success) return; const timer = setTimeout(() => setSuccess(''), 6000); return () => clearTimeout(timer); }, [success]);
  const close = async () => {
    if (busy) return;
    const dirty = mode === 'profile' ? name !== user.name || phone !== (user.phone || '') : Boolean(current || next || confirm);
    if (dirty && !(await confirmAction({ title: t('Discard these changes?', 'Uache mabadiliko haya?'), description: t('Your unfinished changes will not be saved.', 'Mabadiliko ambayo hujakamilisha hayatahifadhiwa.'), confirmLabel: t('Discard changes', 'Acha mabadiliko'), cancelLabel: t('Keep editing', 'Endelea kuhariri'), danger: true }))) return;
    setMode(null);
  };
  const [mode, setMode] = useState(null),
    [name, setName] = useState(user.name),
    [phone, setPhone] = useState(user.phone || ''),
    [current, setCurrent] = useState(''),
    [next, setNext] = useState(''),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const open = ({ key }) => {
    if (key === 'logout') {
      onLogout();
      return;
    }
    setError('');
    setFieldErrors({});
    setSuccess('');
    setName(user.name);
    setPhone(user.phone || '');
    setCurrent('');
    setNext('');
    setConfirm('');
    setMode(key);
    onCloseSidebar?.();
  };
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const invalid = {};
    if (mode === 'profile') {
      if (!name.trim()) invalid.profileName = t('Enter your name.', 'Weka jina lako.');
      if (!normalizePhone(phone)) invalid.profilePhone = t('Enter a valid phone number with its country code.', 'Weka namba sahihi ya simu pamoja na msimbo wa nchi.');
    } else {
      if (!passwordReady(next)) invalid.newPassword = t('Use at least 8 characters and at most 72 bytes.', 'Tumia angalau herufi 8 na hadi baiti 72.');
      if (next !== confirm) invalid.confirmPassword = t('Passwords do not match.', 'Manenosiri hayalingani.');
    }
    setFieldErrors(invalid);
    const firstInvalid = Object.keys(invalid)[0];
    if (firstInvalid) { formRef.current?.elements.namedItem(firstInvalid)?.focus(); return; }
    setBusy(true);
    try {
      const data =
        mode === 'profile'
          ? await api.staffAuth.updateProfile(token, { name, phone })
          : await api.staffAuth.changePassword(token, current, next);
      onUpdate(data);
      setSuccess(mode === 'profile' ? t('Your profile has been saved.', 'Wasifu wako umehifadhiwa.') : t('Your password has been changed.', 'Nenosiri lako limebadilishwa.'));
      setMode(null);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const role = {
    admin: t('Administrator', 'Msimamizi mkuu'),
    manager: t('Manager', 'Msimamizi'),
    designer: t('Designer', 'Msanifu'),
  }[user.role];
  return (
    <>
      {success && createPortal(<div className="tinzel-state-toast"><Feedback kind="success" title={success} /><button type="button" className="ui-button" onClick={() => setSuccess('')} aria-label={t('Dismiss confirmation', 'Funga uthibitisho')}>×</button></div>, document.body)}
      <Dropdown
        trigger={['click']}
        placement="topLeft"
        menu={{
          onClick: open,
          items: [
            { key: 'profile', label: t('My profile', 'Wasifu wangu') },
            {
              key: 'password',
              label: t('Change password', 'Badilisha nenosiri'),
            },
            { type: 'divider' },
            { key: 'logout', label: t('Sign out', 'Toka'), danger: true },
          ],
        }}
      >
        <button
          type="button"
          className="staff-profile-trigger"
          aria-label={t('Open profile menu', 'Fungua menyu ya wasifu')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: 12,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            textAlign: 'left',
          }}
        >
          <span
            style={{
              background: 'var(--accent-primary)',
              color: 'white',
              borderRadius: '50%',
              padding: 10,
            }}
          >
            {user.name
              .split(/\s+/)
              .slice(0, 2)
              .map((x) => x[0])
              .join('')
              .toUpperCase()}
          </span>
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <strong>{user.name}</strong>
            <small style={{ display: 'block', marginTop: 4 }}>{role}</small>
          </span>
        </button>
      </Dropdown>
      <Modal
        open={!!mode}
        title={
          mode === 'profile'
            ? t('My profile', 'Wasifu wangu')
            : t('Change password', 'Badilisha nenosiri')
        }
        onCancel={close}
        footer={null}
        destroyOnClose
      >
        <form ref={formRef} onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
          {error && <Feedback kind="error" title={t("Changes were not saved", "Mabadiliko hayajahifadhiwa")}>{error}</Feedback>}
          {mode === 'profile' ? (
            <>
              <label>
                {t('Name', 'Jina')}
                <input
                  disabled={busy}
                  required
                  maxLength={120}
                  name="profileName"
                  aria-invalid={Boolean(fieldErrors.profileName)}
                  aria-describedby={fieldErrors.profileName ? 'profile-name-error' : undefined}
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearFieldError("profileName"); }}
                />
              </label>
              {fieldErrors.profileName && <small id="profile-name-error" role="alert" style={{ color: 'var(--accent-danger, #B42318)', fontSize: 13 }}>{fieldErrors.profileName}</small>}
              <label>
                {t('Phone', 'Simu')}
                <PhoneInput
                  disabled={busy}
                  required
                  type="tel"
                  name="profilePhone"
                  aria-invalid={Boolean(fieldErrors.profilePhone)}
                  aria-describedby={fieldErrors.profilePhone ? 'profile-phone-error' : undefined}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); clearFieldError("profilePhone"); }}
                />
              </label>
              {fieldErrors.profilePhone && <small id="profile-phone-error" role="alert" style={{ color: 'var(--accent-danger, #B42318)', fontSize: 13 }}>{fieldErrors.profilePhone}</small>}
              <label>
                {t('Email', 'Barua pepe')}
                <input disabled={busy} readOnly value={user.email} />
              </label>
              <label>
                {t('Role', 'Wajibu')}
                <input disabled={busy} readOnly value={role} />
              </label>
            </>
          ) : (
            <>
              <label>
                {t('Current password', 'Nenosiri la sasa')}
                <input
                  disabled={busy}
                  required
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </label>
              <label>
                {t('New password', 'Nenosiri jipya')}
                <input
                  disabled={busy}
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  name="newPassword"
                  aria-invalid={Boolean(fieldErrors.newPassword)}
                  aria-describedby={fieldErrors.newPassword ? 'profile-new-password-error' : undefined}
                  value={next}
                  onChange={(e) => { setNext(e.target.value); clearFieldError("newPassword"); clearFieldError("confirmPassword"); }}
                />
              </label>
              {fieldErrors.newPassword && <small id="profile-new-password-error" role="alert" style={{ color: 'var(--accent-danger, #B42318)', fontSize: 13 }}>{fieldErrors.newPassword}</small>}
              <label>
                {t('Confirm password', 'Thibitisha nenosiri')}
                <input
                  disabled={busy}
                  required
                  type="password"
                  autoComplete="new-password"
                  name="confirmPassword"
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? 'profile-confirm-password-error' : undefined}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); clearFieldError("confirmPassword"); }}
                />
              </label>
              {fieldErrors.confirmPassword && <small id="profile-confirm-password-error" role="alert" style={{ color: 'var(--accent-danger, #B42318)', fontSize: 13 }}>{fieldErrors.confirmPassword}</small>}
            </>
          )}
          {mode === 'password' && <PasswordGuidance value={next} />}
          <ActionButton loading={busy} className="ui-button is-primary" disabled={busy}>
            {busy ? t('Saving…', 'Inahifadhi…') : t('Save', 'Hifadhi')}
          </ActionButton>
        </form>
      </Modal>
    </>
  );
}
