import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  X,
} from 'lucide-react';
import { api } from '../../services/api';

const TEMPLATE_LABELS = {
  order_submitted: 'Order Submitted',
  order_submitted_staff: 'New Order Alert',
  payment_verified: 'Payment Verified',
  order_assigned: 'Designer Assigned',
  draft_uploaded: 'Draft Uploaded for Review',
  draft_released: 'Draft Released to Client',
  draft_returned: 'Draft Returned for Changes',
  client_revision_requested: 'Client Requested Changes',
  client_approved: 'Client Approved Magazine',
  print_document_uploaded: 'Print File Uploaded',
  print_dispatched: 'Dispatched to Printer',
  printing_in_progress: 'Printing In Progress',
  order_dispatched: 'Courier Dispatched',
  order_closed: 'Order Delivered & Closed',
  client_otp: 'Client Portal OTP',
  manual_broadcast: 'Multi-Channel Broadcast',
  manual_test: 'System Test Message',
};

const formatTemplate = (tpl) =>
  TEMPLATE_LABELS[tpl] || String(tpl || 'Notification').replace(/_/g, ' ');

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Intl.DateTimeFormat('en-TZ', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateStr));
  } catch {
    return String(dateStr);
  }
};

export default function NotificationsPage({
  token,
  staffUser,
  onOpenOrder,
  onUnreadCountChange,
}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [channelCounts, setChannelCounts] = useState({
    all: 0,
    in_system: 0,
    email: 0,
    whatsapp: 0,
    sms: 0,
    failed: 0,
  });
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Filters
  const [readFilter, setReadFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [channelFilter, setChannelFilter] = useState('grouped'); // 'grouped' | 'in_system' | 'email' | 'phone' | 'all'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'delivered' | 'sent' | 'failed'
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Multi-Channel Compose Modal State
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({
    recipientName: '',
    email: '',
    phone: '',
    title: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  const isManagerOrAdmin = ['manager', 'admin'].includes(staffUser?.role);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const apiChannel =
        channelFilter === 'grouped' || channelFilter === 'all' ? '' : channelFilter;
      const params = {
        limit: 200,
        ...(apiChannel ? { channel: apiChannel } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(readFilter === 'unread' ? { unreadOnly: 'true' } : {}),
        ...(search ? { search } : {}),
      };

      const requests = [api.notifications.getHistory(token, params)];
      if (isManagerOrAdmin) {
        requests.push(api.notifications.getDiagnostics(token));
      }

      const [histRes, diagRes] = await Promise.allSettled(requests);
      if (histRes.status === 'fulfilled') {
        const list = histRes.value.notifications || [];
        setNotifications(list);
        const nextUnread = histRes.value.unreadCount ?? list.filter((n) => !n.isRead).length;
        setUnreadCount(nextUnread);
        if (onUnreadCountChange) onUnreadCountChange(nextUnread);
        if (histRes.value.channelCounts) {
          setChannelCounts(histRes.value.channelCounts);
        }
      } else {
        throw histRes.reason;
      }

      if (diagRes && diagRes.status === 'fulfilled') {
        setDiagnostics(diagRes.value.diagnostics || null);
      }
    } catch (err) {
      setError(err?.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [token, channelFilter, statusFilter, readFilter, search, isManagerOrAdmin, onUnreadCountChange]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await api.notifications.markRead(token, id);
      setNotifications((prev) =>
        prev.map((item) => {
          const itemId = item._id || item.id;
          const target = prev.find((p) => (p._id || p.id) === id);
          if (itemId === id || (target?.eventGroupId && item.eventGroupId === target.eventGroupId)) {
            return { ...item, isRead: true, readAt: new Date().toISOString() };
          }
          return item;
        })
      );
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        if (onUnreadCountChange) onUnreadCountChange(next);
        return next;
      });
    } catch (err) {
      setError(err.message || 'Could not mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead(token);
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      if (onUnreadCountChange) onUnreadCountChange(0);
      setNotice('All notifications have been marked as read.');
    } catch (err) {
      setError(err.message || 'Could not mark all notifications as read.');
    }
  };

  const handleResend = async (id, channel) => {
    try {
      setResendingId(id);
      setError('');
      await api.notifications.resend(token, id, channel);
      setNotice(`Notification re-sent via ${channel.toUpperCase()}.`);
      await loadNotifications();
    } catch (err) {
      setError(err.message || 'Failed to resend notification.');
    } finally {
      setResendingId(null);
    }
  };

  const handleSendTriChannel = async (e) => {
    e.preventDefault();
    if (!composeForm.message.trim()) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      await api.notifications.testSend(token, {
        triChannel: true,
        recipientName: composeForm.recipientName.trim() || 'Recipient',
        email: composeForm.email.trim(),
        phone: composeForm.phone.trim(),
        title: composeForm.title.trim() || 'Taarifa kutoka Tinzel',
        message: composeForm.message.trim(),
      });
      setComposeOpen(false);
      setComposeForm({ recipientName: '', email: '', phone: '', title: '', message: '' });
      setNotice('Notification dispatched across In-System, Email, and Phone Number.');
      await loadNotifications();
    } catch (err) {
      setError(err.message || 'Failed to dispatch multi-channel notification.');
    } finally {
      setSending(false);
    }
  };

  // Group notifications by eventGroupId when in 'grouped' (Unified Tri-Channel) view
  const displayedItems = useMemo(() => {
    const base = notifications.filter((item) => {
      if (readFilter === 'unread' && item.isRead) return false;
      if (readFilter === 'read' && !item.isRead) return false;
      return true;
    });

    if (channelFilter !== 'grouped') {
      return base.map((item) => ({
        primary: item,
        siblings: [item],
        channels: {
          in_system: item.channel === 'in_system' ? item : item.metadata?.channelsSummary?.in_system ? { status: 'delivered' } : null,
          email: item.channel === 'email' ? item : item.metadata?.channelsSummary?.email ? { status: 'sent', recipient: item.metadata?.channelsSummary?.emailAddress } : null,
          phone: ['whatsapp', 'sms'].includes(item.channel) ? item : item.metadata?.channelsSummary?.phone ? { status: 'sent', channel: 'whatsapp', recipient: item.metadata?.channelsSummary?.phoneNumber } : null,
        },
      }));
    }

    const groups = new Map();
    const result = [];

    for (const item of base) {
      const groupKey = item.eventGroupId || item._id || item.id;
      if (!groups.has(groupKey)) {
        const groupObj = {
          groupKey,
          primary: item,
          siblings: [item],
        };
        groups.set(groupKey, groupObj);
        result.push(groupObj);
      } else {
        const existing = groups.get(groupKey);
        existing.siblings.push(item);
        // Prefer in_system record as primary display entry
        if (item.channel === 'in_system') {
          existing.primary = item;
        }
      }
    }

    return result.map((group) => {
      const inSys = group.siblings.find((s) => s.channel === 'in_system');
      const emailRec = group.siblings.find((s) => s.channel === 'email');
      const phoneRec = group.siblings.find((s) => ['whatsapp', 'sms'].includes(s.channel));
      const summaryMeta = group.primary.metadata?.channelsSummary || {};

      return {
        primary: group.primary,
        siblings: group.siblings,
        channels: {
          in_system: inSys || (summaryMeta.in_system ? { status: 'delivered', channel: 'in_system' } : null),
          email:
            emailRec ||
            (summaryMeta.email
              ? { status: 'delivered', channel: 'email', recipient: summaryMeta.emailAddress }
              : null),
          phone:
            phoneRec ||
            (summaryMeta.phone
              ? { status: 'delivered', channel: 'whatsapp', recipient: summaryMeta.phoneNumber }
              : null),
        },
      };
    });
  }, [notifications, readFilter, channelFilter]);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '18px 20px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E7E5E4',
          borderRadius: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#8A6825',
              marginBottom: '4px',
            }}
          >
            QAMS Tri-Channel Notification Center
          </span>
          <h1
            style={{
              margin: '0 0 4px 0',
              fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
              fontStyle: 'italic',
              fontSize: '26px',
              fontWeight: 600,
              color: '#1C1917',
            }}
          >
            Notifications & Multi-Channel Dispatch
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#57534E' }}>
            Every workflow notification is synchronized across In-System Alerts, Email, and Phone Number (WhatsApp / SMS).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #D6D3D1',
                backgroundColor: '#FFFFFF',
                color: '#1C1917',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <CheckCheck size={15} color="#8A6825" />
              Mark All Read ({unreadCount})
            </button>
          )}

          {isManagerOrAdmin && (
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#1C1917',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Send size={14} />
              Send Tri-Channel Notification
            </button>
          )}

          <button
            type="button"
            onClick={loadNotifications}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #D6D3D1',
              backgroundColor: '#FFFFFF',
              color: '#44403C',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          style={{
            padding: '11px 14px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: '8px',
            color: '#166534',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            style={{ border: 'none', background: 'transparent', color: '#166534', fontWeight: 700, cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: '11px 14px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            color: '#991B1B',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            style={{ border: 'none', background: 'transparent', color: '#991B1B', fontWeight: 700, cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Summary Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#F4EAD5',
              color: '#6F531C',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Bell size={18} />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '20px', lineHeight: 1, color: '#1C1917' }}>
              {unreadCount}
            </strong>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#57534E' }}>
              Unread In-System Alerts
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#DBEAFE',
              color: '#1E40AF',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Mail size={18} />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '20px', lineHeight: 1, color: '#1C1917' }}>
              {channelCounts.email || 0}
            </strong>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#57534E' }}>
              Email Dispatches
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#DCFCE7',
              color: '#166534',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Phone size={18} />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '20px', lineHeight: 1, color: '#1C1917' }}>
              {(channelCounts.whatsapp || 0) + (channelCounts.sms || 0)}
            </strong>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#57534E' }}>
              Phone (WhatsApp / SMS)
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: diagnostics?.mode === 'twilio_live' ? '#DCFCE7' : '#F5F5F4',
              color: diagnostics?.mode === 'twilio_live' ? '#166534' : '#57534E',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <CheckCircle2 size={18} />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '14px', lineHeight: 1.2, color: '#1C1917' }}>
              {diagnostics?.mode === 'twilio_live' ? 'Live Gateway' : 'Active Sync'}
            </strong>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#57534E' }}>
              Email + Phone + In-System
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E7E5E4',
          borderRadius: '10px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'grouped', label: 'Unified Tri-Channel' },
            { id: 'in_system', label: 'In-System Inbox' },
            { id: 'email', label: 'Email Log' },
            { id: 'phone', label: 'Phone (WhatsApp/SMS)' },
            { id: 'all', label: 'All Raw Dispatches' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setChannelFilter(tab.id)}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #D6D3D1',
                backgroundColor: channelFilter === tab.id ? '#1C1917' : '#FFFFFF',
                color: channelFilter === tab.id ? '#FFFFFF' : '#44403C',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: '#F5F5F4',
              padding: '3px',
              borderRadius: '7px',
              border: '1px solid #E7E5E4',
            }}
          >
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'read', label: 'Read' },
            ].map((rf) => (
              <button
                key={rf.id}
                type="button"
                onClick={() => setReadFilter(rf.id)}
                style={{
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  backgroundColor: readFilter === rf.id ? '#FFFFFF' : 'transparent',
                  color: '#1C1917',
                  fontSize: '12px',
                  fontWeight: readFilter === rf.id ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {rf.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by delivery status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: '36px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid #D6D3D1',
              backgroundColor: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 600,
              color: '#1C1917',
            }}
          >
            <option value="all">All statuses</option>
            <option value="delivered">Delivered</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 10px',
              height: '36px',
              border: '1px solid #D6D3D1',
              borderRadius: '6px',
              backgroundColor: '#FAFAF9',
              minWidth: '220px',
            }}
          >
            <Search size={14} color="#78716C" />
            <input
              aria-label="Search notifications"
              placeholder="Search recipient, order, message..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: '12px',
                width: '100%',
                color: '#1C1917',
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                }}
                style={{ border: 'none', background: 'transparent', color: '#78716C', cursor: 'pointer' }}
              >
                ×
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Notification List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading && displayedItems.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E7E5E4',
              borderRadius: '10px',
              color: '#78716C',
            }}
          >
            Loading notifications…
          </div>
        ) : displayedItems.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E7E5E4',
              borderRadius: '10px',
              color: '#78716C',
            }}
          >
            <Bell size={28} color="#A8A29E" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1C1917' }}>No notifications found</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Notifications sent via Email, Phone, and In-System will appear here automatically.
            </div>
          </div>
        ) : (
          displayedItems.map(({ primary, siblings, channels }) => {
            const id = primary._id || primary.id;
            const isUnread = !primary.isRead;
            const orderObj =
              primary.orderId && typeof primary.orderId === 'object' ? primary.orderId : null;
            const orderTracking =
              orderObj?.trackingId ||
              orderObj?.submissionId ||
              primary.metadata?.trackingId ||
              primary.metadata?.submissionId ||
              null;
            const orderTargetId = orderObj?._id || (typeof primary.orderId === 'string' ? primary.orderId : null);
            const hasFailedSibling = siblings.some(
              (s) => s.status === 'failed' || s.status === 'undelivered'
            );

            return (
              <article
                key={id}
                style={{
                  backgroundColor: isUnread ? '#FFFDF9' : '#FFFFFF',
                  border: hasFailedSibling ? '1px solid #FCA5A5' : '1px solid #E7E5E4',
                  borderLeft: isUnread ? '4px solid #C5A059' : '1px solid #E7E5E4',
                  borderRadius: '10px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* Top Header Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {isUnread && (
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: '#C5A059',
                          color: '#FFFFFF',
                          fontSize: '10px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        New
                      </span>
                    )}

                    <strong style={{ fontSize: '15px', color: '#1C1917' }}>
                      {primary.title || primary.subject || formatTemplate(primary.template)}
                    </strong>

                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: '#F5F5F4',
                        color: '#57534E',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {formatTemplate(primary.template)}
                    </span>

                    {orderTracking && (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#F4EAD5',
                          color: '#6F531C',
                          fontSize: '11px',
                          fontWeight: 800,
                        }}
                      >
                        {orderTracking}
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: '12px', color: '#78716C', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Clock3 size={13} />
                    {formatTime(primary.createdAt || primary.timestamp)}
                  </span>
                </div>

                {/* Message Body */}
                <div
                  style={{
                    fontSize: '13px',
                    color: '#292524',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    backgroundColor: '#FAFAF9',
                    border: '1px solid #F5F5F4',
                    borderRadius: '8px',
                    padding: '10px 12px',
                  }}
                >
                  {primary.message}
                </div>

                {/* Tri-Channel Synchronization Badges (In-System + Email + Phone) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    flexWrap: 'wrap',
                    paddingTop: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* 1. In-System Channel Pill */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: channels.in_system ? '#F4EAD5' : '#F5F5F4',
                        color: channels.in_system ? '#6F531C' : '#A8A29E',
                      }}
                    >
                      <Bell size={12} />
                      In-System: {channels.in_system ? 'Recorded' : '—'}
                    </span>

                    {/* 2. Email Channel Pill */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: channels.email
                          ? channels.email.status === 'failed'
                            ? '#FEE2E2'
                            : '#DBEAFE'
                          : '#F5F5F4',
                        color: channels.email
                          ? channels.email.status === 'failed'
                            ? '#991B1B'
                            : '#1E40AF'
                          : '#A8A29E',
                      }}
                    >
                      <Mail size={12} />
                      Email:{' '}
                      {channels.email
                        ? `${channels.email.status || 'sent'}${
                            channels.email.recipient || channels.email.to
                              ? ` (${channels.email.recipient || channels.email.to})`
                              : ''
                          }`
                        : 'Not provided'}
                    </span>

                    {/* 3. Phone (WhatsApp / SMS) Channel Pill */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: channels.phone
                          ? channels.phone.status === 'failed'
                            ? '#FEE2E2'
                            : '#DCFCE7'
                          : '#F5F5F4',
                        color: channels.phone
                          ? channels.phone.status === 'failed'
                            ? '#991B1B'
                            : '#166534'
                          : '#A8A29E',
                      }}
                    >
                      <MessageSquare size={12} />
                      Phone ({(channels.phone?.channel || 'whatsapp').toUpperCase()}):{' '}
                      {channels.phone
                        ? `${channels.phone.status || 'sent'}${
                            channels.phone.recipient || channels.phone.to
                              ? ` (${channels.phone.recipient || channels.phone.to})`
                              : ''
                          }`
                        : 'Not provided'}
                    </span>
                  </div>

                  {/* Card Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(id)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #D6D3D1',
                          backgroundColor: '#FFFFFF',
                          color: '#1C1917',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Mark as read
                      </button>
                    )}

                    {isManagerOrAdmin &&
                      siblings
                        .filter((s) => s.channel !== 'in_system' && (s.status === 'failed' || s.status === 'undelivered'))
                        .map((failedItem) => {
                          const fId = failedItem._id || failedItem.id;
                          return (
                            <button
                              key={fId}
                              type="button"
                              disabled={resendingId === fId}
                              onClick={() => handleResend(fId, failedItem.channel)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #FCA5A5',
                                backgroundColor: '#FEF2F2',
                                color: '#991B1B',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <RotateCw size={12} />
                              Retry {failedItem.channel.toUpperCase()}
                            </button>
                          );
                        })}

                    {orderTargetId && onOpenOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isUnread) handleMarkRead(id);
                          onOpenOrder(orderTargetId);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 11px',
                          borderRadius: '6px',
                          border: '1px solid #1C1917',
                          backgroundColor: '#1C1917',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Open Order <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Multi-Channel Compose Modal */}
      {composeOpen && (
        <div
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setComposeOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(28, 25, 23, 0.55)',
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
            zIndex: 100,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Send Tri-Channel Notification"
            style={{
              width: 'min(520px, 100%)',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E7E5E4',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1C1917' }}>
                  Send Tri-Channel Notification
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#78716C' }}>
                  Dispatches simultaneously to In-System Notifications, Email, and Phone (WhatsApp / SMS).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                style={{ border: 'none', background: 'transparent', color: '#78716C', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendTriChannel} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                  Recipient Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amani Juma"
                  value={composeForm.recipientName}
                  onChange={(e) => setComposeForm({ ...composeForm, recipientName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    borderRadius: '6px',
                    border: '1px solid #D6D3D1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={composeForm.email}
                    onChange={(e) => setComposeForm({ ...composeForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 11px',
                      borderRadius: '6px',
                      border: '1px solid #D6D3D1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                    Phone Number (WhatsApp / SMS)
                  </label>
                  <input
                    type="text"
                    placeholder="+255712345678"
                    value={composeForm.phone}
                    onChange={(e) => setComposeForm({ ...composeForm, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 11px',
                      borderRadius: '6px',
                      border: '1px solid #D6D3D1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                  Notification Title / Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Taarifa ya Maendeleo ya Jarida Lako"
                  value={composeForm.title}
                  onChange={(e) => setComposeForm({ ...composeForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    borderRadius: '6px',
                    border: '1px solid #D6D3D1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#44403C', marginBottom: '4px' }}>
                  Message Content
                </label>
                <textarea
                  rows="4"
                  required
                  placeholder="Write the notification message to send across Email, Phone, and In-System..."
                  value={composeForm.message}
                  onChange={(e) => setComposeForm({ ...composeForm, message: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    borderRadius: '6px',
                    border: '1px solid #D6D3D1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '6px',
                    border: '1px solid #D6D3D1',
                    backgroundColor: '#FFFFFF',
                    color: '#44403C',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#1C1917',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {sending ? 'Dispatching…' : 'Send to Email, Phone & System'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
