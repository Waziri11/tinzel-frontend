import React, { useEffect, useState } from 'react';
import { BrandMark } from './BrandLoading';

export default function MediaThumbnail({ photo }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => { setLoaded(false); setFailed(false); setAttempt(0); }, [photo.thumbnailUrl, photo.url]);
  useEffect(() => {
    if (!failed || !photo.thumbnailUrl || attempt >= 20) return;
    const timer = setTimeout(() => { setAttempt((n) => n + 1); setFailed(false); }, 15000);
    return () => clearTimeout(timer);
  }, [failed, attempt, photo.thumbnailUrl]);
  const url = photo.thumbnailUrl || photo.url;
  return <>
    <img src={url + ((attempt || version) ? `${url.includes('?') ? '&' : '?'}previewRetry=${version}-${attempt}` : '')} loading="lazy" decoding="async" width="140" height="100"
      alt={photo.originalName || `Photo ${photo.index}`}
      onLoad={() => { setFailed(false); setLoaded(true); }} onError={() => { setFailed(true); setLoaded(false); }}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: loaded ? 1 : 0 }} />
    {!loaded && <div className="tinzel-preview-placeholder">
      <BrandMark animate={false} />
      <span>{failed ? (photo.thumbnailUrl && attempt < 20 ? 'Preview pending' : 'Preview unavailable') : 'Loading preview'}</span>
      {failed && <span>Original available below</span>}
      {failed && <button type="button" aria-label={`Refresh preview for ${photo.originalName || 'photo'}`} onClick={() => { setAttempt(0); setVersion((n) => n + 1); setFailed(false); }}>Refresh preview</button>}
    </div>}
  </>;
}
