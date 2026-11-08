import StatePanel, { StateError } from './StatePanel';
import { ActionButton } from './SoftFlutter';
import './revisionAudio.css';
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

export default function RevisionAudioPlayer({ token, orderId, requestId, item, client = false }) {
  const { lang } = useLanguage();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!attempt || !item?.audio) return;
    const controller = new AbortController();
    let objectUrl;
    setLoading(true); setError(''); setUrl('');
    api.revisionAudio(token, { client, orderId, requestId, itemId: item._id, signal: controller.signal })
      .then(blob => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); } })
      .catch(error => { if (!controller.signal.aborted) setError(error); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [attempt, token, orderId, requestId, item?._id, client]);
  if (!item?.audio) return null;
  return <div className="revision-audio" style={{ margin: '8px 0' }}>
    {url ? <audio controls onError={() => { setUrl(''); setError(new Error('Audio unavailable')); }} src={url} aria-label={lang === 'sw' ? 'Maoni ya sauti' : 'Audio feedback'} style={{ width: '100%', maxWidth: 360, display: 'block' }} /> :
      <ActionButton type="button" className="ui-button" loading={loading} disabled={loading} onClick={() => setAttempt(value => value + 1)}>{lang === 'sw' ? (loading ? 'Inapakia sauti…' : 'Sikiliza maoni ya sauti') : (loading ? 'Loading audio…' : 'Listen to audio feedback')}</ActionButton>}
    {error && <StateError error={error} title={lang === "sw" ? "Sauti haijafunguka" : "Audio could not open"} onRetry={() => setAttempt(value => value + 1)} />}
  </div>;
}
