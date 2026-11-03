import PasswordGuidance, { passwordReady } from './PasswordGuidance';
import React, { useState } from 'react';
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
    if (mode === 'password' && next !== confirm) {
      setError(t('Passwords do not match.', 'Manenosiri hayalingani.'));
      return;
    }
    setBusy(true);
    try {
      const data =
        mode === 'profile'
          ? await api.staffAuth.updateProfile(token, { name, phone })
          : await api.staffAuth.changePassword(token, current, next);
      onUpdate(data);
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
        onCancel={() => !busy && setMode(null)}
        footer={null}
        destroyOnClose
      >
        <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
          {error && <p role="alert">{error}</p>}
          {mode === 'profile' ? (
            <>
              <label>
                {t('Name', 'Jina')}
                <input
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                {t('Phone', 'Simu')}
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label>
                {t('Email', 'Barua pepe')}
                <input readOnly value={user.email} />
              </label>
              <label>
                {t('Role', 'Wajibu')}
                <input readOnly value={role} />
              </label>
            </>
          ) : (
            <>
              <label>
                {t('Current password', 'Nenosiri la sasa')}
                <input
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
                  required
                  minLength={15}
                  type="password"
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                />
              </label>
              <label>
                {t('Confirm password', 'Thibitisha nenosiri')}
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
            </>
          )}
          {mode === 'password' && <PasswordGuidance value={next} />}
          <button className="ui-button is-primary" disabled={busy}>
            {busy ? t('Saving…', 'Inahifadhi…') : t('Save', 'Hifadhi')}
          </button>
        </form>
      </Modal>
    </>
  );
}
