import PageSkeleton from './PageSkeleton';
import StatePanel, { StateError } from './StatePanel';
import { ActionButton, InlineLoading } from './SoftFlutter';
import React, { useState, useEffect, useRef } from 'react';
import AdminSystemSettings from '../admin/AdminSystemSettings';
import StaffWorkloadManager from '../admin/StaffWorkloadManager';
import './systemPage.css';
import { ArrowLeft, ChevronRight, CreditCard, Printer, Headphones, Users, ShieldCheck, Archive, MessagesSquare, Activity, ClipboardList } from 'lucide-react';
import { navigate } from '../../navigation/location';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
const bytes = (value) =>
  value == null
    ? null
    : `${(value / 1024 / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} MB`;
function SystemOverview({ token }) {
  const { lang } = useLanguage(),
    t = (en, sw) => (lang === 'sw' ? sw : en);
  const [sections, setSections] = useState({}),
    [loading, setLoading] = useState({}),
    [errors, setErrors] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);
  const refresh = async (only) => {
    const names = typeof only === 'string' ? [only] : ['runtime', 'storage', 'messaging'];
    await Promise.all(names.map(async name => {
      setLoading((x) => ({ ...x, [name]: true }));
      setErrors((x) => ({ ...x, [name]: false }));
      await api.system
        .section(token, name)
        .then((data) => setSections((x) => ({ ...x, [name]: data })))
        .catch((error) => setErrors((x) => ({ ...x, [name]: error })))
        .finally(() => setLoading((x) => ({ ...x, [name]: false })));
    }));
    setInitialLoading(false);
  };
  useEffect(() => {
    refresh();
  }, [token]);
  const no = t('Unavailable', 'Haipatikani'),
    row = (label, value) => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          padding: '10px 0',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <span>{label}</span>
        <strong>{value ?? no}</strong>
      </div>
    );
  const configured = (x) =>
    x ? t('Configured', 'Imesanidiwa') : t('Not configured', 'Haijasanidiwa');
  if (initialLoading) return <PageSkeleton variant="board" />;
  return (
    <section>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <h2>{t('System status', 'Hali ya mfumo')}</h2>
        <ActionButton
          className="ui-button"
          onClick={refresh}
          disabled={Object.values(loading).some(Boolean)}
        >
          {t('Refresh', 'Onyesha upya')}
        </ActionButton>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))',
          gap: 20,
        }}
      >
        {['runtime', 'storage', 'messaging'].map((name) => {
          const data = sections[name];
          return (
            <article
              key={name}
              style={{
                padding: 20,
                border: '1px solid var(--border-color)',
                background: 'white',
                borderRadius: 10,
                minWidth: 0,
              }}
              aria-busy={!!loading[name]}
            >
              <h2>
                {name === 'runtime'
                  ? t('Application', 'Programu')
                  : name === 'storage'
                    ? t('Storage', 'Hifadhi')
                    : t('Messaging services', 'Huduma za ujumbe')}
              </h2>
              {loading[name] && (
                <InlineLoading>{t('Refreshing…', 'Inasasisha…')}</InlineLoading>
              )}
              {errors[name] && <StateError compact error={errors[name]} title={t('Measurement unavailable', 'Takwimu hazipatikani')} onRetry={() => refresh(name)} />}
              {errors[name] && data && <StatePanel compact kind="warning" title={t('Showing the last measurement', 'Inaonyesha kipimo cha mwisho')} description={t('These values may be out of date. Other sections remain available.', 'Thamani hizi zinaweza kuwa za zamani. Sehemu nyingine zinaendelea kupatikana.')} />}
              {data && (
                <>
                  {name === 'runtime' ? (
                    <>
                      {row(
                        t(
                          'Application memory used',
                          'Kumbukumbu inayotumiwa na programu',
                        ),
                        bytes(data.processMemoryBytes),
                      )}
                      {row(
                        t(
                          'JavaScript heap used / allocated',
                          'Heap ya JavaScript iliyotumika / iliyotengwa',
                        ),
                        `${bytes(data.heapUsedBytes)} / ${bytes(data.heapAllocatedBytes)}`,
                      )}
                      {row(
                        t('Hosting RAM available', 'RAM ya seva iliyopo'),
                        bytes(data.hostingRamAvailableBytes),
                      )}
                      {row(
                        t('Instance uptime', 'Muda wa programu kufanya kazi'),
                        `${Math.floor(data.uptimeSeconds / 60)} min`,
                      )}
                      {row(
                        t('Database', 'Hifadhidata'),
                        data.database === 'connected'
                          ? t('Connected', 'Imeunganishwa')
                          : t('Disconnected', 'Haijaunganishwa'),
                      )}
                    </>
                  ) : name === 'storage' ? (
                    <>
                      {row(
                        t('Database data', 'Data ya hifadhidata'),
                        bytes(data.databaseDataBytes),
                      )}
                      {row(
                        t('Allocated database storage', 'Hifadhi iliyotengwa'),
                        bytes(data.databaseStorageBytes),
                      )}
                      {row(
                        t('Database indexes', 'Faharasa za hifadhidata'),
                        bytes(data.indexBytes),
                      )}
                      {row(
                        t(
                          'Stored files (GridFS)',
                          'Faili zilizohifadhiwa (GridFS)',
                        ),
                        bytes(data.fileBytes),
                      )}
                      {row(
                        t(
                          'External storage usage',
                          'Matumizi ya hifadhi ya nje',
                        ),
                        bytes(data.externalStorageBytes),
                      )}
                      {row(
                        t('Storage quota', 'Kikomo cha hifadhi'),
                        bytes(data.quotaBytes),
                      )}
                    </>
                  ) : (
                    <>
                      {row(
                        t('SMS credits remaining', 'SMS zilizobaki'),
                        data.sms?.remaining,
                      )}
                      {row(
                        t('SMS gateway', 'Huduma ya SMS'),
                        !data.sms ? no : !data.sms.configured
                          ? configured(false)
                          : data.sms.connected
                            ? t('Connected', 'Imeunganishwa')
                            : t('Unavailable', 'Haipatikani'),
                      )}
                      {row(
                        t('Email', 'Barua pepe'),
                        data.email ? configured(data.email.configured) : no,
                      )}
                      {row('WhatsApp', data.whatsapp ? configured(data.whatsapp.configured) : no)}
                    </>
                  )}
                  <small style={{ display: 'block', marginTop: 16 }}>
                    {t('Measured', 'Imepimwa')}:{' '}
                    {new Date(data.measuredAt).toLocaleString(
                      lang === 'sw' ? 'sw-TZ' : 'en-GB',
                    )}
                  </small>
                </>
              )}
            </article>
          );
        })}
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 16 }}>
        {t(
          'Application memory describes this running instance. Provider quotas and external storage are shown only when available. File totals are part of database storage, not additional usage.',
          'Kumbukumbu ni za programu hii inayofanya kazi. Vikomo vya mtoa huduma na hifadhi ya nje huonyeshwa vinapopatikana. Jumla ya faili ni sehemu ya hifadhi ya hifadhidata.',
        )}
      </p>
    </section>
  );
}

