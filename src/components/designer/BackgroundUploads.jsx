import { staffOrderText } from '../../utils/orderDisplay';
import TransferProgress from '../common/TransferProgress';
import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, FileText, UploadCloud, X } from 'lucide-react';
import { draftUploads, useDraftUploads } from '../../hooks/useDraftUploads';
import { useLanguage } from '../../i18n/LanguageContext';
import { navigate } from '../../navigation/location';
import DraftUploadProgress from './DraftUploadProgress';
import StatePanel, { StateError } from '../common/StatePanel';
import { useConfirm } from '../common/ConfirmDialog';
import './backgroundUploads.css';

export default function BackgroundUploads() {
  const jobs = useDraftUploads();
  const confirm = useConfirm();
  const [collapsed, setCollapsed] = useState(false);
  const { lang } = useLanguage();
  const tx = (en, sw) => lang === 'sw' ? sw : en;
  const active = jobs.filter(job => ['queued', 'uploading', 'canceling'].includes(job.status));
  useEffect(() => {
    const guard = event => {
      if (!draftUploads.hasActive()) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, []);
  if (!jobs.length) return null;
  return (
    <section className="background-uploads" aria-label={tx('Magazine uploads', 'Upakiaji wa majarida')}>
      <header className="background-uploads-header">
        <UploadCloud size={19} aria-hidden="true" />
        <strong role="status">{active.length ? tx(`Uploading ${active.length} magazine${active.length === 1 ? '' : 's'}`, `Inapakia majarida ${active.length}`) : tx('Magazine uploads', 'Upakiaji wa majarida')}</strong>
        <button type="button" onClick={() => setCollapsed(value => !value)} aria-expanded={!collapsed} aria-controls="background-upload-list" aria-label={collapsed ? tx('Expand uploads', 'Panua upakiaji') : tx('Minimize uploads', 'Punguza upakiaji')}>
          {collapsed ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {!active.length && <button type="button" aria-label={tx('Dismiss uploads', 'Funga upakiaji')} onClick={() => jobs.forEach(job => draftUploads.dismiss(job.id))}><X size={18} /></button>}
      </header>
      <div id="background-upload-list" hidden={collapsed}>
        <p className="background-uploads-hint">{active.length ? tx('Keep working in Tinzel. Keep this tab open until uploads finish.', 'Endelea kufanya kazi Tinzel. Acha kichupo hiki wazi hadi upakiaji ukamilike.') : tx('Your upload activity', 'Shughuli zako za upakiaji')}</p>
        <ul className="background-uploads-list">
          {jobs.map(job => <li key={job.id}>
            <div className="background-upload-file">
              {job.status === 'complete' ? <CheckCircle2 className="background-upload-done" size={22} aria-hidden="true" /> : <FileText size={22} aria-hidden="true" />}
              <div><strong title={job.name}>{job.name}</strong><small>{staffOrderText(job.label)}</small></div>
              {['ready', 'complete', 'error'].includes(job.status) && <button type="button" aria-label={`${tx('Dismiss', 'Funga')} ${job.name}`} onClick={() => draftUploads.dismiss(job.id)}><X size={16} /></button>}
            </div>
            {['uploading', 'error'].includes(job.status) && <DraftUploadProgress progress={job.progress} paused={job.status === 'error'} />}
            {job.status === 'queued' && <p role="status">{tx('Waiting for the current upload…', 'Inasubiri upakiaji unaoendelea…')}</p>}
            {job.status === 'canceling' && <TransferProgress progress={{ stage: 'finalizing' }} label={tx('Canceling upload…', 'Inaghairi upakiaji…')} />}
            {job.status === 'error' && <StateError compact error={job.error} title={tx('Upload needs attention', 'Upakiaji unahitaji kushughulikiwa')} />}
            {job.status === 'ready' && <StatePanel compact kind="info" title={tx('Uploaded, awaiting your review', 'Imepakiwa, inasubiri ukaguzi wako')} description={tx('Review corrections before submitting this version to the manager.', 'Kagua marekebisho kabla ya kuwasilisha toleo hili kwa meneja.')} />}
            {job.status === 'complete' && <StatePanel compact kind="success" title={tx('Sent to manager review', 'Imetumwa kwa ukaguzi wa meneja')} />}
            <div className="background-upload-actions">
              {job.status === 'error' && <button type="button" onClick={() => draftUploads.retry(job.id)}>{tx('Retry upload', 'Jaribu kupakia tena')}</button>}
              {['queued', 'uploading', 'error'].includes(job.status) && <button type="button" disabled={job.status === 'uploading' && job.progress?.stage === 'finalizing'} onClick={async () => { if (await confirm({ title: tx('Cancel this upload?', 'Ghairi upakiaji huu?'), description: tx('This removes the unfinished upload. Existing magazine versions remain.', 'Hii itaondoa upakiaji ambao haujakamilika. Matoleo ya jarida yaliyopo yatabaki.'), confirmLabel: tx('Cancel upload', 'Ghairi upakiaji'), cancelLabel: tx('Keep uploading', 'Endelea kupakia'), danger: true })) draftUploads.cancel(job.id); }}>{tx('Cancel', 'Ghairi')}</button>}
              {['ready', 'complete'].includes(job.status) && <button type="button" onClick={() => navigate(`/staff/design/orders/${encodeURIComponent(job.orderId)}${job.status === 'ready' ? '?reviewUpload=1' : ''}`)}>{job.status === 'ready' ? tx('Review corrections', 'Kagua marekebisho') : tx('View order', 'Angalia oda')}</button>}
            </div>
          </li>)}
        </ul>
      </div>
    </section>
  );
}
