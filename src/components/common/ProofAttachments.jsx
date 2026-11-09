import TransferProgress from './TransferProgress';
import { InlineLoading } from './SoftFlutter';
import { createPortal } from 'react-dom';
import React, { useEffect, useRef, useState } from 'react';
import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import RevisionAudioInput from './RevisionAudioInput';
import { useLanguage } from '../../i18n/LanguageContext';
import { saveDownload } from '../../services/fileTransfers';
import { Download, ImagePlus, X } from 'lucide-react';

export function AttachmentEditor({ uploads, disabled, onAudioBusyChange }) {
  const input = useRef(null), tx = useInterfaceText();
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const images = uploads.items.filter(item => item.kind !== 'audio');
  const audio = uploads.items.find(item => item.kind === 'audio');
  return <section className="proof-attachment-editor" aria-label={ui('Comment attachments', 'Viambatisho vya maoni')}>
    <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" hidden disabled={disabled}
      onChange={e => { uploads.add(e.target.files); e.target.value = ''; }} />
    {uploads.error && <p role="alert">{tx(uploads.error)}</p>}
    <RevisionAudioInput compact file={audio?.file || null} disabled={disabled} onBusyChange={onAudioBusyChange}
      onChange={file => { if (audio) uploads.remove(audio); if (file) uploads.addAudio(file); }}
      leadingControls={<button type="button" className="proof-chat-icon proof-chat-photo" aria-label={tx('Attach images')} title={tx('Up to 5 images · 10 MiB each. You can also paste or drop images.')} disabled={disabled || images.length >= 5} onClick={() => input.current.click()}>
        <ImagePlus size={21} aria-hidden="true" />{images.length > 0 && <span className="proof-chat-count" aria-hidden="true">{images.length}</span>}
      </button>}>
      {images.length > 0 && <div className="proof-attachment-thumbnails">
        {images.map(item => <figure key={item.key}>
          <img src={item.preview} alt={item.file.name} />
          <figcaption>{item.state === 'uploading' ? <><InterfaceText>Uploading image</InterfaceText> {item.progress}%</> : item.file.name}</figcaption>
          {item.state === 'uploading' && <TransferProgress progress={{ stage: 'uploading', percent: item.progress }} label={item.file.name} />}
          {item.state === 'failed' && <><small role="alert">{tx(item.error)}</small><button type="button" disabled={disabled} onClick={() => uploads.retry(item)}><InterfaceText>Retry image</InterfaceText></button></>}
          <button type="button" className="proof-photo-remove" disabled={disabled} aria-label={`${tx('Remove image')}: ${item.file.name}`} title={tx('Remove image')} onClick={() => uploads.remove(item)}><X size={16} aria-hidden="true" /></button>
        </figure>)}
      </div>}
    </RevisionAudioInput>
    {audio?.state === 'uploading' && <TransferProgress progress={{ stage: 'uploading', percent: audio.progress }} label={ui('Uploading audio', 'Inapakia sauti')} />}
    {audio?.state === 'failed' && <div role="alert"><p>{tx(audio.error)}</p><button type="button" disabled={disabled} onClick={() => uploads.retry(audio)}>{ui('Retry audio upload', 'Jaribu kupakia sauti tena')}</button></div>}
  </section>;
}

function PrivateImage({ reader, attachment, thumbnail = true }) {
  const tx = useInterfaceText();
  const [url, setUrl] = useState(''), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let objectUrl;
    setUrl(''); setError('');
    reader.attachmentFile(attachment.id, thumbnail, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [reader, attachment.id, thumbnail, attempt]);
  if (error) return <span role="alert">{tx(error)} <button type="button" onClick={() => setAttempt(n => n + 1)}><InterfaceText>Retry image</InterfaceText></button></span>;
  return url ? <img src={url} alt={attachment.name || 'Review image'} /> : <InlineLoading><InterfaceText>Loading image…</InterfaceText></InlineLoading>;
}

