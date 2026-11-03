import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { cancelTransfer, dismissTransfer, getTransfers, subscribeTransfers, transferIsActive } from '../../services/fileTransfers';
import TransferProgress from './TransferProgress';
export default function TransferActivity() {
  const jobs = useSyncExternalStore(subscribeTransfers, getTransfers, getTransfers);
  const [collapsed, setCollapsed] = useState(false);
  const { lang } = useLanguage(), sw = lang === 'sw';
  const active = jobs.filter(transferIsActive);
  useEffect(() => {
    if (!active.length) return;
    const guard = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [active.length]);
  if (!jobs.length) return null;
  return <aside className="transfer-activity" aria-label={sw ? 'Uhamisho wa faili' : 'File transfers'}>
    <header><strong>{sw ? 'Uhamisho wa faili' : 'File transfers'}{active.length ? ` (${active.length})` : ''}</strong>
      <button type="button" onClick={() => setCollapsed(x => !x)} aria-expanded={!collapsed} aria-label={sw ? 'Onyesha/ficha uhamisho' : 'Expand or collapse transfers'}>{collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}</button>
      {!active.length && <button type="button" onClick={() => jobs.forEach(job => dismissTransfer(job.id))} aria-label={sw ? 'Funga uhamisho' : 'Dismiss transfers'}><X size={18} /></button>}
    </header>
    <div hidden={collapsed} className="transfer-activity__list">{jobs.map(job => <section key={job.id}>
      <strong className="transfer-activity__name">{job.name}</strong>
      <TransferProgress progress={job} />
      {job.stage === 'error' && <p role="alert">{job.error}</p>}
      {transferIsActive(job) ? (!['finalizing', 'verifying'].includes(job.stage) && <button type="button" onClick={() => cancelTransfer(job.id)}>{sw ? 'Ghairi' : 'Cancel'}</button>) : <button type="button" onClick={() => dismissTransfer(job.id)}>{sw ? 'Funga' : 'Dismiss'}</button>}
    </section>)}</div>
  </aside>;
}
