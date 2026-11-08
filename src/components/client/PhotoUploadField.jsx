import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Image, Plus, Trash2, UploadCloud } from 'lucide-react';
import { errorText } from '../../i18n/errors';
import StatePanel from '../common/StatePanel';
import { uploadSummary } from '../../utils/uploadProgress';
import './photoUploadField.css';

export function PhotoPreview({ item, preview, ui }) {
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

export default function PhotoUploadField({ field, label, helperText, items, uploads, lang, disabled, onShowUploads }) {
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const input = useRef(null);
  const picker = useRef(null);
  const restorePickerFocus = useRef(false);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const summary = uploadSummary(items);
  const completed = items.filter(item => item.state === 'complete');
  const selected = completed.filter(item => selectedIds.includes(item.id));
  const locked = disabled || removing;
  const canAdd = field.type === 'photo_group' || items.length === 0 || items.some(item => item.state === 'needs_file');
  useEffect(() => {
    if (!removing && restorePickerFocus.current) {
      picker.current?.focus();
      restorePickerFocus.current = false;
    }
  }, [removing]);
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
  const removeSelected = async () => {
    setError(''); setRemoving(true);
    try {
      for (const item of selected) {
        await uploads.remove(item.id);
        setSelectedIds(ids => ids.filter(id => id !== item.id));
      }
    }
    catch (err) { setError(errorText(err.message, err.status)); }
    finally { restorePickerFocus.current = true; setRemoving(false); }
  };
  return <section className="photo-field" aria-labelledby={`photo-label-${field.fieldId}`} data-field-id={field.fieldId}>
    <label id={`photo-label-${field.fieldId}`} htmlFor={`upload-${field.fieldId}`} className="photo-field__label">{label} {field.required ? '*' : ''}</label>
    {helperText && <p className="photo-field__hint">{helperText}</p>}
    {items.length === 0 && !selecting && <button ref={picker} type="button" className="photo-field__picker" disabled={locked} onClick={() => input.current.click()}>
      <UploadCloud size={28} aria-hidden="true" />
      <strong>{selecting ? ui('Preparing your photos…', 'Tunaandaa picha zako…') : ui(field.type === 'photo_group' ? 'Choose photos' : 'Choose a photo', field.type === 'photo_group' ? 'Chagua picha' : 'Chagua picha moja')}</strong>
      <span>{ui('Original quality · up to 25 MB per photo', 'Ubora asili · hadi MB 25 kwa picha')}</span>
    </button>}
    <input ref={input} id={`upload-${field.fieldId}`} type="file" multiple={field.type === 'photo_group'} disabled={locked || selecting} accept="image/*" hidden onChange={select} />
    {error && <StatePanel compact kind="error" title={ui('Check this photo selection', 'Hakiki picha ulizochagua')} description={error} />}
    {(items.length > 0 || selecting) && <div className="photo-field__status photo-field__compact-status">
      <p role="status" className={ready ? 'photo-field__success' : ''}>
        {ready && <CheckCircle2 size={16} aria-hidden="true" />}
        {selecting ? ui('Preparing your photos…', 'Tunaandaa picha zako…') : `${ui('Photos ready', 'Picha zilizo tayari')}: ${summary.done}/${summary.total}`}
      </p>
      {items.length > 0 && <button type="button" className="photo-field__view-uploads" onClick={onShowUploads}>{ui('View uploads', 'Angalia upakiaji')}</button>}
      {!completed.length && canAdd && <button ref={picker} type="button" className="photo-field__compact-add" disabled={locked || selecting} onClick={() => input.current.click()}><Plus size={16} aria-hidden="true" />{ui('Add more', 'Ongeza picha')}</button>}
    </div>}
    {completed.length > 0 && <>
      <div className="photo-field__gallery">
        <div className="photo-field__toolbar" role="group" aria-label={ui('Photo actions', 'Vitendo vya picha')}>
          {selected.length > 0 && <div className="photo-field__selection">
            <span role="status">{selected.length} {ui('selected', 'zimechaguliwa')}</span>
            <button type="button" disabled={locked} onClick={removeSelected}>
              <Trash2 size={16} aria-hidden="true" />{removing ? ui('Removing…', 'Tunaondoa…') : ui('Remove', 'Ondoa')}
            </button>
          </div>}
          {canAdd && <button ref={picker} type="button" className="photo-field__add" disabled={locked || selecting} onClick={() => input.current.click()}>
            <Plus size={18} aria-hidden="true" />{selecting ? ui('Preparing…', 'Tunaandaa…') : ui('Add more', 'Ongeza picha')}
          </button>}
        </div>
        <ul className="photo-field__gallery-photos" aria-label={ui('Selected photos', 'Picha ulizoongeza')}>
          {completed.map(item => <li key={item.id} className={`photo-field__tile${selectedIds.includes(item.id) ? ' is-selected' : ''}`}>
            <input type="checkbox" className="photo-field__select" aria-label={`${ui('Select', 'Chagua')} ${item.name}`} checked={selectedIds.includes(item.id)} disabled={locked}
              onChange={event => setSelectedIds(ids => event.target.checked ? [...ids, item.id] : ids.filter(id => id !== item.id))} />
            <PhotoPreview item={item} preview={uploads.preview} ui={ui} />
            <span className="photo-field__filename" title={item.name}>{item.name}</span>
            <span className="photo-field__check" aria-hidden="true"><Check size={14} /></span>
          </li>)}
        </ul>
      </div>
      <p className="photo-field__hint">{ui('Select photos to remove them.', 'Chagua picha ili kuziondoa.')}</p>
    </>}
  </section>;
}
