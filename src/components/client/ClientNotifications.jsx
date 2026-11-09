import { hideSubmissionReference } from '../../utils/orderDisplay';
import PageSkeleton from '../common/PageSkeleton';
import StatePanel, { StateError } from '../common/StatePanel';
import { ActionButton } from '../common/SoftFlutter';
import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from 'antd';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { useVisiblePolling } from '../../hooks/useVisiblePolling';
export default function ClientNotifications({ token, onUnauthorized, open, onClose, onAfterClose }) {
  const { lang } = useLanguage();
  useEffect(() => {
    if (!open) return;
    // A menu or a removed "Mark as read" button can leave focus outside the inbox.
    const escape = event => {
      if (event.key !== 'Escape' || event.isComposing) return;
      const top = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter(dialog => dialog.getClientRects().length && getComputedStyle(dialog).visibility !== 'hidden').at(-1);
      if (top?.classList.contains('client-notifications-modal')) { event.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', escape, true);
    return () => document.removeEventListener('keydown', escape, true);
  }, [open, onClose]);
  const title = lang === 'sw' ? 'Taarifa' : 'Notifications';
  return <Modal className="client-notifications-modal" open={open} forceRender title={title} onCancel={onClose} afterClose={onAfterClose} footer={null}
      closeIcon={<span aria-label={lang === 'sw' ? 'Funga taarifa' : 'Close notifications'}>×</span>}
      styles={{ body: { maxHeight: '65dvh', overflowY: 'auto', overflowWrap: 'anywhere' } }}>
      {open && <NotificationHistory token={token} onUnauthorized={onUnauthorized} />}
    </Modal>;
}

function NotificationHistory({ token, onUnauthorized }) {
  const { lang } = useLanguage(),
    sw = lang === 'sw';
  const [items, setItems] = useState([]),
    [unread, setUnread] = useState(0),
    [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [readFailure, setReadFailure] = useState(null), [reading, setReading] = useState(null), [saved, setSaved] = useState(false);
  const load = useCallback(async () => {
    try {
      const data = await api.client.getNotifications(token);
      setItems(data.notifications || []);
      setUnread(data.unreadCount || 0);
      setError('');
    } catch (error) {
      if ([401, 403].includes(error.status)) onUnauthorized();
      else setError(error);
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
    if (reading) return;
    setReading(id); setReadFailure(null); setSaved(false);
    try {
      await api.client.readNotification(token, id);
      setItems(previous => previous.map(item => item._id === id ? { ...item, isRead: true } : item));
      setUnread(previous => Math.max(0, previous - 1)); setSaved(true);
    } catch (failure) {
      if ([401, 403].includes(failure.status)) onUnauthorized();
      else setReadFailure({ id, error: failure });
    } finally { setReading(null); }
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
      {error && <StateError compact error={error} onRetry={load} title={sw ? 'Taarifa hazijapakiwa' : 'Order updates could not load'}>{items.length > 0 && <p>{sw ? 'Taarifa zilizopakiwa awali bado zinaonekana.' : 'Previously loaded updates remain visible.'}</p>}</StateError>}
      {readFailure && <StateError compact error={readFailure.error} onRetry={() => read(readFailure.id)} title={sw ? 'Hatukuweza kuweka imesomwa' : 'Could not mark this update as read'} />}
      {saved && <p role="status">{sw ? 'Taarifa imewekwa imesomwa.' : 'Update marked as read.'}</p>}
      {initialLoading && <PageSkeleton compact variant="table" />}
      {!initialLoading && !items.length && !error && <StatePanel compact kind="empty" title={sw ? 'Bado hakuna taarifa' : 'No order updates yet'} description={sw ? 'Taarifa za oda yako zitaonekana hapa.' : 'Your order updates will appear here.'} />}
      {items.map((item) => (
        <article key={item._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
          <strong>{hideSubmissionReference(item.title)}</strong>
          <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13 }}>{hideSubmissionReference(item.message)}</p>
          <small>{new Date(item.createdAt).toLocaleString(sw ? 'sw-TZ' : 'en-TZ')}</small>
          {!item.isRead && (
            <ActionButton
              loading={reading === item._id}
              disabled={Boolean(reading)}
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
