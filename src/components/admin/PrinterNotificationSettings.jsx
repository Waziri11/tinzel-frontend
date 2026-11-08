import PageSkeleton from '../common/PageSkeleton';
import StatePanel, { StateError } from '../common/StatePanel';
import { useLanguage } from '../../i18n/LanguageContext';
import { ActionButton } from '../common/SoftFlutter';
import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
export default function PrinterNotificationSettings({ token }) {
  const tx = useInterfaceText();
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;

  const [language, setLanguage] = useState('sw'),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState(''),
    [error, setError] = useState(null),
    [loaded, setLoaded] = useState(false),
    [savedLanguage, setSavedLanguage] = useState(null);
  const load = async () => {
    setBusy(true); setError(null);
    try {
      const data = await api.admin.getConfig(token);
      const value = data.configs?.find(item => item.key === 'printer_preferred_language')?.value || 'sw';
      setLanguage(value); setSavedLanguage(value); setLoaded(true);
    } catch (err) { setError(err); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    let active = true;
    api.admin
      .getConfig(token)
      .then((data) => {
        if (active) { const value = data.configs?.find((item) => item.key === 'printer_preferred_language')?.value || 'sw'; setLanguage(value); setSavedLanguage(value); setLoaded(true); }
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [token]);
  const [initialized, setInitialized] = useState(false);
  useEffect(() => { if (!busy) setInitialized(true); }, [busy]);
  const save = async () => {
    if (!loaded || busy) return;
    setBusy(true);
    setError(null);
    setMessage('');
    try {
      await api.admin.updateConfig(token, { key: 'printer_preferred_language', value: language });
      setSavedLanguage(language);
      setMessage(ui('Printer notification language saved.', 'Lugha ya taarifa za mchapishaji imehifadhiwa.'));
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  };
  if (!initialized || (!loaded && busy)) return <PageSkeleton variant="form" compact />;
  if (!loaded) return <StateError compact error={error} title={ui('Printer language unavailable', 'Lugha ya mchapishaji haipatikani')} onRetry={load} />;
  return (
    <div
      style={{
        padding: 16,
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <label>
        <InterfaceText>Printer notification language</InterfaceText>
        <select
          aria-label={tx('Printer notification language')}
          value={language}
          disabled={busy}
          onChange={(event) => setLanguage(event.target.value)}
        >
          <option value="sw">
            <InterfaceText>Kiswahili</InterfaceText>
          </option>
          <option value="en">
            <InterfaceText>English</InterfaceText>
          </option>
        </select>
      </label>
      <ActionButton loading={busy} disabled={busy} onClick={save}>
        <InterfaceText>Save printer language</InterfaceText>
      </ActionButton>
      {language !== savedLanguage && <StatePanel compact kind="info" title={ui('Unsaved language change', 'Mabadiliko ya lugha hayajahifadhiwa')} />}
      {error && <StateError compact error={error} title={ui('Language was not saved', 'Lugha haijahifadhiwa')} onRetry={save} />}
      {message && <StatePanel compact kind="success" title={message} />}
    </div>
  );
}
