import React, { useEffect, useState } from 'react';
import { Clock3, Zap } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { orderCountdown } from '../../utils/expressOrder';
import './expressOrder.css';

export default function OrderCountdownBadge({ order }) {
  const { lang } = useLanguage();
  const sw = lang === 'sw';
  const isExpress = order?.isExpress === true;
  const dueAt = isExpress ? order?.expressDueAt : order?.standardDueAt;
  const serviceLabel = isExpress ? 'Express' : sw ? 'Kawaida' : 'Standard';
  const [now, setNow] = useState(Date.now);
  const ticking = Boolean(dueAt && !['delivered', 'closed'].includes(order.orderStatus || order.status));
  useEffect(() => {
    if (!ticking) return;
    const refresh = () => setNow(Date.now());
    refresh();
    const timer = setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [ticking, dueAt]);
  const countdown = orderCountdown(order, now);
  if (!countdown) return null;
  const due = dueAt && new Date(dueAt).toLocaleString(sw ? 'sw-TZ' : 'en-GB', {
    timeZone: 'Africa/Dar_es_Salaam', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const hours = isExpress ? countdown.hours : countdown.hours % 24;
  const days = Math.floor(countdown.hours / 24);
  const dayLabel = isExpress ? '' : `${sw ? `Siku ${days}` : `${days}d`} `;
  const duration = `${dayLabel}${hours}h ${String(countdown.minutes).padStart(2, '0')}m ${String(countdown.seconds).padStart(2, '0')}s`;
  const resumeSeconds = countdown.paused ? Math.max(0, Math.ceil((countdown.resumesAt - now) / 1000)) : 0;
  const resumesIn = `${Math.floor(resumeSeconds / 3600)}h ${String(Math.floor(resumeSeconds / 60) % 60).padStart(2, '0')}m ${String(resumeSeconds % 60).padStart(2, '0')}s`;
  const label = countdown.state === 'complete' ? (sw ? 'Imekamilika' : 'Complete')
    : countdown.state === 'pending' ? (isExpress ? (sw ? 'Saa 24 · Inasubiri malipo' : '24h · Awaiting payment') : (sw ? 'Siku 3 · Inasubiri malipo' : '3 days · Awaiting payment'))
      : countdown.state === 'overdue' ? `${sw ? 'Imechelewa' : 'Overdue'} ${duration}`
        : `${duration} ${sw ? 'zimebaki' : 'left'}`;
  return <span className={`express-order ${isExpress ? 'is-express' : 'is-standard'} is-${countdown.state}${countdown.paused ? ' is-paused' : ''}`} aria-label={`${serviceLabel} · ${label}${countdown.paused ? sw ? ' · Imesimama Jumapili' : ' · Paused on Sunday' : ''}`}>
    <span className="express-order__label">{isExpress ? <Zap size={13} aria-hidden="true" /> : <Clock3 size={13} aria-hidden="true" />}{serviceLabel}</span>
    <span className="express-order__clock">{label}</span>
    {countdown.paused && <span className="express-order__note express-order__pause">
      <strong>{sw ? 'Imesimama Jumapili' : 'Paused on Sunday'}</strong>
      <span>{sw ? `Itaendelea baada ya ${resumesIn} · Jumatatu 00:00 EAT` : `Resumes in ${resumesIn} · Monday 00:00 EAT`}</span>
    </span>}
    {due && countdown.state !== 'complete' && <span className="express-order__note">{sw ? 'Mwisho' : 'Due'} {due} EAT</span>}
  </span>;
}
