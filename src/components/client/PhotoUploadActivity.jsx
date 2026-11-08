import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Image, RotateCw, UploadCloud, X } from 'lucide-react';
import { localized } from '../../i18n/LanguageContext';
import { errorText } from '../../i18n/errors';
import { uploadIsStalled, uploadSummary } from '../../utils/uploadProgress';
import StatePanel from '../common/StatePanel';
import '../designer/backgroundUploads.css';
import './photoUploadActivity.css';

export default function PhotoUploadActivity({ uploads, fields, lang, disabled, openRequest }) {
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [offline, setOffline] = useState(!navigator.onLine);
  const input = useRef(null);
  const reselecting = useRef(null);
  const summary = uploadSummary(uploads.items);
  const active = uploads.items.some(item => ['queued', 'uploading'].includes(item.state));
  const locked = disabled || pending;

  useEffect(() => {
    if (summary.ready && !uploads.notice && !error) setCollapsed(true);
  }, [summary.ready, uploads.notice, error]);
  useEffect(() => {
    if (uploads.notice) setCollapsed(false);
  }, [uploads.notice]);
  useEffect(() => {
    if (!openRequest) return;
    setCollapsed(false); setDismissedIds([]);
  }, [openRequest]);
  useEffect(() => {
    if (summary.attention.length) setCollapsed(false);
  }, [summary.attention.length]);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  const run = async action => {
    setPending(true); setError('');
    try { await action(); }
    catch (err) { setError(errorText(err.message, err.status)); }
    finally { setPending(false); }
  };
  const reselect = async event => {
    const file = event.target.files?.[0];
    const item = reselecting.current;
    event.target.value = ''; reselecting.current = null;
    if (!file || !item) return;
    if (file.name !== item.name || file.size !== item.size) {
      setError(ui(`Choose the original file: ${item.name}`, `Chagua faili asili: ${item.name}`));
      return;
    }
    await run(() => uploads.add(item.fieldId, [file]));
  };
  const status = item => item.state === 'complete' ? ui('Uploaded', 'Imepakiwa')
    : item.state === 'needs_file' ? ui('Choose the original photo to resume.', 'Chagua picha asili ili kuendelea.')
      : item.state === 'failed' ? errorText(item.error)
        : item.state === 'queued' ? ui('Waiting to upload', 'Inasubiri kupakiwa')
          : item.stage === 'confirming' ? ui('Confirming your photo…', 'Tunathibitisha picha yako…')
            : item.stage === 'retrying' ? ui('Reconnecting…', 'Tunaunganisha tena…')
              : `${Math.floor(item.progress)}% · ${ui('Uploading', 'Inapakia')}`;

  if (!uploads.items.length || uploads.items.every(item => dismissedIds.includes(item.id))) return null;

  return <aside className="background-uploads photo-upload-activity" aria-label={ui('Photo uploads', 'Upakiaji wa picha')}>
    <header className="background-uploads-header">
      {summary.ready ? <CheckCircle2 size={19} aria-hidden="true" /> : <UploadCloud size={19} aria-hidden="true" />}
      <strong role="status">{summary.attention.length ? ui('Some photos need attention', 'Baadhi ya picha zinahitaji msaada')
        : active ? ui('Uploading photos', 'Tunapakia picha') : ui('Photos uploaded', 'Picha zimepakiwa')} · {summary.done}/{summary.total}</strong>
      <button type="button" onClick={() => setCollapsed(value => !value)} aria-expanded={!collapsed} aria-controls="photo-upload-list" aria-label={collapsed ? ui('Expand photo uploads', 'Panua upakiaji wa picha') : ui('Minimize photo uploads', 'Punguza upakiaji wa picha')}>
        {collapsed ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}
      </button>
      {summary.ready && <button type="button" aria-label={ui('Dismiss photo uploads', 'Funga upakiaji wa picha')} onClick={() => setDismissedIds(uploads.items.map(item => item.id))}><X size={18} aria-hidden="true" /></button>}
    </header>
    <div id="photo-upload-list" hidden={collapsed} className="photo-upload-activity__body">
      <div className="photo-upload-activity__summary">
        <p>{ui(`${summary.done} of ${summary.total} photos ready`, `Picha ${summary.done} kati ya ${summary.total} ziko tayari`)}</p>
        {active && <progress aria-label={ui('Photo upload progress: all photos', 'Maendeleo ya kupakia picha: picha zote')} max="100" value={summary.percent} />}
        <p className="background-uploads-hint">{active ? ui('Keep filling in your order. Keep this tab open until uploads finish.', 'Endelea kujaza oda yako. Acha kichupo hiki wazi hadi upakiaji ukamilike.')
          : summary.ready ? ui('Your photos are saved and available in the form.', 'Picha zako zimehifadhiwa na zinapatikana kwenye fomu.')
            : ui('Retry unfinished uploads or choose the original photos to resume.', 'Jaribu tena upakiaji ambao haujakamilika au chagua picha asili ili kuendelea.')}</p>
        {error && <StatePanel compact kind="error" title={ui('Could not update this photo', 'Hatukuweza kusasisha picha hii')} description={error} />}
        {uploads.notice && <StatePanel compact kind="warning" title={uploads.recoveryStatus === 'unavailable' ? ui('Keep this page open', 'Usifunge ukurasa huu') : ui('Check photo recovery', 'Hakiki urejeshaji wa picha')} description={uploads.recoveryStatus === 'unavailable' ? ui('This browser cannot save upload recovery. Finish submitting before closing this page.', 'Kivinjari hiki hakiwezi kuhifadhi taarifa za kuendelea kupakia. Kamilisha uwasilishaji kabla ya kufunga ukurasa huu.') : errorText(uploads.notice)} />}
        {active && (offline || uploadIsStalled(summary.active, now)) && <StatePanel compact kind="warning" title={offline ? ui('You are offline', 'Huna mtandao') : ui('Your photos are taking longer', 'Picha zako zinachukua muda zaidi')} description={offline ? ui('Reconnect, then retry unfinished photos. Completed photos remain saved.', 'Unganisha tena, kisha jaribu picha ambazo hazijakamilika. Picha zilizokamilika zimehifadhiwa.') : ui('Completed photos are saved. Wait for the remaining files, or retry any that fail.', 'Picha zilizokamilika zimehifadhiwa. Subiri faili zilizobaki, au jaribu tena zilizoshindikana.')} />}
      </div>
      <ul className="background-uploads-list">
        {uploads.items.map(item => {
          const field = fields.find(field => field.fieldId === item.fieldId);
          const label = field ? localized(field, 'label', lang) : item.folderName;
          return <li key={item.id} data-upload-id={item.id} data-upload-field={item.fieldId} aria-label={item.name}>
            <div className="background-upload-file">
              {item.state === 'complete' ? <CheckCircle2 className="background-upload-done" size={22} aria-hidden="true" />
                : ['failed', 'needs_file'].includes(item.state) ? <AlertCircle size={22} aria-hidden="true" /> : <Image size={22} aria-hidden="true" />}
              <div><strong title={item.name}>{item.name}</strong><small title={label}>{label}</small></div>
              {item.state !== 'complete' && <button type="button" disabled={locked} aria-label={`${ui('Remove', 'Ondoa')} ${item.name}`} onClick={() => run(() => uploads.remove(item.id))}><X size={18} aria-hidden="true" /></button>}
            </div>
            {item.state !== 'complete' && <>
              <p className={item.state === 'failed' ? 'background-upload-error' : ''}>{status(item)}</p>
              {item.state === 'uploading' && <progress aria-label={item.name} max="100" value={['confirming', 'retrying'].includes(item.stage) ? undefined : item.progress} />}
              <div className="background-upload-actions">
                {item.state === 'failed' && <button type="button" disabled={locked} aria-label={`${ui('Retry', 'Jaribu tena')} ${item.name}`} onClick={() => uploads.retry(item.id)}><RotateCw size={15} aria-hidden="true" />{ui('Retry', 'Jaribu tena')}</button>}
                {item.state === 'needs_file' && <button type="button" disabled={locked} aria-label={`${ui('Reselect', 'Chagua tena')} ${item.name}`} onClick={() => { setError(''); reselecting.current = item; input.current.click(); }}>{ui('Choose original photo', 'Chagua picha asili')}</button>}
              </div>
            </>}
          </li>;
        })}
      </ul>
    </div>
    <input ref={input} type="file" accept="image/*" hidden disabled={locked} onChange={reselect} />
  </aside>;
}
