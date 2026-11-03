import SoftFlutter, { ActionButton } from './SoftFlutter';
import PageSkeleton from './PageSkeleton';
import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import '../admin/administration.css';
import PrinterNotificationSettings from '../admin/PrinterNotificationSettings';
import { useVisiblePolling } from '../../hooks/useVisiblePolling';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
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
  RotateCcw,
  RotateCw,
  Save,
  Search,
  Send,
  Server,
  ShieldCheck,
  Sliders,
  X,
} from 'lucide-react';
import { api } from '../../services/api';

const TEMPLATE_LABELS = {
  order_submitted: 'Order Submitted',
  order_submitted_staff: 'New Order Alert',
  payment_verified: 'Payment Verified',
  order_assigned: 'Designer Assigned',
  assignment_queued: 'Designer Assignment Required',
  draft_uploaded: 'Draft Uploaded for Review',
  draft_released: 'Draft Released to Client',
  draft_returned: 'Draft Returned for Changes',
  client_revision_requested: 'Client Requested Changes',
  client_approved: 'Client Approved Magazine',
  print_document_uploaded: 'Print File Uploaded',
  print_dispatched: 'Dispatched to Printer',
  printing_in_progress: 'Printing In Progress',
  printing_completed: 'Printing Complete — Dispatch Required',
  order_dispatched: 'Courier Dispatched',
  order_closed: 'Order Delivered & Closed',
  client_otp: 'Client Portal OTP',
  manual_broadcast: 'Multi-Channel Broadcast',
  manual_test: 'System Health Test',
};

const DEFAULT_TRIGGER_CATALOG = [
  {
    key: 'order_submitted',
    label: 'Order Submitted (Client & Staff)',
    description:
      'Triggered when a client submits a new magazine order form in Pre-Design.',
    category: 'Pre-Design',
    recipient: 'Client & Manager',
    defaults: { enabled: true, in_system: true, email: true, sms: true },
  },
  {
    key: 'payment_verified',
    label: 'Payment Verified & Tracking ID Issued',
    description:
      'Triggered when a manager verifies Lipa Namba payment and generates a Tracking ID.',
    category: 'Pre-Design',
    recipient: 'Client',
    defaults: { enabled: true, in_system: true, email: true, sms: true },
  },
  {
    key: 'order_assigned',
    label: 'Designer Assigned to Order',
    description:
      'Triggered when an order is assigned or reassigned to an editorial designer.',
    category: 'Design Phase',
    recipient: 'Designer',
    defaults: { enabled: true, in_system: true, email: true, sms: true },
  },
  {
    key: 'draft_uploaded',
    label: 'Draft Uploaded for Manager Review',
    description:
      'Triggered when a designer uploads a magazine draft PDF for manager QA.',
    category: 'Design Phase',
    recipient: 'Manager',
    defaults: { enabled: true, in_system: true, email: true, sms: true },
  },
  {
    key: 'draft_released',
    label: 'Draft Released to Client for Proof Review',
    description:
      'Triggered when a manager approves a draft and releases it to the client portal.',
    category: 'Design Phase',
    recipient: 'Client',
    defaults: { enabled: true, in_system: true, email: true, sms: true },
  },
  {
    key: 'draft_returned',
    label: 'Draft Returned for Changes (Internal)',
    description:
      'Triggered when a manager returns a draft to the designer with revision items.',
    category: 'Returns',
    recipient: 'Designer',
    defaults: { enabled: true, in_system: true, email: true, sms: true },
  },
  {
    key: 'client_revision_requested',
    label: 'Client Requested Revisions',
    description:
      'Triggered when a client submits page-by-page revision notes on a draft proof.',
    category: 'Returns',
    recipient: 'Designer & Manager',
    defaults: { enabled: true, in_system: true, email: true, sms: true },
  },
  {
    key: 'client_approved',
    label: 'Client Approved Magazine Proof',
    description:
      'Triggered when a client approves the entire magazine proof to enter Post-Design.',
    category: 'Post-Design',
    recipient: 'Designer & Manager',
    defaults: { enabled: true, in_system: true, email: true, sms: true },
  },
  {
    key: 'print_document_uploaded',
    label: 'Print-Ready PDF Uploaded',
    description:
      'Triggered when the designer uploads the final high-resolution print PDF.',
    category: 'Post-Design',
    recipient: 'Manager',
    defaults: { enabled: true, in_system: true, email: true, sms: true },
  },
  {
    key: 'print_dispatched',
    label: 'Order Sent to Printing Partner',
    description:
      'Triggered when a manager dispatches print specifications to the printing partner.',
    category: 'Post-Design',
    recipient: 'Printer',
    defaults: { enabled: true, in_system: true, email: false, sms: true },
  },
  {
    key: 'printing_in_progress',
    label: 'Printing In Progress',
    description:
      'Triggered when the printer confirms order receipt and printing begins.',
    category: 'Post-Design',
    recipient: 'Client',
    defaults: { enabled: true, in_system: true, email: true, sms: true },
  },
  {
    key: 'order_dispatched',
    label: 'Order Dispatched via Courier',
    description:
      'Triggered when courier and tracking reference details are recorded for delivery.',
    category: 'Post-Design',
    recipient: 'Client',
    defaults: { enabled: true, in_system: true, email: true, sms: true },
  },
  {
    key: 'order_closed',
    label: 'Order Delivered & Closed',
    description:
      'Triggered when final magazine delivery is confirmed and the order is closed.',
    category: 'Post-Design',
    recipient: 'Client & Manager',
    defaults: { enabled: true, in_system: true, email: true, sms: true },
  },
  {
    key: 'client_otp',
    label: 'Client Portal Login OTP',
    description:
      'Triggered when a client requests a one-time password to access the tracking portal.',
    category: 'Security',
    recipient: 'Client',
    defaults: { enabled: true, in_system: true, email: true, sms: true },
  },
];

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

const ToggleSwitch = ({ checked, onChange, disabled = false, label }) => {
  const tx = useInterfaceText();
  return (
    <button
      type="button"
      role="switch"
      className="notification-switch"
      aria-checked={checked}
      aria-label={tx(label)}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        position: 'relative',
        width: '40px',
        height: '22px',
        borderRadius: '999px',
        border: '1px solid',
        borderColor: checked ? '#166534' : '#D6D3D1',
        backgroundColor: checked ? '#166534' : 'var(--border-color)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: 0,
        opacity: disabled ? 0.45 : 1,
        transition: 'background-color 0.15s ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '20px' : '2px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          transition: 'left 0.15s ease',
        }}
      />
    </button>
  );
};

