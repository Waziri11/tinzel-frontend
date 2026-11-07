import { orderSenderName } from '../../utils/orderDisplay';
import SoftFlutter, { ActionButton } from '../common/SoftFlutter';
import {navigate} from '../../navigation/location';
import MagazineDraftCards, {magazineReviewPath} from './MagazineDraftCards';
import {downloadMagazine} from '../common/SecurityCenter';
import PageSkeleton from '../common/PageSkeleton';
import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Drawer, Modal, Tabs } from 'antd';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  FileCheck2,
  LayoutDashboard,
  ListChecks,
  Palette,
  PauseCircle,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Truck,
  UserRoundCheck,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { api } from '../../services/api';
import OrderAnswersView from '../common/OrderAnswersView';
import OrderPhotosFolderView from '../common/OrderPhotosFolderView';
import './managerDashboard.css';



const ALL_STAGES = [
  { id: 'exceptions', title: 'Held & Exceptions', statuses: ['on_hold'] },
  { id: 'payment', title: 'Payment', statuses: ['awaiting_payment', 'payment_verified'] },
  { id: 'design', title: 'Design', statuses: ['queued_for_assignment', 'assigned', 'in_design'] },
  { id: 'draft', title: 'Manager Review', statuses: ['draft_manager_review'] },
  { id: 'client', title: 'Client Review', statuses: ['client_review', 'revision_requested'] },
  {
    id: 'print',
    title: 'Print Preparation',
    statuses: ['client_approved', 'print_document_prep', 'print_manager_review'],
  },
  { id: 'printing', title: 'Printing', statuses: ['printing_sent', 'printing_in_progress', 'printing_completed'] },
  { id: 'delivery', title: 'Delivery & Closure', statuses: ['dispatched', 'delivered', 'closed'] },
];

const PHASE_CONFIGS = {
  pre_design: {
    title: 'Pre-Design Phase',
    description: 'Payment verification and initial designer capacity assignment.',
    stages: [
      { id: 'awaiting_payment', title: 'Awaiting Payment', statuses: ['awaiting_payment'] },
      { id: 'payment_verified', title: 'Payment Verified', statuses: ['payment_verified'] },
      { id: 'queued_for_assignment', title: 'Queued for Assignment', statuses: ['queued_for_assignment'] },
      { id: 'exceptions', title: 'On Hold (Pre-Design)', statuses: ['on_hold'] },
    ],
    statuses: ['awaiting_payment', 'payment_verified', 'queued_for_assignment', 'on_hold'],
    summaryCards: (summary, counts) => [
      {
        id: 'awaiting_payment',
        label: 'Payments to verify',
        value: counts.awaiting_payment ?? summary.payment ?? 0,
        icon: CircleDollarSign,
      },
      {
        id: 'payment_verified',
        label: 'Payment verified',
        value: counts.payment_verified ?? summary.paymentVerified ?? 0,
        icon: CheckCircle2,
      },
      {
        id: 'queued_for_assignment',
        label: 'Queued for designer',
        value: counts.queued_for_assignment ?? summary.queuedAssignment ?? 0,
        icon: UserRoundCheck,
      },
      { id: 'on_hold', label: 'On hold in Pre-Design', value: counts.on_hold ?? 0, icon: AlertTriangle },
    ],
  },
  design_phase: {
    title: 'Design Phase',
    description: 'Active editorial layout, manager whole-magazine draft inspection, and client proof review.',
    stages: [
      { id: 'assigned', title: 'Assigned to Designer', statuses: ['assigned'] },
      { id: 'in_design', title: 'In Design', statuses: ['in_design'] },
      { id: 'draft_manager_review', title: 'Manager Review', statuses: ['draft_manager_review'] },
      { id: 'client_review', title: 'Client Review', statuses: ['client_review'] },
      { id: 'revision_requested', title: 'Returned for Changes', statuses: ['revision_requested'] },
      { id: 'exceptions', title: 'On Hold (Design)', statuses: ['on_hold'] },
    ],
    statuses: ['assigned', 'in_design', 'draft_manager_review', 'client_review', 'revision_requested', 'on_hold'],
    summaryCards: (summary, counts) => [
      {
        id: 'in_design',
        label: 'Assigned & In Design',
        value: (counts.assigned || 0) + (counts.in_design || 0),
        icon: Palette,
      },
      {
        id: 'draft_manager_review',
        label: 'Drafts to review',
        value: counts.draft_manager_review ?? summary.draftReview ?? 0,
        icon: FileCheck2,
      },
      {
        id: 'client_review',
        label: 'In client review',
        value: counts.client_review ?? summary.clientReview ?? 0,
        icon: Eye,
      },
      {
        id: 'revision_requested',
        label: 'Returned for changes',
        value: counts.revision_requested ?? summary.returns ?? 0,
        icon: RotateCcw,
      },
    ],
  },
  post_design: {
    title: 'Post-Design Phase',
    description: 'Print-ready document authorization, printing press tracking, courier dispatch, and delivery closure.',
    stages: [
      { id: 'print_prep', title: 'Print Preparation', statuses: ['client_approved', 'print_document_prep'] },
      { id: 'print_approval', title: 'Print Approval', statuses: ['print_manager_review'] },
      { id: 'printing', title: 'Printing', statuses: ['printing_sent', 'printing_in_progress', 'printing_completed'] },
      { id: 'delivery', title: 'Dispatched & Delivered', statuses: ['dispatched', 'delivered', 'closed'] },
      { id: 'exceptions', title: 'On Hold (Post-Design)', statuses: ['on_hold'] },
    ],
    statuses: [
      'client_approved',
      'print_document_prep',
      'print_manager_review',
      'printing_sent',
      'printing_in_progress',
      'printing_completed',
      'dispatched',
      'delivered',
      'closed',
      'on_hold',
    ],
    summaryCards: (summary, counts) => [
      {
        id: 'client_approved',
        label: 'Print preparation',
        value: (counts.client_approved || 0) + (counts.print_document_prep || 0),
        icon: FileCheck2,
      },
      {
        id: 'print_manager_review',
        label: 'Print approvals',
        value: counts.print_manager_review ?? summary.printApproval ?? 0,
        icon: Printer,
      },
      {
        id: 'printing_completed',
        label: 'Ready to dispatch',
        value: counts.printing_completed ?? summary.dispatchReady ?? 0,
        icon: Truck,
      },
      {
        id: 'dispatched',
        label: 'Dispatched & delivered',
        value: (counts.dispatched || 0) + (counts.delivered || 0) + (counts.closed || 0),
        icon: CheckCircle2,
      },
    ],
  },
};

