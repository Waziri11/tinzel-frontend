import React from 'react';
import { Check } from 'lucide-react';
import './mediaExperience.css';

export function BrandMark({ complete = false, animate = true }) {
  return <span className={`tinzel-mark ${complete ? 'tinzel-mark--complete' : animate ? 'tinzel-mark--waiting' : ''}`} aria-hidden="true">
    <img src="/brand/tinzel-butterfly.png" alt="" width="48" height="45" />
    {complete && <Check className="tinzel-mark__check" size={16} />}
  </span>;
}

export default function BrandLoading({ title, description, complete = false, animate = true, children, compact = false }) {
  return <section className={`tinzel-loading ${compact ? 'tinzel-loading--compact' : ''}`} aria-label={title}>
    <BrandMark complete={complete} animate={animate} />
    <div className="tinzel-loading__copy">
      <p className="tinzel-loading__title" role="status" aria-live="polite" aria-atomic="true">{title}</p>
      {description && <p className="tinzel-loading__description">{description}</p>}
      {children}
    </div>
  </section>;
}
