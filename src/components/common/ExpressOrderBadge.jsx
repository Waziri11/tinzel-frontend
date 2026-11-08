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
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [ticking, order?.expressDueAt]);
  const countdown = expressCountdown(order, now);
  if (!countdown) return null;
  const due = order.expressDueAt && new Date(order.expressDueAt).toLocaleString(sw ? 'sw-TZ' : 'en-GB', {
    timeZone: 'Africa/Dar_es_Salaam', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const duration = `${countdown.hours}h ${String(countdown.minutes).padStart(2, '0')}m`;
  const label = countdown.state === 'complete' ? (sw ? 'Imekamilika' : 'Complete')
    : countdown.state === 'pending' ? (sw ? 'Saa 24 · Inasubiri malipo' : '24h · Awaiting payment')
      : countdown.state === 'overdue' ? `${sw ? 'Imechelewa' : 'Overdue'} ${duration}`
        : `${duration} ${sw ? 'zimebaki' : 'left'}`;
  return <span className={`express-order is-${countdown.state}`} aria-label={`Express · ${label}`}>
    <span className="express-order__label"><Zap size={13} aria-hidden="true" />Express</span>
    <span className="express-order__clock">{label}</span>
    {countdown.paused && <span className="express-order__note">{sw ? 'Jumapili · Muda umesimama' : 'Sunday · Clock paused'}</span>}
    {due && countdown.state !== 'complete' && <span className="express-order__note">{sw ? 'Mwisho' : 'Due'} {due} EAT</span>}
  </span>;
}
