import React from 'react';
import fullLogo from '../../assets/brand/tinzel-logo.svg';
import butterfly from '../../assets/brand/tinzel-butterfly.svg';
import wordmark from '../../assets/brand/tinzel-wordmark.svg';

const logoSources = { full: fullLogo, icon: butterfly, wordmark };

/**
 * TinzelLogo component supports three variations:
 * 1. 'full' (default): Golden butterfly icon alongside "Tinzel" wordmark.
 * 2. 'icon': Golden butterfly emblem only (great for favicon, compact headers, mobile).
 * 3. 'wordmark': "Tinzel" script wordmark only.
 */
export default function TinzelLogo({
  variant = 'full', // 'full' | 'icon' | 'wordmark'
  height = 42,
  style = {},
  className = '',
  alt = 'Tinzel Logo',
}) {
  const src = logoSources[variant] || logoSources.full;

  return (
    <img
      src={src}
      alt={alt}
      height={height}
      className={className}
      style={{
        height: `${height}px`,
        width: 'auto',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
}
