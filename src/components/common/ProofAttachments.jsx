import { createPortal } from 'react-dom';
import React, { useEffect, useRef, useState } from 'react';
import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import { useDialogFocus } from '../../hooks/useDialogFocus';

export function AttachmentEditor({ uploads, disabled }) {
  const input = useRef(null), tx = useInterfaceText();
  return <section className="proof-attachment-editor" aria-label={tx('Comment images')}>
    <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" hidden disabled={disabled}
      onChange={e => { uploads.add(e.target.files); e.target.value = ''; }} />
    <button type="button" disabled={disabled || uploads.items.length >= 5} onClick={() => input.current.click()}><InterfaceText>Attach images</InterfaceText></button>
    <small><InterfaceText>Up to 5 images · 10 MiB each. You can also paste or drop images.</InterfaceText></small>
    {uploads.error && <p role="alert">{tx(uploads.error)}</p>}
    <div className="proof-attachment-thumbnails">
      {uploads.items.map(item => <figure key={item.key}>
        <img src={item.preview} alt={item.file.name} />
        <figcaption>{item.state === 'uploading' ? <><InterfaceText>Uploading image</InterfaceText> {item.progress}%</> : item.file.name}</figcaption>
        {item.state === 'failed' && <><small role="alert">{tx(item.error)}</small><button type="button" disabled={disabled} onClick={() => uploads.retry(item)}><InterfaceText>Retry image</InterfaceText></button></>}
        <button type="button" disabled={disabled} aria-label={`${tx('Remove image')}: ${item.file.name}`} onClick={() => uploads.remove(item)}><InterfaceText>Remove image</InterfaceText></button>
      </figure>)}
    </div>
  </section>;
}

function PrivateImage({ reader, attachment, thumbnail = true }) {
  const tx = useInterfaceText();
  const [url, setUrl] = useState(''), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let objectUrl;
    setUrl(''); setError('');
    reader.attachmentImage(attachment.id, thumbnail, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [reader, attachment.id, thumbnail, attempt]);
  if (error) return <span role="alert">{tx(error)} <button type="button" onClick={() => setAttempt(n => n + 1)}><InterfaceText>Retry image</InterfaceText></button></span>;
  return url ? <img src={url} alt={attachment.name || 'Review image'} /> : <span role="status"><InterfaceText>Loading image…</InterfaceText></span>;
}

export default function ProofAttachments({ attachments = [], reader }) {
  const [opened, setOpened] = useState(null), tx = useInterfaceText();
  useDialogFocus(Boolean(opened), () => setOpened(null));
  if (!attachments.length) return null;
  return <div className="proof-attachments">
    <div className="proof-attachment-thumbnails">{attachments.map(a => <div key={a.id} className="proof-attached-image">
      <PrivateImage reader={reader} attachment={a} />
      <button type="button" onClick={() => setOpened(a)} aria-label={`${tx('Open image')}: ${a.name}`}><InterfaceText>Open image</InterfaceText></button>
    </div>)}</div>
    {opened && createPortal(<div className="proof-image-viewer" role="dialog" aria-modal="true" aria-label={tx('Attached image')} onClick={e => e.stopPropagation()}>
      <button type="button" onClick={() => setOpened(null)}><InterfaceText>Close image</InterfaceText></button>
      <PrivateImage reader={reader} attachment={opened} thumbnail={false} />
      <span>{opened.name}</span>
    </div>, document.fullscreenElement || document.body)}
  </div>;
}
