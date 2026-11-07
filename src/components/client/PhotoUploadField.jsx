import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Image, UploadCloud } from 'lucide-react';
import { ActionButton } from '../common/SoftFlutter';
import { errorText } from '../../i18n/errors';
import { uploadSummary, uploadIsStalled } from '../../utils/uploadProgress';
import './photoUploadField.css';

function PhotoPreview({ item, preview, ui }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const container = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    setUrl(''); setFailed(false);
    // Restored forms fetch private previews only as they enter the viewport.
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      preview(item, controller.signal, { remote: attempt > 0 }).then(blob => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    }, { rootMargin: '200px' });
    observer.observe(container.current);
    return () => { observer.disconnect(); controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [item.id, item.photo.assetId, preview, attempt]);
  return <div ref={container} className="photo-field__preview">
    {url && !failed ? <img src={url} alt={item.name} onError={() => {
      // HEIC and other phone formats may need the server-generated thumbnail.
      if (!attempt) setAttempt(1); else setFailed(true);
    }} />
      : <div className="photo-field__placeholder"><Image size={24} aria-hidden="true" />
        <span>{failed ? ui('Photo saved. Preview unavailable.', 'Picha imehifadhiwa. Hakikisho halipatikani.') : ui('Loading preview…', 'Tunapakia hakikisho…')}</span>
        {failed && <button type="button" onClick={() => setAttempt(value => value + 1)}>{ui('Retry preview', 'Jaribu hakikisho tena')}</button>}
      </div>}
  </div>;
}

export default function PhotoUploadField({ field, label, helperText, items, uploads, lang, disabled }) {
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const input = useRef(null);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [offline, setOffline] = useState(!navigator.onLine);
  const summary = uploadSummary(items);
  const busy = selecting || items.some(item => ['queued', 'uploading'].includes(item.state));
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
  const ready = summary.ready && !selecting;
  const select = async event => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setSelecting(true); setError('');
    try { await uploads.add(field.fieldId, files); }
    catch (err) { setError(errorText(err.message, err.status)); }
    finally { setSelecting(false); }
  };
  const remove = async id => {
    setError('');
    try { await uploads.remove(id); }
    catch (err) { setError(errorText(err.message, err.status)); }
  };
  const status = item => item.state === 'complete' ? ui('Uploaded', 'Imepakiwa')
    : item.state === 'needs_file' ? ui('Reselect this file below to resume', 'Chagua tena faili hii hapa chini kuendelea')
      : item.state === 'failed' ? errorText(item.error)
        : item.state === 'queued' ? ui('Waiting to upload', 'Inasubiri kupakiwa')
          : item.stage === 'confirming' ? ui('Confirming your photo…', 'Tunathibitisha picha yako…')
            : item.stage === 'retrying' ? ui('Reconnecting…', 'Tunaunganisha tena…')
              : `${Math.floor(item.progress)}% · ${ui('Uploading', 'Inapakia')}`;

  return <section className="photo-field" aria-labelledby={`photo-label-${field.fieldId}`} data-field-id={field.fieldId}>
    <label id={`photo-label-${field.fieldId}`} htmlFor={`upload-${field.fieldId}`} className="photo-field__label">{label} {field.required ? '*' : ''}</label>
    {helperText && <p className="photo-field__hint">{helperText}</p>}
    <button type="button" className="photo-field__picker" disabled={disabled || selecting} onClick={() => input.current.click()}>
      {ready ? <CheckCircle2 size={28} className="photo-field__success" aria-hidden="true" /> : <UploadCloud size={28} aria-hidden="true" />}
      <strong>{selecting ? ui('Preparing your photos…', 'Tunaandaa picha zako…') : ui(field.type === 'photo_group' ? 'Choose photos' : 'Choose a photo', field.type === 'photo_group' ? 'Chagua picha' : 'Chagua picha moja')}</strong>
      <span>{ui('Original quality · up to 25 MB per photo', 'Ubora asili · hadi MB 25 kwa picha')}</span>
    </button>
    <input ref={input} id={`upload-${field.fieldId}`} type="file" multiple={field.type === 'photo_group'} disabled={disabled || selecting} accept="image/*" hidden onChange={select} />
    {error && <p role="alert" className="photo-field__error">{error}</p>}
    {(items.length > 0 || selecting) && <div className="photo-field__status">
      <p role="status" aria-live="polite" aria-atomic="true" className={ready ? 'photo-field__success' : ''}>
        {ready && <CheckCircle2 size={18} aria-hidden="true" />}
        <strong>{ready ? ui('Photos uploaded successfully', 'Picha zimepakiwa kikamilifu') : selecting ? ui('Preparing your photos…', 'Tunaandaa picha zako…') : summary.attention.length ? ui('Some photos need attention', 'Baadhi ya picha zinahitaji msaada') : ui('Uploading photos…', 'Tunapakia picha…')}</strong>
        <span>{ui('Photos ready', 'Picha zilizo tayari')}: {summary.done}/{summary.total}</span>
      </p>
      {busy && <progress aria-label={`${ui('Photo upload progress', 'Maendeleo ya kupakia picha')}: ${label}`} max="100" value={selecting ? undefined : summary.percent} />}
      {busy && <p className="photo-field__hint">{ui('You can keep filling in the form while these photos upload.', 'Unaweza kuendelea kujaza fomu picha hizi zikipakiwa.')}</p>}
      {uploads.recoveryStatus === 'unavailable' && <p className="photo-field__hint">{ui('Keep this page open', 'Usifunge ukurasa huu')}</p>}
      {busy && (offline || uploadIsStalled(summary.active, now)) && <p role="status" className="photo-field__notice"><AlertCircle size={16} aria-hidden="true" />{offline ? ui('You are offline. Reconnect, then retry unfinished photos.', 'Huna mtandao. Unganisha tena, kisha jaribu picha ambazo hazijakamilika.') : ui('This is taking longer than usual. Completed photos are saved.', 'Hii inachukua muda zaidi. Picha zilizokamilika zimehifadhiwa.')}</p>}
    </div>}
    {items.length > 0 && <ul className="photo-field__photos">
      {items.map(item => <li key={item.id} className="photo-field__photo">
        {item.state === 'complete' && <PhotoPreview item={item} preview={uploads.preview} ui={ui} />}
        <div className="photo-field__photo-copy"><strong>{item.name}</strong>
          <span className={item.state === 'complete' ? 'photo-field__success' : ''}>{item.state === 'complete' && <CheckCircle2 size={14} aria-hidden="true" />}{status(item)}</span>
          {item.state === 'uploading' && <progress aria-label={item.name} max="100" value={['confirming', 'retrying'].includes(item.stage) ? undefined : item.progress} />}
          <div className="photo-field__actions">
            {item.state === 'failed' && <button type="button" aria-label={ui('Retry photo', 'Jaribu tena picha')} disabled={disabled} onClick={() => uploads.retry(item.id)}>{ui('Retry', 'Jaribu tena')}</button>}
            <ActionButton type="button" disabled={disabled} aria-label={`${ui('Remove', 'Ondoa')} ${item.name}`} onClick={() => remove(item.id)}>{ui('Remove', 'Ondoa')}</ActionButton>
          </div>
        </div>
      </li>)}
    </ul>}
  </section>;
}