const settingsGroups = [
  {
    title: ['Orders & customers', 'Oda na wateja'],
    items: [
      { id: 'payments', icon: CreditCard, title: ['Payment settings', 'Mipangilio ya malipo'], description: ['Manage payment methods and the instructions customers see after ordering.', 'Simamia njia za malipo na maelekezo ambayo wateja huona baada ya kuagiza.'] },
      { id: 'printing', icon: Printer, title: ['Printing', 'Uchapishaji'], description: ['Set printer contacts and the language used for printing notifications.', 'Weka mawasiliano ya mchapishaji na lugha ya taarifa za uchapishaji.'] },
      { id: 'support', icon: Headphones, title: ['Customer support', 'Msaada kwa wateja'], description: ['Keep your customer support phone number and email address up to date.', 'Sasisha namba ya simu na barua pepe za msaada kwa wateja.'] },
    ],
  },
  {
    title: ['Team & policies', 'Timu na sera'],
    items: [
      { id: 'capacity', icon: Users, title: ['Staff capacity', 'Uwezo wa wafanyakazi'], description: ['Set the default number of orders a designer can work on at a time.', 'Weka idadi ya kawaida ya oda ambazo mbunifu anaweza kushughulikia kwa wakati mmoja.'] },
      { id: 'security', icon: ShieldCheck, title: ['Security settings', 'Mipangilio ya usalama'], description: ['Choose how often admins and managers verify their sign-in with a code.', 'Chagua mara ambazo wasimamizi na meneja huthibitisha kuingia kwa msimbo.'] },
      { id: 'retention', icon: Archive, title: ['Magazine history', 'Historia ya magazeti'], description: ['Choose how long completed orders and their files are kept.', 'Chagua muda wa kuhifadhi oda zilizokamilika pamoja na faili zake.'] },
    ],
  },
  {
    title: ['Services & monitoring', 'Huduma na ufuatiliaji'],
    items: [
      { id: 'messaging', icon: MessagesSquare, title: ['Messaging services', 'Huduma za ujumbe'], description: ['Configure SMS, email and WhatsApp providers and check their connections.', 'Sanidi watoa huduma za SMS, barua pepe na WhatsApp na ukague miunganisho yao.'] },
      { id: 'status', icon: Activity, title: ['System status', 'Hali ya mfumo'], description: ['View application health, storage usage and messaging availability.', 'Angalia hali ya programu, matumizi ya hifadhi na upatikanaji wa huduma za ujumbe.'] },
      { id: 'diagnostics', icon: ClipboardList, title: ['Diagnostics & history', 'Uchunguzi na historia'], description: ['Review notification delivery, check connections and inspect activity logs.', 'Pitia uwasilishaji wa taarifa, kagua miunganisho na rekodi za shughuli.'] },
    ],
  },
];
const categories = settingsGroups.flatMap(group => group.items);
const readCategory = () => {
  const value = new URLSearchParams(window.location.search).get('category');
  return categories.some(item => item.id === value) ? value : null;
};