const ATTENTION = new Set([
  'awaiting_payment',
  'queued_for_assignment',
  'draft_manager_review',
  'print_manager_review',
  'printing_sent',
  'printing_in_progress',
  'printing_completed',
  'dispatched',
  'on_hold',
]);

const STATUS_LABELS = {
  awaiting_payment: 'Payment awaiting verification',
  payment_verified: 'Payment verified',
  queued_for_assignment: 'Waiting for designer capacity',
  assigned: 'Assigned to designer',
  in_design: 'In design',
  draft_manager_review: 'Draft awaiting manager review',
  client_review: 'Client reviewing whole magazine',
  revision_requested: 'Returned for changes',
  client_approved: 'Client approved — print file pending',
  print_document_prep: 'Print file in preparation',
  print_manager_review: 'Print file awaiting authorization',
  printing_sent: 'Sent to printer — acknowledgement pending',
  printing_in_progress: 'Printing in progress',
  printing_completed: 'Printing complete — dispatch pending',
  dispatched: 'Dispatched — delivery confirmation pending',
  delivered: 'Delivered — closure pending',
  closed: 'Delivered & closed',
  on_hold: 'On hold',
};

const NEXT_TASK = {
  awaiting_payment: 'Verify payment',
  queued_for_assignment: 'Assign a designer',
  draft_manager_review: 'Review the complete draft',
  print_manager_review: 'Review and authorize printing',
  printing_sent: 'Record printer acknowledgement',
  printing_in_progress: 'Verify printing completion',
  printing_completed: 'Authorize courier dispatch',
  dispatched: 'Confirm client delivery',
  on_hold: 'Resolve hold',
};

