import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import React, { useEffect, useState } from 'react';
import { BrandMark } from './BrandLoading';

export default function MediaThumbnail({ photo }) {
  const tx = useInterfaceText();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    setLoaded(false);
    setVersion(0);
    setFailed(false);
    setAttempt(0);
  }, [photo.thumbnailUrl, photo.url]);
  useEffect(() => {
    if (!failed || !photo.thumbnailUrl || attempt >= 20) return;
    const timer = setTimeout(() => {
      setAttempt((n) => n + 1);
      setFailed(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, [failed, attempt, photo.thumbnailUrl]);
  const url = photo.thumbnailUrl || photo.url || '';
  return (
    <>
      {url && <img
        src={url + (attempt || version ? `${url.includes('?') ? '&' : '?'}previewRetry=${version}-${attempt}` : '')}
        loading="lazy"
        decoding="async"
        width="140"
        height="100"
        alt={photo.originalName || `${tx('Photo')} ${photo.index || ''}`}
        onLoad={() => {
          setFailed(false);
          setLoaded(true);
        }}
        onError={() => {
          setFailed(true);
          setLoaded(false);
        }}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: loaded ? 1 : 0 }}
      />}
      {!loaded && (
        <div className="tinzel-preview-placeholder">
          <BrandMark animate={version > 0 && !failed} />
          <span>
            {tx(failed || !url
              ? photo.thumbnailUrl && attempt < 20
                ? 'Preview pending'
                : 'Preview unavailable'
              : 'Loading preview')}
          </span>
          {failed && photo.url && (
            <span>
              <InterfaceText>Original available below</InterfaceText>
            </span>
          )}
          {failed && (
            <button
              type="button"
              aria-label={`${tx('Refresh preview')}: ${photo.originalName || tx('Photo')}`}
              onClick={() => {
                setAttempt(0);
                setVersion((n) => n + 1);
                setFailed(false);
              }}
            >
              <InterfaceText>Refresh preview</InterfaceText>
            </button>
          )}
        </div>
      )}
    </>
  );
}
