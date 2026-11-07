import PhoneInput from '../common/PhoneInput';
import PageSkeleton from '../common/PageSkeleton';
import { ActionButton } from '../common/SoftFlutter';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
const retentionKey = 'magazine_retention_days';
const verificationKey = 'staff_login_verification_hours';
const verificationIntervals = [[0, 'Every login', 'Kila kuingia'], [1, '1 hour', 'Saa 1'], [6, '6 hours', 'Saa 6'], [12, '12 hours', 'Saa 12'], [24, '1 day', 'Siku 1'], [72, '3 days', 'Siku 3'], [168, '7 days', 'Siku 7'], [336, '14 days', 'Siku 14'], [720, '30 days', 'Siku 30']];
const operationalFields = [
  ['printer_name', 'Printer name', 'Jina la mchapishaji'],
  ['printer_whatsapp_phone', 'Printer WhatsApp', 'WhatsApp ya mchapishaji'],
  ['printer_email', 'Printer email', 'Barua pepe ya mchapishaji'],
  ['printer_preferred_language', 'Printer language', 'Lugha ya mchapishaji'],
  ['support_phone', 'Support phone', 'Simu ya msaada'],
  ['support_email', 'Support email', 'Barua pepe ya msaada'],
  ['payment_instructions', 'Payment instructions', 'Maelekezo ya malipo'],
  [
    'default_max_workload',
    'Default designer capacity',
    'Kikomo cha kazi cha awali',
  ],
];
const fieldLabels = {
  NEXTSMS_AUTH_MODE: ['Authentication', 'Uthibitisho'],
  NEXTSMS_API_KEY: ['API key', 'Ufunguo wa API'],
  NEXTSMS_USERNAME: ['Username', 'Jina la mtumiaji'],
  NEXTSMS_PASSWORD: ['Password', 'Nenosiri'],
  NEXTSMS_SENDER_ID: ['Sender ID', 'Jina la mtumaji'],
  SMTP_HOST: ['SMTP host', 'Seva ya SMTP'],
  SMTP_PORT: ['Port', 'Mlango'],
  SMTP_SECURE: ['TLS connection', 'Muunganisho wa TLS'],
  SMTP_USER: ['SMTP username', 'Jina la SMTP'],
  SMTP_PASS: ['SMTP password', 'Nenosiri la SMTP'],
  SMTP_FROM: ['Sender address', 'Anwani ya mtumaji'],
  TWILIO_ACCOUNT_SID: ['Account SID', 'SID ya akaunti'],
  TWILIO_AUTH_TOKEN: ['Auth token', 'Tokeni ya uthibitisho'],
  TWILIO_PHONE_NUMBER: ['Phone number', 'Namba ya simu'],
  TWILIO_WHATSAPP_NUMBER: ['WhatsApp number', 'Namba ya WhatsApp'],
  TWILIO_STATUS_CALLBACK_URL: [
    'Status callback URL',
    'Anwani ya taarifa za uwasilishaji',
  ],
  ENABLE_TWILIO_SMS_FALLBACK: ['SMS fallback', 'SMS ya akiba'],
};
export default function AdminSystemSettings({ token }) {
  const { lang } = useLanguage(),
    t = (en, sw) => (lang === 'sw' ? sw : en);
  const [initialLoading, setInitialLoading] = useState(true);
  const [providers, setProviders] = useState([]),
    [config, setConfig] = useState({}),
    [configLoaded, setConfigLoaded] = useState(false),
    [drafts, setDrafts] = useState({}),
    [remove, setRemove] = useState({}),
    [busy, setBusy] = useState({}),
    [notice, setNotice] = useState({}),
    [error, setError] = useState({});
  const loadProviders = () =>
    api.providerConfig
      .get(token)
      .then((r) => setProviders(r.providers))
      .catch(() =>
        setError((x) => ({
          ...x,
          providers: t(
            'Unable to load providers.',
            'Imeshindikana kupakia watoa huduma.',
          ),
        })),
      );
  const loadConfig = () =>
    api.admin
      .getConfig(token)
      .then((r) => {
        setConfig(Object.fromEntries(r.configs.map((x) => [x.key, x.value])));
        setConfigLoaded(true);
        setError(x => ({ ...x, config: '' }));
      })
      .catch(() =>
        setError((x) => ({
          ...x,
          config: t(
            'Unable to load settings.',
            'Imeshindikana kupakia mipangilio.',
          ),
        })),
      );
  useEffect(() => {
    let active = true;
    setInitialLoading(true);
    Promise.allSettled([loadProviders(), loadConfig()]).finally(() => { if (active) setInitialLoading(false); });
    return () => { active = false; };
  }, [token]);
  const run = async (key, action) => {
    setBusy((x) => ({ ...x, [key]: true }));
    setError((x) => ({ ...x, [key]: '' }));
    setNotice((x) => ({ ...x, [key]: '' }));
    try {
      await action();
    } catch (e) {
      setError((x) => ({ ...x, [key]: e.message }));
    } finally {
      setBusy((x) => ({ ...x, [key]: false }));
    }
  };
  const feedback = (key) => (
    <>
      {error[key] && <p role="alert">{error[key]}</p>}
      {notice[key] && <p role="status">{notice[key]}</p>}
    </>
  );
  if (initialLoading) return <PageSkeleton variant="form" />;
  return (
    <section style={{ marginTop: 32 }}>
      <h2>{t('Configuration', 'Mipangilio')}</h2>
      {feedback('config')}
      {error.config && (
        <ActionButton className="ui-button" onClick={loadConfig}>
          {t('Retry', 'Jaribu tena')}
        </ActionButton>
      )}
      <div className="system-settings-grid">
        <article className="system-settings-card">
          <h3>{t('Magazine history retention', 'Muda wa kuhifadhi historia ya magazeti')}</h3>
          <form onSubmit={event => {
            event.preventDefault();
            run(retentionKey, async () => {
              const result = await api.admin.updateConfig(token, { key: retentionKey, value: Number(config[retentionKey] ?? 7) });
              setConfig(current => ({ ...current, [retentionKey]: result.config.value }));
              setNotice(current => ({ ...current, [retentionKey]: t('Retention period saved.', 'Muda wa kuhifadhi umehifadhiwa.') }));
            });
          }}>
            <label htmlFor="magazine-retention-days">{t('Keep completed submissions for (days)', 'Hifadhi mawasilisho yaliyokamilika kwa (siku)')}</label>
            <input id="magazine-retention-days" type="number" min="1" max="3650" step="1" required
              aria-describedby="magazine-retention-help" value={config[retentionKey] ?? 7}
              disabled={!configLoaded || busy[retentionKey] || !!error.config}
              onChange={event => setConfig(current => ({ ...current, [retentionKey]: event.target.value }))} />
            <p id="magazine-retention-help">{t(
              'Default: 7 days after delivery or closure. Active orders stay available. After this period, the magazine, photos, drafts, submission details and related history are permanently deleted.',
              'Kwa kawaida: siku 7 baada ya kuwasilishwa au kufungwa. Oda zinazoendelea zinabaki. Baada ya muda huu, gazeti, picha, rasimu, maelezo ya uwasilishaji na historia husika hufutwa kabisa.'
            )}</p>
            <p>{t('Applies to existing and future completed orders. Shortening this period can delete older submissions on the next cleanup. Deletion cannot be undone.', 'Inatumika kwa oda zilizokamilika sasa na zijazo. Kupunguza muda kunaweza kufuta mawasilisho ya zamani wakati wa usafishaji unaofuata. Ufutaji hauwezi kutenguliwa.')}</p>
            {feedback(retentionKey)}
            <ActionButton loading={busy[retentionKey]} className="ui-button" disabled={!configLoaded || busy[retentionKey] || !!error.config}>{t('Save retention period', 'Hifadhi muda wa kuhifadhi')}</ActionButton>
          </form>
        </article>

        <article className="system-settings-card">
          <h3>{t('Sign-in security', 'Usalama wa kuingia')}</h3>
          <form onSubmit={event => {
            event.preventDefault();
            run(verificationKey, async () => {
              const result = await api.admin.updateConfig(token, { key: verificationKey, value: Number(config[verificationKey] ?? 168) });
              setConfig(current => ({ ...current, [verificationKey]: result.config.value }));
              setNotice(current => ({ ...current, [verificationKey]: t('Verification interval saved.', 'Muda wa uthibitisho umehifadhiwa.') }));
            });
          }}>
            <label htmlFor="staff-verification-interval">{t('Sign-in verification interval', 'Muda kati ya uthibitisho wa kuingia')}</label>
            <select id="staff-verification-interval" aria-describedby="staff-verification-help" value={config[verificationKey] ?? 168}
              disabled={!configLoaded || busy[verificationKey] || !!error.config}
              onChange={event => setConfig(current => ({ ...current, [verificationKey]: Number(event.target.value) }))}>
              {verificationIntervals.map(([value, en, sw]) => <option key={value} value={value}>{t(en, sw)}</option>)}
            </select>
            <p id="staff-verification-help">{t(
              'Admins and managers verify once per interval on the same browser, including after signing out. A new browser or changed password requires a code. Passwords are still required at every sign-in.',
              'Wasimamizi na meneja huthibitisha mara moja kwa muda huu kwenye kivinjari kilekile, hata baada ya kutoka. Kivinjari kipya au kubadilisha nenosiri kunahitaji msimbo. Nenosiri linahitajika kila unapoingia.'
            )}</p>
            <p>{t('The interval starts when a sign-in SMS code is verified. Sensitive actions still require recent verification.', 'Muda huanza msimbo wa SMS unapothibitishwa. Vitendo nyeti bado vinahitaji uthibitisho wa karibuni.')}</p>
            {feedback(verificationKey)}
            <ActionButton loading={busy[verificationKey]} className="ui-button" disabled={!configLoaded || busy[verificationKey] || !!error.config}>{t('Save verification interval', 'Hifadhi muda wa uthibitisho')}</ActionButton>
          </form>
        </article>
        <article className="system-settings-card">
          <h3>{t('Operational settings', 'Mipangilio ya uendeshaji')}</h3>
          {operationalFields.map(([key, en, sw]) => (
            <form
              key={key}
              onSubmit={(e) => {
                e.preventDefault();
                run(key, async () => {
                  await api.admin.updateConfig(token, {
                    key,
                    value:
                      key === 'default_max_workload'
                        ? Number(config[key] || 5)
                        : (config[key] ?? ''),
                  });
                  setNotice((x) => ({
                    ...x,
                    [key]: t('Saved.', 'Imehifadhiwa.'),
                  }));
                });
              }}
              style={{ marginBottom: 20 }}
            >
              <label>
                {t(en, sw)}
                {key === 'printer_preferred_language' ? (
                  <select
                    value={config[key] || 'sw'}
                    onChange={(e) =>
                      setConfig((x) => ({ ...x, [key]: e.target.value }))
                    }
                  >
                    <option value="en">English</option>
                    <option value="sw">Kiswahili</option>
                  </select>
                ) : key.includes('phone') ? (
                  <PhoneInput value={config[key] || ''} onChange={e => setConfig(x => ({ ...x, [key]: e.target.value }))} />
                ) : key === 'payment_instructions' ? (
                  <textarea
                    maxLength={2000}
                    value={config[key] || ''}
                    onChange={(e) =>
                      setConfig((x) => ({ ...x, [key]: e.target.value }))
                    }
                  />
                ) : (
                  <input
                    type={
                      key === 'default_max_workload'
                        ? 'number'
                        : key.includes('email')
                          ? 'email'
                          : 'text'
                    }
                    min={key === 'default_max_workload' ? 1 : undefined}
                    max={key === 'default_max_workload' ? 20 : undefined}
                    value={
                      config[key] ?? (key === 'default_max_workload' ? 5 : '')
                    }
                    onChange={(e) =>
                      setConfig((x) => ({ ...x, [key]: e.target.value }))
                    }
                  />
                )}
              </label>
              {feedback(key)}
              <ActionButton loading={busy[key]}
                disabled={busy[key] || !!error.config}
                className="ui-button"
                style={{ marginTop: 8 }}
              >
                {t('Save', 'Hifadhi')}
              </ActionButton>
            </form>
          ))}
        </article>
        {providers.map((provider) => (
          <article key={provider.provider} className="system-settings-card">
            <h3>
              {provider.provider === 'smtp'
                ? 'SMTP Email'
                : provider.provider === 'nextsms'
                  ? 'NextSMS'
                  : 'Twilio / WhatsApp'}
            </h3>
            <form
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                run(provider.provider, async () => {
                  const result = await api.providerConfig.save(
                    token,
                    provider.provider,
                    {
                      values: drafts[provider.provider] || {},
                      remove: remove[provider.provider] || [],
                      revision: provider.revision,
                    },
                  );
                  setProviders(result.providers);
                  setDrafts((x) => ({ ...x, [provider.provider]: {} }));
                  setRemove((x) => ({ ...x, [provider.provider]: [] }));
                  setNotice((x) => ({
                    ...x,
                    [provider.provider]: t(
                      'Settings saved. Existing secrets remain hidden.',
                      'Mipangilio imehifadhiwa. Siri zilizopo zinaendelea kufichwa.',
                    ),
                  }));
                });
              }}
            >
              {provider.fields.map((field) => (
                <div key={field.name} style={{ marginBottom: 16 }}>
                  <label>
                    {t(...fieldLabels[field.name])}
                    {[
                      'NEXTSMS_AUTH_MODE',
                      'SMTP_SECURE',
                      'ENABLE_TWILIO_SMS_FALLBACK',
                    ].includes(field.name) ? (
                      <select
                        value={
                          drafts[provider.provider]?.[field.name] ??
                          field.value ??
                          ''
                        }
                        onChange={(e) =>
                          setDrafts((x) => ({
                            ...x,
                            [provider.provider]: {
                              ...x[provider.provider],
                              [field.name]: e.target.value,
                            },
                          }))
                        }
                      >
                        <option value="">
                          {t('Deployment default', 'Mpangilio wa seva')}
                        </option>
                        {(field.name === 'NEXTSMS_AUTH_MODE'
                          ? ['auto', 'api_key', 'basic']
                          : ['true', 'false']
                        ).map((value) => (
                          <option key={value} value={value}>
                            {value === 'auto'
                              ? t('Automatic', 'Kiotomatiki')
                              : value === 'api_key'
                                ? 'API key'
                                : value === 'basic'
                                  ? t(
                                      'Username and password',
                                      'Jina na nenosiri',
                                    )
                                  : value === 'true'
                                    ? t('Enabled', 'Imewashwa')
                                    : t('Disabled', 'Imezimwa')}
                          </option>
                        ))}
                      </select>
                    ) : ['TWILIO_PHONE_NUMBER', 'TWILIO_WHATSAPP_NUMBER'].includes(field.name) ? (
                      <PhoneInput value={drafts[provider.provider]?.[field.name] ?? field.value ?? ''}
                        onChange={e => setDrafts(x => ({ ...x, [provider.provider]: { ...x[provider.provider], [field.name]: e.target.value } }))} />
                    ) : (
                      <input
                        type={field.secret ? 'password' : 'text'}
                        autoComplete="new-password"
                        value={
                          drafts[provider.provider]?.[field.name] ??
                          (field.secret ? '' : field.value)
                        }
                        placeholder={
                          field.secret && field.configured
                            ? t(
                                'Configured — leave blank to keep',
                                'Imesanidiwa — acha wazi kuhifadhi',
                              )
                            : ''
                        }
                        onChange={(e) =>
                          setDrafts((x) => ({
                            ...x,
                            [provider.provider]: {
                              ...x[provider.provider],
                              [field.name]: e.target.value,
                            },
                          }))
                        }
                      />
                    )}
                  </label>
                  <small>
                    {field.source === 'saved'
                      ? t('Saved override', 'Mpangilio uliohifadhiwa')
                      : field.source === 'environment'
                        ? t('Deployment default', 'Mpangilio wa seva')
                        : t('Not configured', 'Haijasanidiwa')}
                  </small>
                  {field.source === 'saved' && (
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      <input
                        style={{ width: 'auto' }}
                        type="checkbox"
                        checked={(remove[provider.provider] || []).includes(
                          field.name,
                        )}
                        onChange={(e) =>
                          setRemove((x) => ({
                            ...x,
                            [provider.provider]: e.target.checked
                              ? [...(x[provider.provider] || []), field.name]
                              : (x[provider.provider] || []).filter(
                                  (k) => k !== field.name,
                                ),
                          }))
                        }
                      />
                      {t(
                        'Remove override; use deployment default',
                        'Ondoa mpangilio huu; tumia wa seva',
                      )}
                    </label>
                  )}
                </div>
              ))}
              {feedback(provider.provider)}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <ActionButton loading={busy[provider.provider]}
                  className="ui-button is-primary"
                  disabled={busy[provider.provider]}
                >
                  {t('Save settings', 'Hifadhi mipangilio')}
                </ActionButton>
                <ActionButton loading={busy[provider.provider]}
                  type="button"
                  className="ui-button"
                  disabled={busy[provider.provider]}
                  onClick={() =>
                    run(provider.provider, async () => {
                      const r = await api.providerConfig.check(
                        token,
                        provider.provider,
                      );
                      setNotice((x) => ({
                        ...x,
                        [provider.provider]: !r.configured
                          ? t('Not configured.', 'Haijasanidiwa.')
                          : r.connected
                            ? t(
                                'Connection verified.',
                                'Muunganisho umethibitishwa.',
                              )
                            : t(
                                'Connection failed. Check credentials and provider status.',
                                'Muunganisho umeshindikana. Kagua taarifa za akaunti na huduma.',
                              ),
                      }));
                    })
                  }
                >
                  {t(
                    'Check saved connection',
                    'Kagua muunganisho uliohifadhiwa',
                  )}
                </ActionButton>
              </div>
              {error[provider.provider] && (
                <button
                  type="button"
                  className="ui-button"
                  onClick={() => {
                    setDrafts({});
                    setRemove({});
                    loadProviders();
                  }}
                >
                  {t(
                    'Reload saved settings',
                    'Pakia mipangilio iliyohifadhiwa',
                  )}
                </button>
              )}
            </form>
          </article>
        ))}
      </div>
      {feedback('providers')}
      {error.providers && (
        <ActionButton className="ui-button" onClick={loadProviders}>
          {t('Retry', 'Jaribu tena')}
        </ActionButton>
      )}
      <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>
        {t(
          'Hosting, database, storage credentials and encryption keys are managed in deployment settings. Connection checks use saved values; they do not send messages.',
          'Taarifa za seva, hifadhidata, hifadhi na funguo za usimbaji husimamiwa kwenye seva. Ukaguzi hutumia mipangilio iliyohifadhiwa na hautumi ujumbe.',
        )}
      </p>
    </section>
  );
}
