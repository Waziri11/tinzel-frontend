import React, { useEffect, useState } from 'react';

export default function MediaThumbnail({ photo }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!failed || !photo.thumbnailUrl || attempt >= 20) return;
    const timer = setTimeout(() => { setAttempt((n) => n + 1); setFailed(false); }, 15000);
    return () => clearTimeout(timer);
  }, [failed, attempt, photo.thumbnailUrl]);
  const url = photo.thumbnailUrl || photo.url;
  return <>
    <img src={url + (attempt ? `?previewRetry=${attempt}` : '')} loading="lazy" decoding="async" width="140" height="100"
      alt={photo.originalName || `Photo ${photo.index}`}
      onLoad={() => setFailed(false)} onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: failed ? 0 : 1 }} />
    {failed && <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#A8A29E', fontSize: 11 }}>
      {photo.thumbnailUrl ? (attempt < 20 ? 'Preview pending — original available' : 'Preview unavailable — original available') : `Asset ${photo.index}`}
    </span>}
  </>;
}