export default function SystemPage({ token, user }) {
  const { lang } = useLanguage();
  const t = (en, sw) => lang === 'sw' ? sw : en;
  const [category, setCategory] = useState(readCategory);
  const [editorVisited, setEditorVisited] = useState(Boolean(category && !['status', 'diagnostics'].includes(category)));
  const previousCategory = useRef(category);
  const heading = useRef(null);
  const cardRefs = useRef({});
  const selected = categories.find(item => item.id === category);
  const isAdmin = user.role === 'admin';
  useEffect(() => {
    const sync = () => setCategory(readCategory());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  useEffect(() => {
    if (category && !['status', 'diagnostics'].includes(category)) setEditorVisited(true);
    if (previousCategory.current !== category) {
      if (category) heading.current?.focus();
      else cardRefs.current[previousCategory.current]?.focus();
    }
    previousCategory.current = category;
  }, [category]);
  const openCategory = (next) => navigate(next ? `/staff/system?category=${next}` : '/staff/system');
  if (!isAdmin) return <section className="system-page"><h1 className="ui-title">{t('System', 'Mfumo')}</h1><SystemOverview token={token} /></section>;
  return (
    <section className="system-page">
      {selected ? (
        <header className="system-settings-header">
          <button type="button" className="ui-button system-settings-back" onClick={() => openCategory(null)}>
            <ArrowLeft size={17} aria-hidden="true" />{t('Back to settings', 'Rudi kwenye mipangilio')}
          </button>
          <h1 ref={heading} tabIndex={-1} className="ui-title">{t(...selected.title)}</h1>
          <p className="ui-description">{t(...selected.description)}</p>
        </header>
      ) : (
        <>
          <header className="system-settings-header">
            <span className="ui-eyebrow">{t('Administration', 'Usimamizi')}</span>
            <h1 className="ui-title">{t('System settings', 'Mipangilio ya mfumo')}</h1>
            <p className="ui-description">{t('Manage Tinzel from one place. Choose a category to view or update its settings.', 'Simamia Tinzel sehemu moja. Chagua kundi ili kuona au kusasisha mipangilio yake.')}</p>
          </header>
          <div className="system-settings-groups">
            {settingsGroups.map((group, index) => (
              <section className="system-settings-group" key={index} aria-labelledby={`settings-group-${index}`}>
                <h2 id={`settings-group-${index}`}>{t(...group.title)}</h2>
                <div className="system-category-grid">
                  {group.items.map(({ id, icon: Icon, title, description }) => (
                    <button key={id} ref={element => { cardRefs.current[id] = element; }} type="button" className="system-category-card" onClick={() => openCategory(id)} aria-labelledby={`settings-title-${id}`} aria-describedby={`settings-description-${id}`}>
                      <span className="system-category-icon"><Icon size={22} strokeWidth={1.7} aria-hidden="true" /></span>
                      <span className="system-category-copy">
                        <span id={`settings-title-${id}`} className="system-category-title">{t(...title)}</span>
                        <span id={`settings-description-${id}`} className="system-category-description">{t(...description)}</span>
                      </span>
                      <ChevronRight className="system-category-arrow" size={17} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
      <div hidden={!selected || ['status', 'diagnostics'].includes(category)}>
        {editorVisited && <AdminSystemSettings token={token} category={category} />}
      </div>
      {category === 'status' && <SystemOverview token={token} />}
      {category === 'diagnostics' && <div className="system-diagnostics-panel"><StaffWorkloadManager token={token} initialTab="notifs" systemOnly /></div>}
    </section>
  );
}