const labelStatus = (status) => STATUS_LABELS[status] || String(status || '').replace(/_/g, ' ');
const daysWaiting = (date) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
const compactWait = (date) => {
  const age = daysWaiting(date);
  return age === 0 ? 'Today' : `${age}d`;
};
const displayDate = (date) =>
  date
    ? new Intl.DateTimeFormat('en-TZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
    : 'Not recorded';

const emptyForm = {
  paymentRef: '',
  amountPaid: '',
  printerStage: 'in_progress',
  printerNotes: '',
  carrier: '',
  trackingReference: '',
  deliveryAddress: '',
  dispatchNotes: '',
  recipientName: '',
  confirmationMethod: '',
  recipientFeedback: '',
  designerId: '',
  reassignReason: '',
  holdReason: '',
};

export default function ConveyorBeltBoard({ token, phase = null, onNavigateToReturns = null }) {
  const tx = useInterfaceText();

  const phaseConfig = phase ? PHASE_CONFIGS[phase] : null;
  const activeStages = useMemo(() => (phaseConfig ? phaseConfig.stages : ALL_STAGES), [phaseConfig]);
  const stageForStatus = useCallback(
    (status) => activeStages.find((stage) => stage.statuses.includes(status))?.id || activeStages[0]?.id || '',
    [activeStages],
  );

  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({});
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [view, setView] = useState('attention');
  const [detailTab, setDetailTab] = useState(new URLSearchParams(window.location.search).get('tab') || 'overview');
  const [uncertain, setUncertain] = useState(false);
  const [mobileStage, setMobileStage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [designers, setDesigners] = useState([]);
  const [settings, setSettings] = useState({ printer: { configured: false, phone: '' } });
  const [action, setAction] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Reset stage/filter when switching between Pre-Design, Design Phase, and Post-Design Phase
  useEffect(() => {
    setStatusFilter('all');
    setMobileStage('');
    setPage(1);
    setView('attention');
  }, [phase]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = {
        search,
        status: statusFilter,
        scope: 'all',
        page,
        limit: 100,
      };
      if (phase) queryParams.phase = phase;

      const data = await api.manager.getOrders(token, queryParams);
      setOrders(data.orders || []);
      setSummary(data.summary || {});
      setStatusCounts(data.statusCounts || {});
      setPageCount(data.pageCount || 1);
      setTotal(data.total || 0);
    } catch (requestError) {
      setError(requestError.message || 'Orders could not be loaded.');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [page, phase, search, statusFilter, token]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    Promise.allSettled([api.manager.getDesigners(token), api.manager.getSettings(token)]).then(
      ([designerResult, settingsResult]) => {
        if (designerResult.status === 'fulfilled') setDesigners(designerResult.value.designers || []);
        if (settingsResult.status === 'fulfilled') setSettings(settingsResult.value);
      },
    );
  }, [token]);

  const attentionOrders = useMemo(
    () =>
      orders
        .filter((order) => ATTENTION.has(order.status))
        .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt)),
    [orders],
  );

  const selectedMobileStage =
    mobileStage ||
    activeStages.find((stage) => orders.some((order) => stage.statuses.includes(order.status)))?.id ||
    activeStages[0]?.id;

  const openOrder = async (order, updateRoute = true) => {
    if (updateRoute) {
      const params = new URLSearchParams(window.location.search);
      params.set('orderId', order._id);
      window.history.pushState({}, '', `${window.location.pathname}?${params}`);
    }
    setSelectedOrder(order);
    setOrderDetail(null);
    setAuditLogs([]);
    setDetailLoading(true);
    try {
      const data = await api.manager.getOrder(token, order._id);
      setOrderDetail(data.order);
      setAuditLogs(data.auditLogs || []);
    } catch (requestError) {
      setNotice({ type: 'error', text: requestError.message || 'Order details could not be loaded.' });
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search),
        id = params.get('orderId');
      setDetailTab(params.get('tab') || 'overview');
      if (id) openOrder({ _id: id }, false);
      else {
        setSelectedOrder(null);
        setOrderDetail(null);
      }
    };
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [token, phase]);
  const changeDetailTab = (tab) => {
    setDetailTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    window.history.pushState({}, '', `${window.location.pathname}?${params}`);
  };

  const closeDetail = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete('orderId');
    params.delete('tab');
    window.history.pushState({}, '', `${window.location.pathname}${params.size ? '?' + params : ''}`);
    setSelectedOrder(null);
    setOrderDetail(null);
    setAuditLogs([]);
  };

  const beginAction = (name, order = orderDetail || selectedOrder) => {
    if (!order) return;
    if(name==='draft'){navigate(magazineReviewPath(order._id,order.currentDraftVersion));return;}
    setSelectedOrder(order);
    setForm({
      ...emptyForm,
      amountPaid: String(order.formId?.price || ''),
      printerStage: order.status === 'printing_sent' ? 'in_progress' : 'completed',
      deliveryAddress: order.dispatchDetails?.deliveryAddress || '',
      designerId: order.assignedDesigner?._id || '',
    });
    setUncertain(false);
    setNotice(null);
    setAction(name);
  };

  const finishAction = async (message) => {
    setAction(null);
    setNotice({ type: 'success', text: message });
    await loadOrders();
    if (selectedOrder?._id) await openOrder({ ...selectedOrder, _id: selectedOrder._id });
  };

  const runAction = async (event) => {
    event.preventDefault();
    if (!selectedOrder) return;
    setSubmitting(true);
    setNotice(null);
    try {
      let response;
      if (action === 'payment')
        response = await api.manager.verifyPayment(token, selectedOrder._id, {
          lipaNambaReference: form.paymentRef,
          amountPaid: form.amountPaid,
        });
      if (action === 'print') response = await api.manager.authorisePrint(token, selectedOrder._id, {});
      if (action === 'printer')
        response = await api.manager.printerUpdate(token, selectedOrder._id, {
          stage: form.printerStage,
          notes: form.printerNotes,
        });
      if (action === 'dispatch')
        response = await api.manager.authoriseDispatch(token, selectedOrder._id, {
          carrier: form.carrier,
          trackingReference: form.trackingReference,
          deliveryAddress: form.deliveryAddress,
          notes: form.dispatchNotes,
        });
      if (action === 'delivery')
        response = await api.manager.closeOrder(token, selectedOrder._id, {
          recipientName: form.recipientName,
          confirmationMethod: form.confirmationMethod,
          recipientFeedback: form.recipientFeedback,
        });
      if (action === 'reassign')
        response = await api.manager.reassign(token, selectedOrder._id, {
          designerId: form.designerId,
          reason: form.reassignReason,
        });
      if (action === 'hold')
        response = await api.manager.hold(token, selectedOrder._id, { action: 'hold', reason: form.holdReason });
      if (action === 'resume')
        response = await api.manager.hold(token, selectedOrder._id, {
          action: 'resume',
          reason: 'Manager resolved the recorded hold.',
        });
      await finishAction(response?.message || 'Order updated successfully.');
    } catch (requestError) {
      setUncertain(!requestError.status || requestError.status === 409 || requestError.status >= 500);
      setNotice({ type: 'error', text: requestError.message || 'The order could not be updated.' });
    } finally {
      setSubmitting(false);
    }
  };

  const summaryCards = useMemo(() => {
    if (phaseConfig) {
      return phaseConfig.summaryCards(summary, statusCounts);
    }
    return [
      { id: 'awaiting_payment', label: 'Payments to verify', value: summary.payment || 0, icon: CircleDollarSign },
      { id: 'draft_manager_review', label: 'Drafts to review', value: summary.draftReview || 0, icon: FileCheck2 },
      { id: 'print_manager_review', label: 'Print approvals', value: summary.printApproval || 0, icon: Printer },
      { id: 'printing_completed', label: 'Ready to dispatch', value: summary.dispatchReady || 0, icon: Truck },
      { id: 'on_hold', label: 'Blocked or queued', value: summary.blocked || 0, icon: AlertTriangle },
    ];
  }, [phaseConfig, summary, statusCounts]);

  const allowedFilterStatuses = useMemo(
    () => (phaseConfig ? phaseConfig.statuses : Object.keys(STATUS_LABELS)),
    [phaseConfig],
  );

  const nextActionButton = (order, compact = false) => {
    const map = {
      awaiting_payment: ['payment', 'Verify payment', CircleDollarSign],
      payment_verified: ['reassign', 'Assign designer', UserRoundCheck],
      queued_for_assignment: ['reassign', 'Assign designer', UserRoundCheck],
      assigned: ['reassign', 'Reassign', UserRoundCheck],
      in_design: ['reassign', 'Reassign', UserRoundCheck],
      draft_manager_review: ['draft', 'Review magazine', FileCheck2],
      print_manager_review: ['print', 'Authorize printing', Printer],
      printing_sent: ['printer', 'Record acknowledgement', Clock3],
      printing_in_progress: ['printer', 'Verify completion', CheckCircle2],
      printing_completed: ['dispatch', 'Authorize dispatch', Truck],
      dispatched: ['delivery', 'Confirm delivery', CheckCircle2],
      delivered: ['delivery', 'Close order', CheckCircle2],
      on_hold: ['resume', 'Resume order', RefreshCw],
    };
    const config = map[order.status];
    if (!config) return null;
    const [name, label, Icon] = config;
    return (
      <button
        type="button"
        className={`manager-primary-action${compact ? ' is-compact' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          beginAction(name, order);
        }}
      >
        <Icon size={15} />
        {tx(label)}
      </button>
    );
  };

  if (loading && !hasLoaded) return <PageSkeleton variant="dashboard" />;

  return (
    <section
      className="manager-dashboard"
      aria-label={phaseConfig ? phaseConfig.title : 'Manager production dashboard'}
    >
      {phaseConfig && (
        <div className="manager-phase-banner">
          <div>
            <span className="manager-phase-eyebrow">
              <InterfaceText>Kanban Phase</InterfaceText>
            </span>
            <h1 className="manager-phase-title">{tx(phaseConfig.title)}</h1>
            <p className="manager-phase-description">{tx(phaseConfig.description)}</p>
          </div>
          {phase === 'design_phase' && onNavigateToReturns && (
            <button type="button" className="manager-secondary-action" onClick={onNavigateToReturns}>
              <RotateCcw size={15} />
              <InterfaceText>View Returns Page</InterfaceText>
            </button>
          )}
        </div>
      )}

      {notice && (
        <div className={`manager-notice is-${notice.type}`} role="status">
          {notice.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notice.text}</span>
          <button type="button" aria-label={tx('Dismiss message')} onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="manager-notice is-error" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <ActionButton type="button" onClick={loadOrders}>
            <InterfaceText>Try again</InterfaceText>
          </ActionButton>
        </div>
      )}

      <div className={`manager-summary-grid${phaseConfig ? ' is-four-col' : ''}`}>
        {summaryCards.map(({ id, label, value, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`manager-summary-card${statusFilter === id ? ' is-selected' : ''}`}
            onClick={() => {
              const nextStatus = statusFilter === id ? 'all' : id;
              setStatusFilter(nextStatus);
              if (nextStatus !== 'all') setMobileStage(stageForStatus(nextStatus));
              setView('attention');
              setPage(1);
            }}
          >
            <span className="manager-summary-card__icon">
              <Icon size={20} />
            </span>
            <span>
              <strong>{value}</strong>
              <small>{tx(label)}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="manager-control-bar">
        <div className="manager-view-switch" aria-label={tx('Dashboard view')}>
          <button type="button" className={view === 'board' ? 'is-active' : ''} onClick={() => { setStatusFilter('all'); setPage(1); setView('board'); }}>
            <LayoutDashboard size={16} />
            <InterfaceText>Kanban Board</InterfaceText>
          </button>
          <button
            type="button"
            className={view === 'attention' ? 'is-active' : ''}
            onClick={() => setView('attention')}
          >
            <ListChecks size={16} />
            <InterfaceText>Priority Queue (</InterfaceText>
            {attentionOrders.length})
          </button>
        </div>
        <form
          className="manager-search"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <Search size={16} />
          <input
            aria-label={tx('Search orders')}
            placeholder={tx('Search by client name')}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              aria-label={tx('Clear search')}
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setPage(1);
              }}
            >
              ×
            </button>
          )}
        </form>
        <label className={`manager-filter${view === 'board' ? ' manager-stage-filter--board' : ''}`}>
          <span className="visually-hidden">
            <InterfaceText>Stage</InterfaceText>
          </span>
          <select
            aria-label={tx('Filter by stage')}
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              if (event.target.value !== 'all') setMobileStage(stageForStatus(event.target.value));
              setPage(1);
            }}
          >
            <option value="all">
              <InterfaceText>All stages in phase</InterfaceText>
            </option>
            {allowedFilterStatuses.map((status) => (
              <option key={status} value={status}>
                {labelStatus(status)}
              </option>
            ))}
          </select>
        </label>
        <ActionButton
          type="button"
          className="manager-icon-action"
          aria-label={tx('Refresh orders')}
          title={tx('Refresh')}
          onClick={loadOrders}
          disabled={loading}
        >
          {loading ? <SoftFlutter size={17} /> : <RefreshCw size={17} />}
        </ActionButton>
      </div>

      {loading && !hasLoaded ? (
        <PageSkeleton variant={view === 'board' ? 'board' : 'table'} compact />
      ) : null}

      {hasLoaded && view === 'attention' && (
        <div className="manager-attention-panel">
          <div className="manager-panel-heading">
            <h2>
              <InterfaceText>Priority Actions Required</InterfaceText>
            </h2>
            <span>{attentionOrders.length}</span>
          </div>
          {attentionOrders.length === 0 ? (
            <div className="manager-empty">
              <CheckCircle2 size={32} />
              <h3>
                <InterfaceText>All clear in this phase</InterfaceText>
              </h3>
            </div>
          ) : (
            <div className="manager-table-wrap">
              <table className="manager-attention-table">
                <thead>
                  <tr>

                    <th>
                      <InterfaceText>Client</InterfaceText>
                    </th>
                    <th>
                      <InterfaceText>Edition</InterfaceText>
                    </th>
                    <th>
                      <InterfaceText>Required action</InterfaceText>
                    </th>
                    <th>
                      <InterfaceText>Wait</InterfaceText>
                    </th>
                    <th>
                      <InterfaceText>Action</InterfaceText>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attentionOrders.map((order) => {
                    const age = daysWaiting(order.updatedAt);
                    return (
                      <tr
                        key={order._id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open ${orderSenderName(order)}`}
                        onClick={() => openOrder(order)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openOrder(order);
                          }
                        }}
                      >

                        <td data-label={tx('Client')}>{orderSenderName(order, tx('Unnamed customer'))}</td>
                        <td data-label={tx('Edition')}>{order.formTitle || order.formId?.title || 'Magazine'}</td>
                        <td data-label={tx('Required action')}>
                          <span className={`manager-status is-${order.status}`}>
                            {NEXT_TASK[order.status] || labelStatus(order.status)}
                          </span>
                        </td>
                        <td data-label={tx('Waiting')}>
                          <span className={age >= 3 ? 'manager-age is-overdue' : 'manager-age'}>
                            {age === 0 ? 'Today' : `${age} day${age === 1 ? '' : 's'}`}
                          </span>
                        </td>
                        <td data-label={tx('Action')}>{nextActionButton(order, true)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {hasLoaded && view === 'board' && (
        <>
          <label className="manager-mobile-stage-picker">
            <InterfaceText>Stage</InterfaceText>
            <select
              aria-label={tx('Board stage')}
              value={selectedMobileStage}
              onChange={(event) => setMobileStage(event.target.value)}
            >
              {activeStages.map((stage) => {
                const count = stage.statuses.reduce((sum, status) => sum + (statusCounts[status] || 0), 0);
                return (
                  <option key={stage.id} value={stage.id}>
                    {tx(stage.title)} ({count})
                  </option>
                );
              })}
            </select>
          </label>
          <div
            className="manager-board"
            style={{ gridTemplateColumns: `repeat(${activeStages.length}, minmax(265px, 1fr))` }}
            aria-label={tx('Production conveyor')}
          >
            {activeStages.map((stage) => {
              const stageOrders = orders.filter((order) => stage.statuses.includes(order.status));
              const count = stage.statuses.reduce((sum, status) => sum + (statusCounts[status] || 0), 0);
              return (
                <section
                  key={stage.id}
                  className={`manager-board-column${selectedMobileStage === stage.id ? ' is-mobile-active' : ''}`}
                >
                  <header>
                    <h2>{tx(stage.title)}</h2>
                    <span>{count}</span>
                  </header>
                  <div className="manager-board-column__body">
                    {stageOrders.length === 0 ? (
                      <p className="manager-board-empty">
                        {count > 0 ? 'No orders on this page' : 'No orders in this column'}
                      </p>
                    ) : (
                      stageOrders.map((order) => (
                        <div
                          key={order._id}
                          role="button"
                          tabIndex={0}
                          className="manager-stage-row"
                          aria-label={`Open ${orderSenderName(order)}, waiting ${compactWait(order.updatedAt)}`}
                          onClick={() => openOrder(order)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openOrder(order);
                            }
                          }}
                        >

                          <span className="manager-stage-row__age">{compactWait(order.updatedAt)}</span>
                          <strong>{order.clientName}</strong>
                          <span className="manager-stage-row__subtitle">
                            {order.formTitle || order.formId?.title || 'Tinzel Magazine'}
                          </span>
                          <div className="manager-stage-row__meta">
                            <span className={`manager-status is-${order.status}`}>{tx(labelStatus(order.status))}</span>
                            {order.assignedDesigner?.name && (
                              <span className="manager-stage-row__designer">{order.assignedDesigner.name}</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      <div className="manager-pagination">
        <span>
          {orders.length} <InterfaceText>of</InterfaceText> {total}
        </span>
        <div>
          <button
            type="button"
            aria-label={tx('Previous page')}
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            {page} / {pageCount}
          </span>
          <button
            type="button"
            aria-label={tx('Next page')}
            disabled={page >= pageCount}
            onClick={() => setPage((value) => value + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <Drawer
        title={selectedOrder ? orderSenderName(selectedOrder, tx('Unnamed customer')) : 'Order details'}
        width={720}
        open={Boolean(selectedOrder)}
        onClose={closeDetail}
        className="manager-order-drawer"
      >
        {detailLoading ? (
          <PageSkeleton variant="detail" />
        ) : orderDetail ? (
          <OrderDetail
            activeTab={detailTab}
            onTabChange={changeDetailTab}
            token={token}
            order={orderDetail}
            auditLogs={auditLogs}
            beginAction={beginAction}
            nextActionButton={nextActionButton}
          />
        ) : null}
      </Drawer>

      <ActionModal
        notice={notice}
        uncertain={uncertain}
        onCheckSaved={async () => {
          await openOrder(selectedOrder, false);
          setAction(null);
          setUncertain(false);
        }}
        action={action}
        order={selectedOrder}
        form={form}
        setForm={setForm}
        designers={designers}
        settings={settings}
        submitting={submitting}
        onCancel={() => setAction(null)}
        onSubmit={runAction}
      />
    </section>
  );
}

function OrderDetail({ activeTab, onTabChange, token, order, auditLogs, beginAction, nextActionButton }) {
  const tx = useInterfaceText();

  const currentDraft = order.draftVersions?.find((draft) => draft.versionNumber === order.currentDraftVersion);

  const items = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <div className="manager-detail-grid">
          <Detail label={tx('Status')} value={tx(labelStatus(order.status))} />
          <Detail label={tx('Client')} value={order.clientName} />
          <Detail label={tx('WhatsApp')} value={order.clientWhatsApp} />
          <Detail label={tx('Email')} value={order.clientEmail || 'Not provided'} />
          <Detail label={tx('Magazine')} value={order.formTitle || order.formId?.title} />
          <Detail label={tx('Designer')} value={order.assignedDesigner?.name || 'Not assigned'} />
          <Detail label={tx('Created')} value={displayDate(order.createdAt)} />
          <Detail label={tx('Last updated')} value={displayDate(order.updatedAt)} />
          {order.holdReason && <Detail wide label={tx('Hold reason')} value={order.holdReason} />}
        </div>
      ),
    },
    {
      key: 'answers',
      label: 'Client answers',
      children: (
        <OrderAnswersView
          submittedData={order.submittedData}
          submittedFields={order.submittedFields}
          formFields={order.formId?.fields}
        />
      ),
    },
    {
      key: 'photos',
      label: `Photos (${order.uploadedPhotos?.length || 0})`,
      children: <OrderPhotosFolderView uploadedPhotos={order.uploadedPhotos} submittedData={order.submittedData} />,
    },
    {
      key: 'drafts',
      label: `Drafts (${order.draftVersions?.length || 0})`,
      children: <MagazineDraftCards token={token} order={order}/>,
    },
    {
      key: 'production',
      label: 'Print & delivery',
      children: (
        <div className="manager-detail-grid">
          <Detail
            label={tx('Print file')}
            value={
              order.printDocument?.uploadedAt ? (
                <button onClick={()=>downloadMagazine(order._id,'print').catch(error=>window.alert(error.message))}>
                  <InterfaceText>Open print-ready document</InterfaceText>
                </button>
              ) : (
                'Not uploaded'
              )
            }
          />
          <Detail label={tx('Quantity')} value={order.printDocument?.specs?.quantity || 'Not set'} />
          <Detail label={tx('Paper')} value={order.printDocument?.specs?.paperType || 'Not set'} />
          <Detail label={tx('Finish')} value={order.printDocument?.specs?.coverFinish || 'Not set'} />
          <Detail label={tx('Printer')} value={order.printingDetails?.printerPhone || 'Not dispatched'} />
          <Detail label={tx('Courier')} value={order.dispatchDetails?.carrier || 'Not dispatched'} />
          <Detail
            wide
            label={tx('Delivery address')}
            value={order.dispatchDetails?.deliveryAddress || 'Not recorded'}
          />
        </div>
      ),
    },
    {
      key: 'activity',
      label: `Activity (${auditLogs.length})`,
      children: (
        <ol className="manager-timeline">
          {auditLogs.map((log) => (
            <li key={log._id}>
              <span>{displayDate(log.createdAt)}</span>
              <strong>{String(log.action).replace(/_/g, ' ')}</strong>
              <small>{log.actor?.name || log.actor?.type || 'System'}</small>
            </li>
          ))}
        </ol>
      ),
    },
  ];
  return (
    <div className="manager-order-detail">
      <div className="manager-order-detail__hero">
        <div>
          <span className={`manager-status is-${order.status}`}>{tx(labelStatus(order.status))}</span>
          <h2>{order.clientName}</h2>
          <p>{order.formTitle || order.formId?.title}</p>
        </div>
        <div className="manager-order-detail__actions">
          {(activeTab!=='drafts'||order.status!=='draft_manager_review')&&nextActionButton(order)}
          {order.status !== 'closed' && order.status !== 'on_hold' && (
            <button type="button" className="manager-secondary-action" onClick={() => beginAction('hold', order)}>
              <PauseCircle size={16} />
              <InterfaceText>Place on hold</InterfaceText>
            </button>
          )}
        </div>
      </div>
      {order.status === 'draft_manager_review' && currentDraft && (
        <div className="manager-review-callout">
          <FileCheck2 size={22} />
          <div>
            <strong>
              <InterfaceText>Review the entire magazine before deciding.</InterfaceText>
            </strong>
            <p>
              <InterfaceText>Version</InterfaceText> {currentDraft.versionNumber}{' '}
              <InterfaceText>
                is hidden from the client until you release it. Choose Review magazine to inspect it as a book.
              </InterfaceText>
            </p>
          </div>
        </div>
      )}
      <Tabs
        activeKey={items.some((item) => item.key === activeTab) ? activeTab : 'overview'}
        onChange={onTabChange}
        items={items.map((item) => ({ ...item, label: tx(item.label) }))}
      />{' '}
    </div>
  );
}

function Detail({ label, value, wide = false }) {
  const tx = useInterfaceText();

  return (
    <div className={wide ? 'manager-detail is-wide' : 'manager-detail'}>
      <dt>{tx(label)}</dt>
      <dd>{value || 'Not recorded'}</dd>
    </div>
  );
}

function ActionModal({
  notice,
  uncertain,
  onCheckSaved,
  action,
  order,
  form,
  setForm,
  designers,
  settings,
  submitting,
  onCancel,
  onSubmit,
}) {
  const tx = useInterfaceText();

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const titles = {
    payment: 'Verify payment',
    print: 'Authorize printing',
    printer: 'Record printer progress',
    dispatch: 'Authorize courier dispatch',
    delivery: 'Confirm delivery and close',
    reassign: 'Assign designer',
    hold: 'Place order on hold',
    resume: 'Resume this order',
  };
  const destructive = ['payment', 'print', 'dispatch', 'delivery'].includes(action);
  return (
    <Modal
      title={tx(titles[action] || 'Manager action')}
      open={Boolean(action)}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      className="manager-action-modal"
    >
      {notice?.type === 'error' && (
        <div className="manager-notice is-error" role="alert">
          {notice.text}
        </div>
      )}
      {uncertain ? (
        <div className="manager-review-callout">
          <p>
            <InterfaceText>
              The result is unconfirmed. Check the saved order before repeating this action.
            </InterfaceText>
          </p>
          <ActionButton className="manager-secondary-action" onClick={onCheckSaved}>
            <InterfaceText>Check saved order</InterfaceText>
          </ActionButton>
        </div>
      ) : null}
      {action && (
        <form onSubmit={onSubmit} className="manager-action-form">
          <p className="manager-action-context">
            <strong>{orderSenderName(order, tx('Unnamed customer'))}</strong>
          </p>
          {action === 'payment' && (
            <>
              <p>
                <InterfaceText>
                  Verification confirms payment and starts designer assignment. Compare the
                  amount with the expected price before confirming.
                </InterfaceText>
              </p>
              <label>
                <InterfaceText>Payment reference</InterfaceText>
                <input
                  required
                  value={form.paymentRef}
                  onChange={update('paymentRef')}
                  placeholder={tx('Payment reference')}
                />
              </label>
              <label>
                <InterfaceText>Amount paid (TZS)</InterfaceText>
                <input required type="number" min="1" value={form.amountPaid} onChange={update('amountPaid')} />
              </label>
            </>
          )}
          {action === 'print' && (
            <>
              <p>
                <InterfaceText>
                  This sends the client-approved, print-ready document and its specifications to the configured printer.
                </InterfaceText>
              </p>
              <div
                className={
                  settings.printer?.configured ? 'manager-config-status is-ready' : 'manager-config-status is-blocked'
                }
              >
                {settings.printer?.configured ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                <span>
                  {settings.printer?.configured
                    ? `Verified printer: ${settings.printer.phone}`
                    : 'No verified printer is configured. Ask an administrator to configure it first.'}
                </span>
              </div>
            </>
          )}
          {action === 'printer' && (
            <>
              <label>
                <InterfaceText>Progress state</InterfaceText>
                <select value={form.printerStage} onChange={update('printerStage')}>
                  <option value="in_progress">
                    <InterfaceText>Printer acknowledged — in progress</InterfaceText>
                  </option>
                  <option value="completed">
                    <InterfaceText>Printing complete — manager verified</InterfaceText>
                  </option>
                </select>
              </label>
              <label>
                <InterfaceText>Printer reply or verification note</InterfaceText>
                <textarea
                  required
                  rows="4"
                  value={form.printerNotes}
                  onChange={update('printerNotes')}
                  placeholder={tx('Record what the printer confirmed and how you verified it')}
                />
              </label>
            </>
          )}
          {action === 'dispatch' && (
            <>
              <p>
                <InterfaceText>
                  Use the genuine courier details; Tinzel will share this reference with the client.
                </InterfaceText>
              </p>
              <label>
                <InterfaceText>Carrier or delivery service</InterfaceText>
                <input required value={form.carrier} onChange={update('carrier')} />
              </label>
              <label>
                <InterfaceText>Waybill or tracking reference</InterfaceText>
                <input required value={form.trackingReference} onChange={update('trackingReference')} />
              </label>
              <label>
                <InterfaceText>Confirmed delivery address</InterfaceText>
                <textarea required rows="3" value={form.deliveryAddress} onChange={update('deliveryAddress')} />
              </label>
              <label>
                <InterfaceText>Dispatch notes</InterfaceText>
                <textarea rows="3" value={form.dispatchNotes} onChange={update('dispatchNotes')} />
              </label>
            </>
          )}
          {action === 'delivery' && (
            <>
              <p>
                <InterfaceText>
                  Close the order only after receiving delivery evidence from the client or courier.
                </InterfaceText>
              </p>
              <label>
                <InterfaceText>Recipient name</InterfaceText>
                <input required value={form.recipientName} onChange={update('recipientName')} />
              </label>
              <label>
                <InterfaceText>Confirmation method</InterfaceText>
                <select required value={form.confirmationMethod} onChange={update('confirmationMethod')}>
                  <option value="">
                    <InterfaceText>Choose method</InterfaceText>
                  </option>
                  <option value="client_whatsapp">
                    <InterfaceText>Client WhatsApp confirmation</InterfaceText>
                  </option>
                  <option value="courier_proof">
                    <InterfaceText>Courier proof of delivery</InterfaceText>
                  </option>
                  <option value="phone_call">
                    <InterfaceText>Phone call</InterfaceText>
                  </option>
                  <option value="in_person">
                    <InterfaceText>Confirmed in person</InterfaceText>
                  </option>
                </select>
              </label>
              <label>
                <InterfaceText>Delivery confirmation details</InterfaceText>
                <textarea required rows="4" value={form.recipientFeedback} onChange={update('recipientFeedback')} />
              </label>
            </>
          )}
          {action === 'reassign' && (
            <>
              <label>
                <InterfaceText>Active designer</InterfaceText>
                <select required value={form.designerId} onChange={update('designerId')}>
                  <option value="">
                    <InterfaceText>Choose designer</InterfaceText>
                  </option>
                  {designers.map((designer) => (
                    <option key={designer._id} value={designer._id}>
                      {designer.name} — {designer.currentActiveWorkload}/{designer.maxActiveWorkload}{' '}
                      <InterfaceText>active</InterfaceText>
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <InterfaceText>Reason for assignment</InterfaceText>
                <textarea required rows="3" value={form.reassignReason} onChange={update('reassignReason')} />
              </label>
            </>
          )}
          {action === 'hold' && (
            <label>
              <InterfaceText>Reason for hold</InterfaceText>
              <textarea
                required
                rows="4"
                value={form.holdReason}
                onChange={update('holdReason')}
                placeholder={tx('Explain the blocker and what is needed to resume')}
              />
            </label>
          )}
          {action === 'resume' && (
            <p>
              <InterfaceText>Resume this order at the stage it occupied before the hold?</InterfaceText>
            </p>
          )}
          {destructive && (
            <div className="manager-impact-note">
              <AlertTriangle size={18} />
              <span>
                <InterfaceText>
                  This action changes the official workflow record and may notify an external party.
                </InterfaceText>
              </span>
            </div>
          )}
          <div className="manager-action-footer">
            <button type="button" className="manager-secondary-action" onClick={onCancel}>
              <InterfaceText>Cancel</InterfaceText>
            </button>
            <ActionButton loading={submitting}
              type="submit"
              className="manager-primary-action"
              disabled={submitting || uncertain || (action === 'print' && !settings.printer?.configured)}
            >
              {tx(
                submitting
                  ? 'Saving…'
                    : titles[action],
              )}
            </ActionButton>
          </div>
        </form>
      )}
    </Modal>
  );
}