function PrivateAudio({ reader, attachment }) {
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const [url, setUrl] = useState(''), [error, setError] = useState(false), [attempt, setAttempt] = useState(0), [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!attempt) return;
    const controller = new AbortController(); let objectUrl;
    setLoading(true); setError(false); setUrl('');
    reader.attachmentFile(attachment.id, false, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [reader, attachment.id, attempt]);
  return <div className="proof-attached-audio">
    {url && !error ? <audio controls src={url} aria-label={ui('Audio comment', 'Maoni ya sauti')} onError={() => setError(true)} /> : <>
      {error && <p role="alert">{ui('Audio could not open. Please try again.', 'Sauti haikuweza kufunguka. Tafadhali jaribu tena.')}</p>}
      <button type="button" disabled={loading} onClick={() => setAttempt(value => value + 1)}>
        {loading ? ui('Loading audio…', 'Inapakia sauti…') : error ? ui('Retry audio', 'Jaribu sauti tena') : ui('Listen to audio comment', 'Sikiliza maoni ya sauti')}
      </button>
    </>}
  </div>;
}

function ImageDownloadButton({ reader, attachment }) {
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const [downloading, setDownloading] = useState(false), [error, setError] = useState(false);
  const pending = useRef(null);
  useEffect(() => {
    setDownloading(false); setError(false);
    return () => { pending.current?.abort(); pending.current = null; };
  }, [reader, attachment.id]);
  const download = async () => {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setDownloading(true); setError(false);
    try {
      const blob = await reader.attachmentFile(attachment.id, false, controller.signal);
      if (controller.signal.aborted) return;
      // Review images are stored as WebP, even when the uploaded filename ends in JPG or PNG.
      const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
      const extension = extensions[blob.type.split(';')[0]] || extensions[attachment.contentType] || 'webp';
      const name = String(attachment.name || '').split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '').replace(/\.[^.]*$/, '').trim() || 'comment-image';
      saveDownload(blob, `${name}.${extension}`);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setDownloading(false); }
    }
  };
  const label = downloading ? ui('Downloading…', 'Inapakua…') : error ? ui('Retry download', 'Jaribu kupakua tena') : ui('Download image', 'Pakua picha');
  return <div className="proof-image-download">
    <button type="button" disabled={downloading} onClick={download} aria-label={`${label}: ${attachment.name || ui('Attached image', 'Picha iliyoambatishwa')}`}>
      <Download size={15} aria-hidden="true" /><span>{!downloading && !error ? ui('Download', 'Pakua') : label}</span>
    </button>
    {error && <small role="alert">{ui('Image could not download. Please try again.', 'Picha haikuweza kupakuliwa. Tafadhali jaribu tena.')}</small>}
  </div>;
}

export default function ProofAttachments({ attachments = [], reader, canDownload = false }) {
  const [opened, setOpened] = useState(null), tx = useInterfaceText();
  useDialogFocus(Boolean(opened), () => setOpened(null));
  if (!attachments.length) return null;
  return <div className="proof-attachments">
    {attachments.filter(a => a.contentType?.startsWith('audio/')).map(a => <PrivateAudio key={a.id} reader={reader} attachment={a} />)}
    <div className="proof-attachment-thumbnails">{attachments.filter(a => !a.contentType?.startsWith('audio/')).map(a => <div key={a.id} className="proof-attached-image">
      <PrivateImage reader={reader} attachment={a} />
      <button type="button" onClick={() => setOpened(a)} aria-label={`${tx('Open image')}: ${a.name}`}><InterfaceText>Open image</InterfaceText></button>
      {canDownload && <ImageDownloadButton reader={reader} attachment={a} />}
    </div>)}</div>
    {opened && createPortal(<div className="proof-image-viewer" role="dialog" aria-modal="true" aria-label={tx('Attached image')} onClick={e => e.stopPropagation()}>
      <div className="proof-image-viewer-actions">
        {canDownload && <ImageDownloadButton key={opened.id} reader={reader} attachment={opened} />}
        <button type="button" onClick={() => setOpened(null)}><InterfaceText>Close image</InterfaceText></button>
      </div>
      <PrivateImage reader={reader} attachment={opened} thumbnail={false} />
      <span>{opened.name}</span>
    </div>, document.fullscreenElement || document.body)}
  </div>;
}
