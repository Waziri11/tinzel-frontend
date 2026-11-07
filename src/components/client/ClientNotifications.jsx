import { hideSubmissionReference } from '../../utils/orderDisplay';
import PageSkeleton from '../common/PageSkeleton';
import { ActionButton } from '../common/SoftFlutter';
import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from 'antd';
import { Bell } from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { useVisiblePolling } from '../../hooks/useVisiblePolling';
export default function ClientNotifications({ token, onUnauthorized }) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const title = lang === 'sw' ? 'Taarifa' : 'Notifications';
  return <>
    <button type="button" className="ui-button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <Bell size={16} aria-hidden="true" /> {title}
    </button>
    <Modal open={open} forceRender title={title} onCancel={() => setOpen(false)} footer={null}
      closeIcon={<span aria-label={lang === 'sw' ? 'Funga taarifa' : 'Close notifications'}>×</span>}
      styles={{ body: { maxHeight: '65dvh', overflowY: 'auto', overflowWrap: 'anywhere' } }}>
      {open && <NotificationHistory token={token} onUnauthorized={onUnauthorized} />}
    </Modal>
  </>;
}

function NotificationHistory({ token, onUnauthorized }) {
  const { lang } = useLanguage(),
    sw = lang === 'sw';
  const [items, setItems] = useState([]),
    [unread, setUnread] = useState(0),
    [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const data = await api.client.getNotifications(token);
      setItems(data.notifications || []);
      setUnread(data.unreadCount || 0);
      setError('');
    } catch (error) {
      if ([401, 403].includes(error.status)) onUnauthorized();
      else setError(sw ? 'Imeshindikana kupakia taarifa.' : 'Unable to load your order updates.');
    } finally { setInitialLoading(false); }
  }, [token, sw, onUnauthorized]);
  useEffect(() => {
    let active = true;
    if (active) load();
    return () => {
      active = false;
    };
  }, [load]);
  useVisiblePolling(load, Boolean(token));
  const read = async (id) => {
    try {
      await api.client.readNotification(token, id);
      await load();
    } catch {
      setError(sw ? 'Imeshindikana kuhifadhi. Jaribu tena.' : 'Unable to save. Please retry.');
    }
  };
  return (
    <section
      className="client-inbox"
      aria-label={sw ? 'Taarifa za oda yako' : 'Order updates'}
    >
      <h3 style={{ fontSize: 15, fontWeight: 600 }}>
        {sw ? 'Taarifa za oda yako' : 'Order updates'}
        {unread > 0 ? ` (${unread})` : ''}
      </h3>
      {error && (
        <p role="alert">
          {error} <ActionButton onClick={load}>{sw ? 'Jaribu tena' : 'Retry'}</ActionButton>
        </p>
      )}
      {initialLoading && <PageSkeleton compact variant="table" />}
      {!initialLoading && !items.length && !error && <p>{sw ? 'Taarifa za oda yako zitaonekana hapa.' : 'Your order updates will appear here.'}</p>}
      {items.map((item) => (
        <article key={item._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
          <strong>{hideSubmissionReference(item.title)}</strong>
          <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13 }}>{hideSubmissionReference(item.message)}</p>
          <small>{new Date(item.createdAt).toLocaleString(sw ? 'sw-TZ' : 'en-TZ')}</small>
          {!item.isRead && (
            <ActionButton
              onClick={() => read(item._id)}
              style={{ marginLeft: 12, color: 'var(--text-gold)', background: 'transparent' }}
            >
              {sw ? 'Weka imesomwa' : 'Mark as read'}
            </ActionButton>
          )}
        </article>
      ))}
    </section>
  );
}