export default function NotificationsPage({
  token,
  staffUser,
  onOpenOrder,
  onUnreadCountChange,
}) {
  const tx = useInterfaceText();

  const canConfigure = staffUser?.role === 'admin';

  // Top-level QAMS Section Tabs: 'history' | 'triggers' | 'health'
  const [activeSection, setActiveSection] = useState('history');

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
  const [diagLoading, setDiagLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Notification Settings State
  const [settings, setSettings] = useState({
    channels: { in_system: true, email: true, sms: true },
    smsSenderId: 'ORDER',
    triggers: Object.fromEntries(
      DEFAULT_TRIGGER_CATALOG.map((t) => [t.key, { ...t.defaults }]),
    ),
    catalog: DEFAULT_TRIGGER_CATALOG,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Health Test State (SMS & Email)
  const [smsTestForm, setSmsTestForm] = useState({
    to: '',
    from: 'ORDER',
    message:
      'Tinzel Health Test: NextSMS gateway is active and ready to deliver order status updates.',
  });
  const [smsTesting, setSmsTesting] = useState(false);
  const [smsTestResult, setSmsTestResult] = useState(null);

  const [emailTestForm, setEmailTestForm] = useState({
    to: staffUser?.email || '',
    subject: 'Tinzel Email Health Check - SMTP Verification',
    message:
      'This is a diagnostic test email from the Tinzel Notification Center confirming email delivery configuration.',
  });
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState(null);

  // History Filters
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
  useDialogFocus(composeOpen, () => {
    if (!sending) setComposeOpen(false);
  });

  useEffect(() => {
    if (!composeOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setComposeOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [composeOpen]);

  const loadNotifications = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const apiChannel =
          channelFilter === 'grouped' || channelFilter === 'all'
            ? ''
            : channelFilter;
        const params = {
          limit: 200,
          ...(apiChannel ? { channel: apiChannel } : {}),
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          ...(readFilter === 'unread' ? { unreadOnly: 'true' } : {}),
          ...(search ? { search } : {}),
        };

        const requests = [api.notifications.getHistory(token, params)];
        if (canConfigure && !silent) {
          requests.push(Promise.resolve({ diagnostics: null }));
          requests.push(api.notifications.getSettings(token));
        }

        const [histRes, diagRes, settingsRes] =
          await Promise.allSettled(requests);
        if (histRes.status === 'fulfilled') {
          const list = histRes.value.notifications || [];
          setNotifications(list);
          const nextUnread =
            histRes.value.unreadCount ?? list.filter((n) => !n.isRead).length;
          setUnreadCount(nextUnread);
          if (onUnreadCountChange) onUnreadCountChange(nextUnread);
          if (histRes.value.channelCounts) {
            setChannelCounts(histRes.value.channelCounts);
          }
        } else {
          throw histRes.reason;
        }

        if (diagRes && diagRes.status === 'fulfilled') {
          const diagData = diagRes.value.diagnostics || null;
          setDiagnostics(diagData);
          if (diagData?.sms?.configuredSenderId) {
            setSmsTestForm((prev) => ({
              ...prev,
              from: prev.from || diagData.sms.configuredSenderId,
            }));
          }
        }

        if (
          settingsRes &&
          settingsRes.status === 'fulfilled' &&
          settingsRes.value.settings
        ) {
          const loadedSettings = settingsRes.value.settings;
          setSettings((prev) => ({
            ...prev,
            ...loadedSettings,
            catalog: loadedSettings.catalog || DEFAULT_TRIGGER_CATALOG,
          }));
          if (loadedSettings.smsSenderId) {
            setSmsTestForm((prev) => ({
              ...prev,
              from: loadedSettings.smsSenderId,
            }));
          }
        }
      } catch (err) {
        setError(err?.message || 'Unable to load notifications.');
      } finally {
        setLoading(false);
      }
    },
    [
      token,
      channelFilter,
      statusFilter,
      readFilter,
      search,
      canConfigure,
      onUnreadCountChange,
    ],
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);
  useVisiblePolling(() => loadNotifications(true), Boolean(token));

  const handleRefreshDiagnostics = async () => {
    if (!canConfigure) return;
    setDiagLoading(true);
    setError('');
    try {
      const res = await api.notifications.getDiagnostics(token);
      setDiagnostics(res.diagnostics || null);
      setNotice('Gateway diagnostics refreshed successfully.');
    } catch (err) {
      setError(err.message || 'Failed to refresh gateway diagnostics.');
    } finally {
      setDiagLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setError('');
    setNotice('');
    try {
      const res = await api.notifications.updateSettings(token, {
        channels: settings.channels,
        smsSenderId: settings.smsSenderId,
        triggers: settings.triggers,
      });
      if (res.settings) {
        setSettings((prev) => ({
          ...prev,
          ...res.settings,
          catalog: res.settings.catalog || prev.catalog,
        }));
      }
      setNotice(
        'Notification trigger settings saved and applied across all workflow phases.',
      );
    } catch (err) {
      setError(err.message || 'Failed to save notification settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetSettings = async () => {
    setSavingSettings(true);
    setError('');
    setNotice('');
    try {
      const res = await api.notifications.resetSettings(token);
      if (res.settings) {
        setSettings((prev) => ({
          ...prev,
          ...res.settings,
          catalog: res.settings.catalog || prev.catalog,
        }));
      }
      setNotice('Notification settings restored to factory defaults.');
    } catch (err) {
      setError(err.message || 'Failed to reset notification settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleGlobalChannel = (channelKey, nextVal) => {
    setSettings((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channelKey]: nextVal,
      },
    }));
  };

  const handleToggleTriggerField = (triggerKey, field, nextVal) => {
    setSettings((prev) => ({
      ...prev,
      triggers: {
        ...prev.triggers,
        [triggerKey]: {
          ...(prev.triggers?.[triggerKey] || {
            enabled: true,
            in_system: true,
            email: true,
            sms: true,
          }),
          [field]: nextVal,
        },
      },
    }));
  };

  const handleRunSmsHealthTest = async (e) => {
    e.preventDefault();
    if (!smsTestForm.to.trim()) return;
    setSmsTesting(true);
    setError('');
    setNotice('');
    setSmsTestResult(null);
    try {
      const res = await api.notifications.testSmsHealth(token, {
        to: smsTestForm.to.trim(),
        from: smsTestForm.from.trim() || settings.smsSenderId || 'ORDER',
        message: smsTestForm.message.trim(),
      });
      setSmsTestResult(res.report || res);
      setNotice(res.message || 'Test SMS dispatched via NextSMS.');
      await loadNotifications();
    } catch (err) {
      setError(err.message || 'SMS health test failed.');
    } finally {
      setSmsTesting(false);
    }
  };

  const handleRunEmailHealthTest = async (e) => {
    e.preventDefault();
    if (!emailTestForm.to.trim()) return;
    setEmailTesting(true);
    setError('');
    setNotice('');
    setEmailTestResult(null);
    try {
      const res = await api.notifications.testEmailHealth(token, {
        to: emailTestForm.to.trim(),
        subject: emailTestForm.subject.trim(),
        message: emailTestForm.message.trim(),
      });
      setEmailTestResult(res.report || res);
      setNotice(res.message || 'Test email dispatched.');
      await loadNotifications();
    } catch (err) {
      setError(err.message || 'Email health test failed.');
    } finally {
      setEmailTesting(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.notifications.markRead(token, id);
      setNotifications((prev) =>
        prev.map((item) => {
          const itemId = item._id || item.id;
          const target = prev.find((p) => (p._id || p.id) === id);
          if (
            itemId === id ||
            (target?.eventGroupId && item.eventGroupId === target.eventGroupId)
          ) {
            return { ...item, isRead: true, readAt: new Date().toISOString() };
          }
          return item;
        }),
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
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true })),
      );
      setUnreadCount(0);
      if (onUnreadCountChange) onUnreadCountChange(0);
      setNotice('All notifications have been marked as read.');
    } catch (err) {
      setError(err.message || 'Could not mark all notifications as read.');
    }
  };

  const handleResend = async (id, channel, uncertain = false) => {
    if (
      uncertain &&
      !window.confirm(
        tx(
          'Provider acceptance is unknown. Retrying may send a duplicate. Retry this message?',
        ),
      )
    )
      return;
    try {
      setResendingId(id);
      setError('');
      await api.notifications.resend(token, id, channel, uncertain);
      setNotice('Retry processed. Check the recorded delivery result below.');
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
      setComposeForm({
        recipientName: '',
        email: '',
        phone: '',
        title: '',
        message: '',
      });
      setNotice(
        'Notification dispatched across In-System, Email, and Phone Number.',
      );
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
          in_system:
            item.channel === 'in_system'
              ? item
              : item.metadata?.channelsSummary?.in_system
                ? { status: 'unconfirmed' }
                : null,
          email:
            item.channel === 'email'
              ? item
              : item.metadata?.channelsSummary?.email
                ? {
                    status: 'unconfirmed',
                    recipient: item.metadata?.channelsSummary?.emailAddress,
                  }
                : null,
          phone: ['whatsapp', 'sms'].includes(item.channel)
            ? item
            : item.metadata?.channelsSummary?.phone
              ? {
                  status: 'unconfirmed',
                  channel: 'sms',
                  recipient: item.metadata?.channelsSummary?.phoneNumber,
                }
              : null,
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
        if (item.channel === 'in_system') {
          existing.primary = item;
        }
      }
    }

    return result.map((group) => {
      const inSys = group.siblings.find((s) => s.channel === 'in_system');
      const emailRec = group.siblings.find((s) => s.channel === 'email');
      const phoneRec = group.siblings.find((s) =>
        ['whatsapp', 'sms'].includes(s.channel),
      );
      const summaryMeta = group.primary.metadata?.channelsSummary || {};

      return {
        primary: group.primary,
        siblings: group.siblings,
        channels: {
          in_system:
            inSys ||
            (summaryMeta.in_system
              ? { status: 'unconfirmed', channel: 'in_system' }
              : null),
          email:
            emailRec ||
            (summaryMeta.email
              ? {
                  status: 'unconfirmed',
                  channel: 'email',
                  recipient: summaryMeta.emailAddress,
                }
              : null),
          phone:
            phoneRec ||
            (summaryMeta.phone
              ? {
                  status: 'unconfirmed',
                  channel: 'sms',
                  recipient: summaryMeta.phoneNumber,
                }
              : null),
        },
      };
    });
  }, [notifications, readFilter, channelFilter]);

  const groupedTriggers = useMemo(() => {
    const catalog = settings.catalog || DEFAULT_TRIGGER_CATALOG;
    const map = new Map();
    for (const item of catalog) {
      const cat = item.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(item);
    }
    return Array.from(map.entries());
  }, [settings.catalog]);

  const smsHealthy = Boolean(diagnostics?.sms?.authenticated);
  const emailHealthy = Boolean(diagnostics?.email?.connected);

  return (
    <section
      className="communications-admin"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        maxWidth: '1440px',
        margin: '0 auto',
      }}
    >
      {activeSection === 'triggers' && staffUser?.role === 'admin' && (
        <PrinterNotificationSettings token={token} />
      )}
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '18px 20px',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
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
            <InterfaceText>Tinzel communications</InterfaceText>
          </span>
          <h1
            style={{
              margin: '0 0 4px 0',
              fontFamily:
                'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
              fontStyle: 'italic',
              fontSize: '26px',
              fontWeight: 600,
              color: 'var(--text-main)',
            }}
          >
            <InterfaceText>
              {canConfigure
                ? 'Notifications, Triggers & Gateway Health'
                : 'Notifications'}
            </InterfaceText>
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#57534E' }}>
            <InterfaceText>
              {canConfigure
                ? 'Configure automated order lifecycle triggers, inspect multi-channel dispatch history, and run live SMS (NextSMS) and Email (SMTP) health tests.'
                : 'Review workflow notifications and delivery history.'}
            </InterfaceText>
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {unreadCount > 0 && (
            <ActionButton
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
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <CheckCheck size={15} color="#8A6825" />
              <InterfaceText>Mark All Read (</InterfaceText>
              {unreadCount})
            </ActionButton>
          )}

          {canConfigure && (
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
                backgroundColor: 'var(--text-main)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Send size={14} />
              <InterfaceText>Send Tri-Channel Notification</InterfaceText>
            </button>
          )}

          <ActionButton
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
            {loading ? <SoftFlutter size={15} /> : <RefreshCw size={15} />}
            <InterfaceText>Refresh</InterfaceText>
          </ActionButton>
        </div>
      </div>

      {/* QAMS Section Navigation Bar (History | Triggers & Settings | SMS & Email Health Test) */}
      {canConfigure && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '8px 12px',
            flexWrap: 'wrap',
          }}
        >
          {[
            {
              id: 'history',
              label: 'Notification History & Inbox',
              icon: Bell,
              badge: unreadCount > 0 ? unreadCount : null,
            },
            {
              id: 'triggers',
              label: 'Notification Triggers & Settings',
              icon: Sliders,
              badge: `${
                Object.values(settings.triggers || {}).filter(
                  (t) => t.enabled !== false,
                ).length
              }/${(settings.catalog || DEFAULT_TRIGGER_CATALOG).length} Active`,
            },
            {
              id: 'health',
              label: 'SMS & Email Health Test',
              icon: Activity,
              badge: smsHealthy ? 'NextSMS Live' : 'Check Gateways',
            },
          ].map((sec) => {
            const IconComp = sec.icon;
            const active = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: active
                    ? '1px solid var(--text-main)'
                    : '1px solid transparent',
                  backgroundColor: active
                    ? 'var(--text-main)'
                    : 'var(--bg-primary)',
                  color: active ? '#FFFFFF' : '#44403C',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <IconComp
                  size={15}
                  color={active ? 'var(--accent-primary)' : 'var(--text-muted)'}
                />
                <span>{tx(sec.label)}</span>
                {sec.badge && (
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: '999px',
                      backgroundColor: active
                        ? 'var(--accent-primary)'
                        : 'var(--border-color)',
                      color: active ? '#FFFFFF' : 'var(--text-main)',
                      fontSize: '10px',
                      fontWeight: 800,
                    }}
                  >
                    {sec.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

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
            style={{
              border: 'none',
              background: 'transparent',
              color: '#166534',
              fontWeight: 700,
              cursor: 'pointer',
            }}
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
            style={{
              border: 'none',
              background: 'transparent',
              color: '#991B1B',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Summary Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '12px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
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
            <strong
              style={{
                display: 'block',
                fontSize: '20px',
                lineHeight: 1,
                color: 'var(--text-main)',
              }}
            >
              {unreadCount}
            </strong>
            <span
              style={{ fontSize: '11px', fontWeight: 600, color: '#57534E' }}
            >
              <InterfaceText>Unread In-System Alerts</InterfaceText>
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
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
            <strong
              style={{
                display: 'block',
                fontSize: '20px',
                lineHeight: 1,
                color: 'var(--text-main)',
              }}
            >
              {channelCounts.email || 0}
            </strong>
            <span
              style={{ fontSize: '11px', fontWeight: 600, color: '#57534E' }}
            >
              <InterfaceText>Email Dispatches</InterfaceText>
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
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
            <strong
              style={{
                display: 'block',
                fontSize: '20px',
                lineHeight: 1,
                color: 'var(--text-main)',
              }}
            >
              {(channelCounts.whatsapp || 0) + (channelCounts.sms || 0)}
            </strong>
            <span
              style={{ fontSize: '11px', fontWeight: 600, color: '#57534E' }}
            >
              <InterfaceText>SMS / Phone Dispatches (Sender:</InterfaceText>{' '}
              {settings.smsSenderId || 'ORDER'})
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
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
              backgroundColor: smsHealthy ? '#DCFCE7' : '#F5F5F4',
              color: smsHealthy ? '#166534' : '#57534E',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <CheckCircle2 size={18} />
          </div>
          <div>
            <strong
              style={{
                display: 'block',
                fontSize: '14px',
                lineHeight: 1.2,
                color: 'var(--text-main)',
              }}
            >
              {smsHealthy
                ? `NextSMS Live (${diagnostics?.sms?.balance?.display || 'Active'})`
                : diagnostics?.mode === 'twilio_live'
                  ? 'Live Gateway'
                  : 'Gateway not verified'}
            </strong>
            <span
              style={{ fontSize: '11px', fontWeight: 600, color: '#57534E' }}
            >
              {smsHealthy
                ? `${diagnostics?.sms?.balance?.default_balance ?? '—'} SMS credits available`
                : 'See each recorded channel outcome below'}
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 2: CONFIGURABLE NOTIFICATION TRIGGERS & SETTINGS                  */}
      {/* ===================================================================== */}
      {activeSection === 'triggers' && canConfigure && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Global Channel Master Controls */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                  }}
                >
                  <InterfaceText>Global Channel Master Controls</InterfaceText>
                </h2>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <InterfaceText>
                    Enable or mute entire delivery channels system-wide and set
                    the default NextSMS Sender ID.
                  </InterfaceText>
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <ActionButton loading={savingSettings}
                  type="button"
                  onClick={handleResetSettings}
                  disabled={savingSettings}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D6D3D1',
                    backgroundColor: '#FFFFFF',
                    color: '#44403C',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={14} />
                  <InterfaceText>Reset Defaults</InterfaceText>
                </ActionButton>

                <ActionButton loading={savingSettings}
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--text-main)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Save size={14} />
                  {savingSettings ? 'Saving…' : 'Save Trigger Settings'}
                </ActionButton>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                gap: '12px',
              }}
            >
              {/* In-System Master Toggle */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700,
                      fontSize: '13px',
                      color: 'var(--text-main)',
                    }}
                  >
                    <Bell size={15} color="#8A6825" />
                    <InterfaceText>In-System Alerts</InterfaceText>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginTop: '3px',
                    }}
                  >
                    <InterfaceText>
                      Workstation inbox &amp; unread badge counters
                    </InterfaceText>
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.channels?.in_system !== false}
                  onChange={(val) =>
                    handleToggleGlobalChannel('in_system', val)
                  }
                  label={tx('Toggle In-System channel')}
                />
              </div>

              {/* Email Master Toggle */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700,
                      fontSize: '13px',
                      color: 'var(--text-main)',
                    }}
                  >
                    <Mail size={15} color="#1E40AF" />
                    <InterfaceText>Email Notifications (SMTP)</InterfaceText>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginTop: '3px',
                    }}
                  >
                    <InterfaceText>
                      Transactional HTML &amp; plaintext emails
                    </InterfaceText>
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.channels?.email !== false}
                  onChange={(val) => handleToggleGlobalChannel('email', val)}
                  label={tx('Toggle Email channel')}
                />
              </div>

              {/* SMS Master Toggle */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700,
                      fontSize: '13px',
                      color: 'var(--text-main)',
                    }}
                  >
                    <MessageSquare size={15} color="#166534" />
                    <InterfaceText>SMS Notifications (NextSMS)</InterfaceText>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginTop: '3px',
                    }}
                  >
                    <InterfaceText>
                      Tanzanian mobile SMS via NextSMS v2
                    </InterfaceText>
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.channels?.sms !== false}
                  onChange={(val) => handleToggleGlobalChannel('sms', val)}
                  label={tx('Toggle SMS channel')}
                />
              </div>

              {/* Default NextSMS Sender ID */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <label
                  htmlFor="nextsms-sender-id-input"
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#57534E',
                  }}
                >
                  <InterfaceText>Active NextSMS Sender ID</InterfaceText>
                </label>
                <input
                  id="nextsms-sender-id-input"
                  type="text"
                  maxLength={11}
                  value={settings.smsSenderId || ''}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      smsSenderId: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder={tx('ORDER')}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D6D3D1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Per-Phase Trigger Matrix */}
          {groupedTriggers.map(([category, items]) => (
            <div
              key={category}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 18px',
                  backgroundColor: 'var(--bg-primary)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <strong
                  style={{
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-main)',
                  }}
                >
                  {category} <InterfaceText>Triggers</InterfaceText>
                </strong>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                  }}
                >
                  {items.length} <InterfaceText>milestone events</InterfaceText>
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {items.map((item, idx) => {
                  const cfg = settings.triggers?.[item.key] || item.defaults;
                  const isEnabled = cfg.enabled !== false;
                  return (
                    <div
                      key={item.key}
                      style={{
                        padding: '14px 18px',
                        borderBottom:
                          idx < items.length - 1 ? '1px solid #F5F5F4' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap',
                        backgroundColor: isEnabled
                          ? '#FFFFFF'
                          : 'var(--bg-primary)',
                      }}
                    >
                      <div style={{ flex: '1 1 320px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <strong
                            style={{
                              fontSize: '14px',
                              color: isEnabled
                                ? 'var(--text-main)'
                                : 'var(--text-muted)',
                            }}
                          >
                            {tx(item.label)}
                          </strong>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              backgroundColor: '#F4EAD5',
                              color: '#6F531C',
                              fontSize: '10px',
                              fontWeight: 800,
                            }}
                          >
                            <InterfaceText>Recipient:</InterfaceText>{' '}
                            {item.recipient}
                          </span>
                          <code
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#F5F5F4',
                              color: '#57534E',
                              fontSize: '11px',
                            }}
                          >
                            {item.key}
                          </code>
                        </div>
                        <p
                          style={{
                            margin: '4px 0 0 0',
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {tx(item.description)}
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '20px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: 'var(--text-main)',
                            }}
                          >
                            <InterfaceText>Trigger Enabled</InterfaceText>
                          </span>
                          <ToggleSwitch
                            checked={isEnabled}
                            onChange={(val) =>
                              handleToggleTriggerField(item.key, 'enabled', val)
                            }
                            label={`${item.label} master toggle`}
                          />
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: isEnabled
                                ? 'var(--text-main)'
                                : 'var(--text-muted)',
                              cursor: isEnabled ? 'pointer' : 'not-allowed',
                            }}
                          >
                            <input
                              type="checkbox"
                              disabled={
                                !isEnabled ||
                                settings.channels?.in_system === false
                              }
                              checked={Boolean(
                                cfg.in_system &&
                                  settings.channels?.in_system !== false,
                              )}
                              onChange={(e) =>
                                handleToggleTriggerField(
                                  item.key,
                                  'in_system',
                                  e.target.checked,
                                )
                              }
                            />
                            <InterfaceText>In-System</InterfaceText>
                          </label>

                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: isEnabled
                                ? '#1E40AF'
                                : 'var(--text-muted)',
                              cursor: isEnabled ? 'pointer' : 'not-allowed',
                            }}
                          >
                            <input
                              type="checkbox"
                              disabled={
                                !isEnabled || settings.channels?.email === false
                              }
                              checked={Boolean(
                                cfg.email && settings.channels?.email !== false,
                              )}
                              onChange={(e) =>
                                handleToggleTriggerField(
                                  item.key,
                                  'email',
                                  e.target.checked,
                                )
                              }
                            />
                            <InterfaceText>Email</InterfaceText>
                          </label>

                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: isEnabled
                                ? '#166534'
                                : 'var(--text-muted)',
                              cursor: isEnabled ? 'pointer' : 'not-allowed',
                            }}
                          >
                            <input
                              type="checkbox"
                              disabled={
                                !isEnabled || settings.channels?.sms === false
                              }
                              checked={Boolean(
                                cfg.sms && settings.channels?.sms !== false,
                              )}
                              onChange={(e) =>
                                handleToggleTriggerField(
                                  item.key,
                                  'sms',
                                  e.target.checked,
                                )
                              }
                            />
                            <InterfaceText>SMS (NextSMS)</InterfaceText>
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SMS & EMAIL HEALTH TEST                                        */}
      {/* ===================================================================== */}
      {activeSection === 'health' && canConfigure && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                }}
              >
                <InterfaceText>
                  Gateway Connectivity &amp; Live Health Verification
                </InterfaceText>
              </h2>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                <InterfaceText>
                  Verify live NextSMS API v2 credentials, inspect SMS credit
                  balance, check Google SMTP connectivity, and dispatch real
                  test messages.
                </InterfaceText>
              </p>
            </div>
            <ActionButton
              type="button"
              onClick={handleRefreshDiagnostics}
              disabled={diagLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid var(--text-main)',
                backgroundColor: 'var(--text-main)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {diagLoading ? <SoftFlutter size={14} /> : <RefreshCw size={14} />}
              {diagLoading ? 'Checking Gateways…' : 'Run Gateway Health Check'}
            </ActionButton>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
              gap: '16px',
            }}
          >
            {/* 1. NextSMS Health & Test Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: smsHealthy ? '#DCFCE7' : '#FEF2F2',
                      color: smsHealthy ? '#166534' : '#991B1B',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                      }}
                    >
                      <InterfaceText>
                        SMS Gateway Health (NextSMS API)
                      </InterfaceText>
                    </h3>
                    <span
                      style={{ fontSize: '12px', color: 'var(--text-muted)' }}
                    >
                      <InterfaceText>
                        Endpoint: messaging-service.co.tz (
                      </InterfaceText>
                      {diagnostics?.sms?.apiVersion || 'v2'})
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 800,
                    backgroundColor: smsHealthy ? '#DCFCE7' : '#FEE2E2',
                    color: smsHealthy ? '#166534' : '#991B1B',
                  }}
                >
                  {smsHealthy
                    ? 'CONNECTED & AUTHENTICATED'
                    : 'DISCONNECTED / CHECK KEY'}
                </span>
              </div>

              {/* NextSMS Metrics Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      display: 'block',
                    }}
                  >
                    <InterfaceText>SMS Credit Balance</InterfaceText>
                  </span>
                  <strong
                    style={{ fontSize: '15px', color: 'var(--text-main)' }}
                  >
                    {diagnostics?.sms?.balance?.display || '—'}
                  </strong>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      display: 'block',
                    }}
                  >
                    <InterfaceText>Estimated Remaining SMS</InterfaceText>
                  </span>
                  <strong style={{ fontSize: '15px', color: '#166534' }}>
                    {diagnostics?.sms?.balance?.default_balance !== undefined
                      ? `${diagnostics.sms.balance.default_balance} SMS`
                      : '—'}
                  </strong>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      display: 'block',
                    }}
                  >
                    <InterfaceText>Active Sender ID</InterfaceText>
                  </span>
                  <strong
                    style={{ fontSize: '13px', color: 'var(--text-main)' }}
                  >
                    {diagnostics?.sms?.configuredSenderId ||
                      settings.smsSenderId ||
                      'ORDER'}
                  </strong>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      display: 'block',
                    }}
                  >
                    <InterfaceText>Gateway Latency</InterfaceText>
                  </span>
                  <strong
                    style={{ fontSize: '13px', color: 'var(--text-main)' }}
                  >
                    {diagnostics?.sms?.latencyMs
                      ? `${diagnostics.sms.latencyMs} ms`
                      : '—'}
                  </strong>
                </div>
              </div>

              {/* Send Test SMS Form */}
              <form
                onSubmit={handleRunSmsHealthTest}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  paddingTop: '4px',
                }}
              >
                <div
                  className="admin-form-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div>
                    <label
                      htmlFor={`control-59897`}
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#44403C',
                        marginBottom: '4px',
                      }}
                    >
                      <InterfaceText>
                        Test Recipient Phone (Tanzania)
                      </InterfaceText>
                    </label>
                    <input
                      id={`control-59897`}
                      type="text"
                      required
                      value={smsTestForm.to}
                      onChange={(e) =>
                        setSmsTestForm({ ...smsTestForm, to: e.target.value })
                      }
                      placeholder="+255762022730"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #D6D3D1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`control-60967`}
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#44403C',
                        marginBottom: '4px',
                      }}
                    >
                      <InterfaceText>Sender ID</InterfaceText>
                    </label>
                    <input
                      id={`control-60967`}
                      type="text"
                      value={smsTestForm.from}
                      onChange={(e) =>
                        setSmsTestForm({
                          ...smsTestForm,
                          from: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder={tx('ORDER')}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #D6D3D1',
                        fontSize: '13px',
                        fontWeight: 700,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`control-62110`}
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#44403C',
                      marginBottom: '4px',
                    }}
                  >
                    <InterfaceText>Test SMS Message</InterfaceText>
                  </label>
                  <textarea
                    id={`control-62110`}
                    rows="2"
                    required
                    value={smsTestForm.message}
                    onChange={(e) =>
                      setSmsTestForm({
                        ...smsTestForm,
                        message: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #D6D3D1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <ActionButton loading={smsTesting}
                  type="submit"
                  disabled={smsTesting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#166534',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Send size={14} />
                  {smsTesting
                    ? 'Sending Test SMS via NextSMS…'
                    : 'Send Test SMS Now'}
                </ActionButton>
              </form>

              {smsTestResult && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: smsTestResult.success
                      ? '#F0FDF4'
                      : '#FEF2F2',
                    border: smsTestResult.success
                      ? '1px solid #86EFAC'
                      : '1px solid #FECACA',
                    fontSize: '12px',
                    color: smsTestResult.success ? '#166534' : '#991B1B',
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: '4px' }}>
                    {smsTestResult.success
                      ? 'SMS Health Test Passed'
                      : 'SMS Health Test Failed'}
                  </div>
                  <div>
                    <InterfaceText>Recipient:</InterfaceText>
                    <strong>{smsTestResult.to}</strong>
                    <InterfaceText>| Sender:</InterfaceText>{' '}
                    <strong>{smsTestResult.senderId}</strong>
                    <InterfaceText>| Latency:</InterfaceText>{' '}
                    <strong>
                      {smsTestResult.latencyMs}{' '}
                      <InterfaceText>ms</InterfaceText>
                    </strong>
                  </div>
                  {smsTestResult.nextSmsStatus && (
                    <div>
                      <InterfaceText>Gateway Status:</InterfaceText>
                      <strong>{smsTestResult.nextSmsStatus.name}</strong> (
                      {smsTestResult.nextSmsStatus.description})
                    </div>
                  )}
                  {smsTestResult.messageId && (
                    <div>
                      <InterfaceText>Message ID:</InterfaceText>
                      <code>{smsTestResult.messageId}</code>
                      <InterfaceText>| Cost:</InterfaceText>{' '}
                      <strong>
                        {smsTestResult.price ?? 16}{' '}
                        <InterfaceText>TZS</InterfaceText>
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Email (Google SMTP) Health & Test Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: emailHealthy ? '#DBEAFE' : '#F4EAD5',
                      color: emailHealthy ? '#1E40AF' : '#6F531C',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Mail size={20} />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                      }}
                    >
                      <InterfaceText>
                        Email Gateway Health (Google SMTP)
                      </InterfaceText>
                    </h3>
                    <span
                      style={{ fontSize: '12px', color: 'var(--text-muted)' }}
                    >
                      <InterfaceText>Host:</InterfaceText>{' '}
                      {diagnostics?.email?.host || 'smtp.gmail.com'}:
                      {diagnostics?.email?.port || 465}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 800,
                    backgroundColor: emailHealthy ? '#DBEAFE' : '#F4EAD5',
                    color: emailHealthy ? '#1E40AF' : '#6F531C',
                  }}
                >
                  {emailHealthy ? 'SMTP LIVE & VERIFIED' : 'SIMULATION MODE'}
                </span>
              </div>

              {/* Email Metrics Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      display: 'block',
                    }}
                  >
                    <InterfaceText>Delivery Mode</InterfaceText>
                  </span>
                  <strong
                    style={{ fontSize: '14px', color: 'var(--text-main)' }}
                  >
                    {emailHealthy
                      ? 'Live Google SMTP'
                      : 'Local Simulation Fallback'}
                  </strong>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      display: 'block',
                    }}
                  >
                    <InterfaceText>Encryption / Port</InterfaceText>
                  </span>
                  <strong
                    style={{ fontSize: '14px', color: 'var(--text-main)' }}
                  >
                    <InterfaceText>Port</InterfaceText>{' '}
                    {diagnostics?.email?.port || 465} (
                    {diagnostics?.email?.secure !== false
                      ? 'SSL/TLS'
                      : 'STARTTLS'}
                    )
                  </strong>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      display: 'block',
                    }}
                  >
                    <InterfaceText>Sender Identity</InterfaceText>
                  </span>
                  <strong
                    style={{ fontSize: '12px', color: 'var(--text-main)' }}
                  >
                    {diagnostics?.email?.from ||
                      'Tinzel <notifications@tinzel.com>'}
                  </strong>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      display: 'block',
                    }}
                  >
                    <InterfaceText>SMTP Handshake Latency</InterfaceText>
                  </span>
                  <strong
                    style={{ fontSize: '13px', color: 'var(--text-main)' }}
                  >
                    {diagnostics?.email?.latencyMs
                      ? `${diagnostics.email.latencyMs} ms`
                      : '0 ms (Simulated)'}
                  </strong>
                </div>
              </div>

              {/* Send Test Email Form */}
              <form
                onSubmit={handleRunEmailHealthTest}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  paddingTop: '4px',
                }}
              >
                <div
                  className="admin-form-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div>
                    <label
                      htmlFor={`control-70308`}
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#44403C',
                        marginBottom: '4px',
                      }}
                    >
                      <InterfaceText>Test Recipient Email</InterfaceText>
                    </label>
                    <input
                      id={`control-70308`}
                      type="email"
                      required
                      value={emailTestForm.to}
                      onChange={(e) =>
                        setEmailTestForm({
                          ...emailTestForm,
                          to: e.target.value,
                        })
                      }
                      placeholder={tx('you@example.com')}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #D6D3D1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`control-71382`}
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#44403C',
                        marginBottom: '4px',
                      }}
                    >
                      <InterfaceText>Subject Line</InterfaceText>
                    </label>
                    <input
                      id={`control-71382`}
                      type="text"
                      required
                      value={emailTestForm.subject}
                      onChange={(e) =>
                        setEmailTestForm({
                          ...emailTestForm,
                          subject: e.target.value,
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #D6D3D1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`control-72468`}
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#44403C',
                      marginBottom: '4px',
                    }}
                  >
                    <InterfaceText>Test Email Message Body</InterfaceText>
                  </label>
                  <textarea
                    id={`control-72468`}
                    rows="2"
                    required
                    value={emailTestForm.message}
                    onChange={(e) =>
                      setEmailTestForm({
                        ...emailTestForm,
                        message: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #D6D3D1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <ActionButton loading={emailTesting}
                  type="submit"
                  disabled={emailTesting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1E40AF',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Mail size={14} />
                  {emailTesting
                    ? 'Dispatching Test Email…'
                    : 'Send Test Email Now'}
                </ActionButton>
              </form>

              {emailTestResult && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: emailTestResult.success
                      ? '#EFF6FF'
                      : '#FEF2F2',
                    border: emailTestResult.success
                      ? '1px solid #93C5FD'
                      : '1px solid #FECACA',
                    fontSize: '12px',
                    color: emailTestResult.success ? '#1E40AF' : '#991B1B',
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: '4px' }}>
                    {emailTestResult.success
                      ? 'Email Health Test Completed'
                      : 'Email Health Test Failed'}
                  </div>
                  <div>
                    <InterfaceText>Recipient:</InterfaceText>
                    <strong>{emailTestResult.to}</strong>
                    <InterfaceText>| Mode:</InterfaceText>{' '}
                    <strong>{emailTestResult.mode}</strong>
                    <InterfaceText>| Latency:</InterfaceText>{' '}
                    <strong>
                      {emailTestResult.latencyMs}{' '}
                      <InterfaceText>ms</InterfaceText>
                    </strong>
                  </div>
                  {emailTestResult.messageId && (
                    <div>
                      <InterfaceText>Message ID:</InterfaceText>
                      <code>{emailTestResult.messageId}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1: NOTIFICATION HISTORY & INBOX                                   */}
      {/* ===================================================================== */}
      {(activeSection === 'history' || !canConfigure) && (
        <>
          {/* Filter & Search Bar */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap',
              }}
            >
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
                    backgroundColor:
                      channelFilter === tab.id ? 'var(--text-main)' : '#FFFFFF',
                    color: channelFilter === tab.id ? '#FFFFFF' : '#44403C',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {tx(tab.label)}
                </button>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  backgroundColor: '#F5F5F4',
                  padding: '3px',
                  borderRadius: '7px',
                  border: '1px solid var(--border-color)',
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
                      backgroundColor:
                        readFilter === rf.id ? '#FFFFFF' : 'transparent',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      fontWeight: readFilter === rf.id ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {tx(rf.label)}
                  </button>
                ))}
              </div>

              <select
                aria-label={tx('Filter by delivery status')}
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
                  color: 'var(--text-main)',
                }}
              >
                <option value="all">
                  <InterfaceText>All statuses</InterfaceText>
                </option>
                <option value="delivered">
                  <InterfaceText>Delivered</InterfaceText>
                </option>
                <option value="sent">
                  <InterfaceText>Provider accepted</InterfaceText>
                </option>
                <option value="queued">
                  <InterfaceText>Queued</InterfaceText>
                </option>
                <option value="unconfirmed">
                  <InterfaceText>Unconfirmed</InterfaceText>
                </option>
                <option value="skipped">
                  <InterfaceText>Skipped</InterfaceText>
                </option>
                <option value="simulated">
                  <InterfaceText>Simulated</InterfaceText>
                </option>
                <option value="failed">
                  <InterfaceText>Failed</InterfaceText>
                </option>
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
                  backgroundColor: 'var(--bg-primary)',
                  minWidth: '220px',
                }}
              >
                <Search size={14} color="var(--text-muted)" />
                <input
                  aria-label={tx('Search notifications')}
                  placeholder={tx('Search recipient, order, message...')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '12px',
                    width: '100%',
                    color: 'var(--text-main)',
                  }}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSearch('');
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Notification List */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {loading && displayedItems.length === 0 ? (
              <PageSkeleton variant="table" compact />
            ) : displayedItems.length === 0 ? (
              <div
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'var(--text-muted)',
                }}
              >
                <Bell
                  size={28}
                  color="var(--text-muted)"
                  style={{ marginBottom: '8px' }}
                />
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                  }}
                >
                  <InterfaceText>No notifications found</InterfaceText>
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  <InterfaceText>
                    Notifications sent via Email, Phone (NextSMS), and In-System
                    will appear here automatically.
                  </InterfaceText>
                </div>
              </div>
            ) : (
              displayedItems.map(({ primary, siblings, channels }) => {
                const id = primary._id || primary.id;
                const isUnread = !primary.isRead;
                const orderObj =
                  primary.orderId && typeof primary.orderId === 'object'
                    ? primary.orderId
                    : null;
                const orderTracking =
                  orderObj?.trackingId ||
                  orderObj?.submissionId ||
                  primary.metadata?.trackingId ||
                  primary.metadata?.submissionId ||
                  null;
                const orderTargetId =
                  orderObj?._id ||
                  (typeof primary.orderId === 'string'
                    ? primary.orderId
                    : null);
                const hasFailedSibling = siblings.some(
                  (s) =>
                    s.status === 'failed' ||
                    s.status === 'undelivered' ||
                    s.status === 'unconfirmed',
                );

                return (
                  <article
                    key={id}
                    style={{
                      backgroundColor: isUnread ? '#FFFDF9' : '#FFFFFF',
                      border: hasFailedSibling
                        ? '1px solid #FCA5A5'
                        : '1px solid var(--border-color)',
                      borderLeft: isUnread
                        ? '4px solid var(--accent-primary)'
                        : '1px solid var(--border-color)',
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
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {isUnread && (
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--accent-primary)',
                              color: '#FFFFFF',
                              fontSize: '10px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            <InterfaceText>New</InterfaceText>
                          </span>
                        )}

                        <strong
                          style={{
                            fontSize: '15px',
                            color: 'var(--text-main)',
                          }}
                        >
                          {primary.title ||
                            primary.subject ||
                            formatTemplate(primary.template)}
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

                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
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
                        backgroundColor: 'var(--bg-primary)',
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
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
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
                            backgroundColor: channels.in_system
                              ? '#F4EAD5'
                              : '#F5F5F4',
                            color: channels.in_system
                              ? '#6F531C'
                              : 'var(--text-muted)',
                          }}
                        >
                          <Bell size={12} />
                          <InterfaceText>In-System:</InterfaceText>{' '}
                          {channels.in_system
                            ? channels.in_system.status === 'delivered'
                              ? 'Recorded'
                              : channels.in_system.status
                            : '—'}
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
                              : 'var(--text-muted)',
                          }}
                        >
                          <Mail size={12} />
                          <InterfaceText>Email:</InterfaceText>{' '}
                          {channels.email
                            ? `${channels.email.status === 'sent' ? 'provider accepted' : channels.email.status || 'unconfirmed'}${
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
                              : 'var(--text-muted)',
                          }}
                        >
                          <MessageSquare size={12} />
                          <InterfaceText>Phone (</InterfaceText>
                          {(
                            channels.phone?.channel || 'sms'
                          ).toUpperCase()}):{' '}
                          {channels.phone
                            ? `${channels.phone.status === 'sent' ? 'provider accepted' : channels.phone.status || 'unconfirmed'}${
                                channels.phone.recipient || channels.phone.to
                                  ? ` (${channels.phone.recipient || channels.phone.to})`
                                  : ''
                              }`
                            : 'Not provided'}
                        </span>
                      </div>

                      {primary.workflowEventKey && (
                        <div style={{ fontSize: 12, color: '#57534E' }}>
                          {siblings.map((item) => (
                            <p
                              key={item._id || item.id}
                              style={{ overflowWrap: 'anywhere' }}
                            >
                              {item.channel.toUpperCase()}:{' '}
                              {tx(
                                item.status === 'sent'
                                  ? 'provider accepted'
                                  : item.status,
                              )}{' '}
                              · {item.attempts || 0}{' '}
                              <InterfaceText>/5 attempts</InterfaceText>{' '}
                              {item.errorMessage
                                ? ` — ${item.errorMessage}`
                                : ''}
                              {item.nextAttemptAt && item.retryable
                                ? ` · Next retry: ${new Date(item.nextAttemptAt).toLocaleString()}`
                                : ''}
                            </p>
                          ))}
                        </div>
                      )}
                      {/* Card Actions */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {isUnread && (
                          <ActionButton
                            type="button"
                            onClick={() => handleMarkRead(id)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #D6D3D1',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--text-main)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <InterfaceText>Mark as read</InterfaceText>
                          </ActionButton>
                        )}

                        {['manager', 'admin'].includes(staffUser?.role) &&
                          siblings
                            .filter(
                              (s) =>
                                s.channel !== 'in_system' &&
                                (s.status === 'failed' ||
                                  s.status === 'undelivered' ||
                                  s.status === 'unconfirmed'),
                            )
                            .map((failedItem) => {
                              const fId = failedItem._id || failedItem.id;
                              return (
                                <ActionButton loading={resendingId === fId}
                                  key={fId}
                                  type="button"
                                  disabled={resendingId === fId}
                                  onClick={() =>
                                    handleResend(
                                      fId,
                                      failedItem.channel,
                                      failedItem.status === 'unconfirmed',
                                    )
                                  }
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
                                  <InterfaceText>Retry</InterfaceText>{' '}
                                  {failedItem.channel.toUpperCase()}
                                </ActionButton>
                              );
                            })}

                        {orderTargetId && onOpenOrder && (
                          <ActionButton
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
                              border: '1px solid var(--text-main)',
                              backgroundColor: 'var(--text-main)',
                              color: '#FFFFFF',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <InterfaceText>Open Order</InterfaceText>
                            <ArrowRight size={13} />
                          </ActionButton>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}

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
            aria-label={tx('Send Tri-Channel Notification')}
            style={{
              width: 'min(520px, 100%)',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                  }}
                >
                  <InterfaceText>Send Tri-Channel Notification</InterfaceText>
                </h2>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <InterfaceText>
                    Dispatches simultaneously to In-System Notifications, Email,
                    and Phone (NextSMS / WhatsApp).
                  </InterfaceText>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSendTriChannel}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div>
                <label
                  htmlFor={`control-100153`}
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#44403C',
                    marginBottom: '4px',
                  }}
                >
                  <InterfaceText>Recipient Name</InterfaceText>
                </label>
                <input
                  id={`control-100153`}
                  type="text"
                  required
                  placeholder={tx('e.g. Amani Juma')}
                  value={composeForm.recipientName}
                  onChange={(e) =>
                    setComposeForm({
                      ...composeForm,
                      recipientName: e.target.value,
                    })
                  }
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
                className="admin-form-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <div>
                  <label
                    htmlFor={`control-101295`}
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#44403C',
                      marginBottom: '4px',
                    }}
                  >
                    <InterfaceText>Email Address</InterfaceText>
                  </label>
                  <input
                    id={`control-101295`}
                    type="email"
                    placeholder={tx('client@example.com')}
                    value={composeForm.email}
                    onChange={(e) =>
                      setComposeForm({ ...composeForm, email: e.target.value })
                    }
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
                  <label
                    htmlFor={`control-102285`}
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#44403C',
                      marginBottom: '4px',
                    }}
                  >
                    <InterfaceText>
                      Phone Number (NextSMS / WhatsApp)
                    </InterfaceText>
                  </label>
                  <input
                    id={`control-102285`}
                    type="text"
                    placeholder="+255762022730"
                    value={composeForm.phone}
                    onChange={(e) =>
                      setComposeForm({ ...composeForm, phone: e.target.value })
                    }
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
                <label
                  htmlFor={`control-103302`}
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#44403C',
                    marginBottom: '4px',
                  }}
                >
                  <InterfaceText>Notification Title / Subject</InterfaceText>
                </label>
                <input
                  id={`control-103302`}
                  type="text"
                  required
                  placeholder={tx('e.g. Taarifa ya Maendeleo ya Jarida Lako')}
                  value={composeForm.title}
                  onChange={(e) =>
                    setComposeForm({ ...composeForm, title: e.target.value })
                  }
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
                <label
                  htmlFor={`control-104305`}
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#44403C',
                    marginBottom: '4px',
                  }}
                >
                  <InterfaceText>Message Content</InterfaceText>
                </label>
                <textarea
                  id={`control-104305`}
                  rows="4"
                  required
                  placeholder={tx(
                    'Write the notification message to send across Email, Phone, and In-System...',
                  )}
                  value={composeForm.message}
                  onChange={(e) =>
                    setComposeForm({ ...composeForm, message: e.target.value })
                  }
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
                  <InterfaceText>Cancel</InterfaceText>
                </button>
                <ActionButton loading={sending}
                  type="submit"
                  disabled={sending}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--text-main)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {sending ? 'Dispatching…' : 'Send to Email, Phone & System'}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
