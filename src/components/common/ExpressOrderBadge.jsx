import React, { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { expressCountdown } from '../../utils/expressOrder';
import './expressOrder.css';

export default function ExpressOrderBadge({ order }) {
  const { lang } = useLanguage();
  const sw = lang === 'sw';
  const [now, setNow] = useState(Date.now);
  const ticking = Boolean(order?.isExpress && order.expressDueAt && !['delivered', 'closed'].includes(order.orderStatus || order.status));
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
  }, [ticking, order?.expressDueAt]);
  const countdown = expressCountdown(order, now);
  if (!countdown) return null;
  const due = order.expressDueAt && new Date(order.expressDueAt).toLocaleString(sw ? 'sw-TZ' : 'en-GB', {
    timeZone: 'Africa/Dar_es_Salaam', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const duration = `${countdown.hours}h ${String(countdown.minutes).padStart(2, '0')}m ${String(countdown.seconds).padStart(2, '0')}s`;
  const resumeSeconds = Math.max(0, Math.ceil((countdown.resumesAt - now) / 1000));
  const resumesIn = `${Math.floor(resumeSeconds / 3600)}h ${String(Math.floor(resumeSeconds / 60) % 60).padStart(2, '0')}m ${String(resumeSeconds % 60).padStart(2, '0')}s`;
  const label = countdown.state === 'complete' ? (sw ? 'Imekamilika' : 'Complete')
    : countdown.state === 'pending' ? (sw ? 'Saa 24 · Inasubiri malipo' : '24h · Awaiting payment')
      : countdown.state === 'overdue' ? `${sw ? 'Imechelewa' : 'Overdue'} ${duration}`
        : `${duration} ${sw ? 'zimebaki' : 'left'}`;
  return <span className={`express-order is-${countdown.state}${countdown.paused ? ' is-paused' : ''}`} aria-label={`Express · ${label}${countdown.paused ? sw ? ' · Imesimama Jumapili' : ' · Paused on Sunday' : ''}`}>
    <span className="express-order__label"><Zap size={13} aria-hidden="true" />Express</span>
    <span className="express-order__clock">{label}</span>
    {countdown.paused && <span className="express-order__note express-order__pause">
      <strong>{sw ? 'Imesimama Jumapili' : 'Paused on Sunday'}</strong>
      <span>{sw ? `Itaendelea baada ya ${resumesIn} · Jumatatu 00:00 EAT` : `Resumes in ${resumesIn} · Monday 00:00 EAT`}</span>
    </span>}
    {due && countdown.state !== 'complete' && <span className="express-order__note">{sw ? 'Mwisho' : 'Due'} {due} EAT</span>}
  </span>;
}
