import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Check } from 'lucide-react';
import { BrandMark } from '../common/BrandLoading';
import { uploadSummary, formatUploadBytes, uploadIsStalled } from '../../utils/uploadProgress';

export default function UploadJourney({ uploads, lang, disabled, onRemove, onContinue }) {
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const [now, setNow] = useState(Date.now());
  const [offline, setOffline] = useState(!navigator.onLine);
  const summary = uploadSummary(uploads.items);
  const busy = summary.active.length > 0;
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  if (!summary.total && uploads.phase !== 'saving') return null;
  const saving = uploads.phase === 'saving';
  const stalled = uploadIsStalled(summary.active, now);
  const title = saving ? ui('Saving your order', 'Tunahifadhi oda yako')
    : summary.attention.length ? ui('A few photos need your attention', 'Baadhi ya picha zinahitaji msaada wako')
      : summary.ready ? ui('Your photos are ready', 'Picha zako ziko tayari')
        : ui('Your story is taking shape', 'Hadithi yako inaanza kuonekana');
  // Only stage/count changes are announced. Byte and percentage changes stay visual.
  const announcement = saving ? title : `${title}. ${summary.done} ${ui('of', 'kati ya')} ${summary.total} ${ui('photos ready', 'picha ziko tayari')}.`;
  const row = (item) => <li key={item.id} className="tinzel-upload-row">
    <div className="tinzel-upload-row__copy">
      <span className="tinzel-upload-row__name">{item.name}</span>
      <span className="tinzel-upload-row__state">{item.state === 'complete' ? ui('Ready', 'Tayari')
        : item.state === 'needs_file' ? ui('Reselect this file below to resume', 'Chagua tena faili hii hapa chini kuendelea')
          : item.state === 'failed' ? item.error
            : item.state === 'queued' ? ui('Waiting for a transfer slot', 'Inasubiri nafasi ya kupakia')
              : item.stage === 'confirming' ? ui('Confirming your photo…', 'Tunathibitisha picha yako…')
                : item.stage === 'retrying' ? ui('Reconnecting…', 'Tunaunganisha tena…')
                  : `${Math.floor(item.progress)}% · ${ui('Uploading', 'Inapakia')}`}</span>
      {item.state === 'uploading' && <progress aria-label={item.name} max="100" value={item.progress} />}
    </div>
    {item.state === 'complete' && <CheckCircle2 size={17} aria-hidden="true" />}
    {item.state === 'failed' && <button type="button" disabled={disabled} aria-label={ui('Retry photo', 'Jaribu tena picha')} onClick={() => uploads.retry(item.id)}>{ui('Retry', 'Jaribu tena')}</button>}
    {item.state !== 'complete' && <button type="button" disabled={disabled} aria-label={`${ui('Remove', 'Ondoa')} ${item.name}`} onClick={() => onRemove(item.id)}>{ui('Remove', 'Ondoa')}</button>}
  </li>;
  return <section className="tinzel-upload" aria-label={ui('Photo upload progress', 'Maendeleo ya kupakia picha')}>
    <div className="tinzel-upload__summary">
      <BrandMark complete={summary.ready && !saving} animate={!summary.attention.length} />
      <div className="tinzel-upload__heading">
        <p className="tinzel-eyebrow">{ui('YOUR TINZEL MAGAZINE', 'JARIDA LAKO LA TINZEL')}</p>
        <h2>{title}</h2>
        <strong>{ui('Photos ready', 'Picha zilizo tayari')}: {summary.done}/{summary.total}</strong>
      </div>
      <span className="tinzel-upload__percent" aria-hidden="true">{summary.percent}%</span>
    </div>
    <p className="tinzel-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    {summary.total > 0 && <>
      <progress className="tinzel-upload__bar" aria-label={ui('Overall photo upload', 'Maendeleo ya picha zote')} max="100" value={summary.percent} />
      <div className="tinzel-upload__metadata"><span>{formatUploadBytes(summary.sentBytes)} / {formatUploadBytes(summary.totalBytes)} · {ui('Original quality', 'Ubora asili')}</span>
        <span>{uploads.recoveryStatus === 'saved' ? ui('Upload recovery saved', 'Urejeshaji wa picha umehifadhiwa') : uploads.recoveryStatus === 'unavailable' ? ui('Keep this page open', 'Usifunge ukurasa huu') : ui('Saving recovery details…', 'Tunahifadhi taarifa za urejeshaji…')}</span>
      </div>
    </>}
    <ol className="tinzel-upload__stages" aria-label={ui('Order stages', 'Hatua za oda')}>
      <li data-active={!saving} aria-current={!saving ? 'step' : undefined}>
        {summary.ready ? <Check size={13} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} /> : '1. '}
        {ui('Upload photos', 'Pakia picha')}
      </li>
      <li data-active={saving} aria-current={saving ? 'step' : undefined}>2. {ui('Save order', 'Hifadhi oda')}</li>
      <li>3. {ui('Payment details', 'Maelekezo ya malipo')}</li>
    </ol>
    <p className="tinzel-upload__hint">{saving ? ui('Please keep this page open while we confirm your order.', 'Tafadhali usifunge ukurasa tunapothibitisha oda yako.')
      : ui('Keep filling in your details while photos upload. Completed photos stay saved; after refreshing, reselect unfinished files to continue.', 'Endelea kujaza taarifa picha zikipakiwa. Picha zilizokamilika zinabaki; ukifungua upya, chagua tena faili ambazo hazijakamilika.')}</p>
    {busy && (offline || stalled) && <p className="tinzel-upload__notice" role="status"><AlertCircle size={16} aria-hidden="true" />
      {offline ? ui('You appear to be offline. Completed photos are saved. Reconnect, then retry any photos that need attention.', 'Inaonekana huna mtandao. Picha zilizokamilika zimehifadhiwa. Unganisha mtandao, kisha jaribu tena picha zenye hitilafu.')
        : ui('This is taking longer than usual. We are still waiting for the transfer to finish; completed photos are saved.', 'Hii inachukua muda zaidi. Bado tunasubiri upakiaji ukamilike; picha zilizokamilika zimehifadhiwa.')}</p>}
    {summary.attention.length > 0 && <ul className="tinzel-upload__attention">{summary.attention.map(row)}</ul>}
    <ul>{summary.active.map(row)}</ul>
    {uploads.items.some((item) => item.state === 'queued') && <p className="tinzel-upload__hint">{uploads.items.filter((item) => item.state === 'queued').length} {ui('photos waiting — two transfer at a time to keep things smooth.', 'picha zinasubiri — mbili hupakiwa kwa wakati mmoja.')}</p>}
    {summary.done > 0 && <details className="tinzel-upload__completed"><summary>{summary.done} {ui('photos ready', 'picha ziko tayari')} · {ui('View completed photos', 'Ona picha zilizokamilika')}</summary>
      <ul>{uploads.items.filter((item) => item.state === 'complete').map(row)}</ul>
    </details>}
    {summary.ready && !disabled && <button type="button" className="tinzel-text-button" onClick={onContinue}>{ui('Continue with your details', 'Endelea na taarifa zako')} →</button>}
    {!summary.ready && <a className="tinzel-upload__dock" href="#photo-progress" aria-label={ui('Return to upload progress', 'Rudi kwenye maendeleo ya upakiaji')}>{ui('Photos', 'Picha')} {summary.done}/{summary.total} · {summary.percent}% ↑</a>}
  </section>;
}
