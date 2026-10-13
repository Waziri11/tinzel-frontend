import React, { useState, useEffect } from 'react';
import {
  Server,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Send,
  Truck,
  RotateCcw,
  Check,
  UserCheck,
  FileCheck2,
  X,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';

const STAGE_COLUMNS = [
  { id: 'payment', title: 'Payment Verification', statuses: ['awaiting_payment'] },
  { id: 'design', title: 'Assigned / In Design', statuses: ['queued_for_assignment', 'assigned', 'in_design'] },
  { id: 'draft_review', title: 'Manager Draft Gate', statuses: ['draft_manager_review'] },
  { id: 'client_review', title: 'Client Whole Review', statuses: ['client_review', 'revision_requested'] },
  { id: 'print_prep', title: 'Print Prep & Check', statuses: ['client_approved', 'print_document_prep', 'print_manager_review'] },
  { id: 'printing', title: 'Printing & WhatsApp', statuses: ['printing_sent', 'printing_in_progress', 'printing_completed'] },
  { id: 'dispatched', title: 'Dispatch & Closure', statuses: ['dispatched', 'delivered', 'closed'] },
];

export default function ConveyorBeltBoard({ token, staffUser }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'verify_payment' | 'review_draft' | 'authorise_print' | 'printer_status' | 'dispatch' | 'reassign'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form states in modals
  const [paymentRef, setPaymentRef] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [draftAction, setDraftAction] = useState('release_to_client');
  const [draftFeedback, setDraftFeedback] = useState('');
  const [printerPhone, setPrinterPhone] = useState('+255712345678');
  const [printerStage, setPrinterStage] = useState('in_progress');
  const [printerNotes, setPrinterNotes] = useState('');
  const [carrier, setCarrier] = useState('FastCourier');
  const [trackingRef, setTrackingRef] = useState('');
  const [targetDesignerId, setTargetDesignerId] = useState('');
  const [allDesigners, setAllDesigners] = useState([]);

  useEffect(() => {
    loadOrders();
    loadDesigners();
  }, [token]);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.manager.getOrders(token, { search: searchTerm });
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const loadDesigners = async () => {
    try {
      const data = await api.admin.getStaff(token);
      setAllDesigners((data.staff || []).filter((s) => s.role === 'designer'));
    } catch (e) {
      // Ignore if staff api restricted
    }
  };

  const handleVerifyPayment = async () => {
    setModalLoading(true);
    try {
      await api.manager.verifyPayment(token, selectedOrder._id, {
        lipaNambaReference: paymentRef,
        amountPaid: Number(amountPaid) || selectedOrder.formId?.price,
      });
      setActiveModal(null);
      await loadOrders();
    } catch (err) {
      alert(err.message || 'Failed to verify payment');
    } finally {
      setModalLoading(false);
    }
  };

  const handleReviewDraft = async () => {
    setModalLoading(true);
    try {
      await api.manager.reviewDraft(token, selectedOrder._id, {
        action: draftAction,
        feedback: draftFeedback,
      });
      setActiveModal(null);
      await loadOrders();
    } catch (err) {
      alert(err.message || 'Failed to review draft');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAuthorisePrint = async () => {
    setModalLoading(true);
    try {
      await api.manager.authorisePrint(token, selectedOrder._id, {
        printerPhone,
      });
      setActiveModal(null);
      await loadOrders();
    } catch (err) {
      alert(err.message || 'Failed to authorise print');
    } finally {
      setModalLoading(false);
    }
  };

  const handlePrinterStatus = async () => {
    setModalLoading(true);
    try {
      await api.manager.printerUpdate(token, selectedOrder._id, {
        stage: printerStage,
        notes: printerNotes,
      });
      setActiveModal(null);
      await loadOrders();
    } catch (err) {
      alert(err.message || 'Failed to update printer status');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAuthoriseDispatch = async () => {
    setModalLoading(true);
    try {
      await api.manager.authoriseDispatch(token, selectedOrder._id, {
        carrier,
        trackingReference: trackingRef,
      });
      setActiveModal(null);
      await loadOrders();
    } catch (err) {
      alert(err.message || 'Failed to authorise dispatch');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseOrder = async (orderId) => {
    if (!confirm('Close this order and confirm delivery to client?')) return;
    try {
      await api.manager.closeOrder(token, orderId, {
        recipientFeedback: 'Client confirmed receipt.',
      });
      await loadOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReassign = async () => {
    if (!targetDesignerId) return;
    setModalLoading(true);
    try {
      await api.manager.reassign(token, selectedOrder._id, {
        designerId: targetDesignerId,
        reason: 'Manager reassignment from board',
      });
      setActiveModal(null);
      await loadOrders();
    } catch (err) {
      alert(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div>
      {/* Search and Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by Client, Tracking ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
              style={{
                padding: '8px 12px 8px 34px',
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '13px',
                outline: 'none',
                width: '280px',
              }}
            />
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          </div>

          <button
            onClick={loadOrders}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Active Orders on Belt: <strong>{orders.length}</strong>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#450a0a',
            border: '1px solid var(--accent-danger)',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '16px',
            color: '#fca5a5',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {/* Kanban Multi-Column Board */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 300px)',
          gap: '14px',
          overflowX: 'auto',
          paddingBottom: '20px',
          minHeight: '600px',
        }}
      >
        {STAGE_COLUMNS.map((col) => {
          const columnOrders = orders.filter((o) => col.statuses.includes(o.status));

          return (
            <div
              key={col.id}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                height: 'fit-content',
                minHeight: '400px',
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: '14px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: '700' }}>{col.title}</span>
                <span
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '10px',
                  }}
                >
                  {columnOrders.length}
                </span>
              </div>

              {/* Order Cards */}
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {columnOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No orders at this stage
                  </div>
                ) : (
                  columnOrders.map((ord) => (
                    <div
                      key={ord._id}
                      style={{
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {/* Tracking / Submission ID Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: ord.trackingId ? '#60a5fa' : '#fcd34d' }}>
                          {ord.trackingId || ord.submissionId}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{ord.clientName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {ord.formTitle || ord.formId?.title}
                      </div>

                      {ord.assignedDesigner && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Designer: <strong style={{ color: 'var(--text-main)' }}>{ord.assignedDesigner.name}</strong>
                        </div>
                      )}

                      {/* Stage-Specific Quick Action Buttons */}
                      <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                        {ord.status === 'awaiting_payment' && (
                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              setPaymentRef('');
                              setAmountPaid(String(ord.formId?.price || 50000));
                              setActiveModal('verify_payment');
                            }}
                            style={{
                              width: '100%',
                              backgroundColor: 'var(--accent-primary)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <CheckCircle2 size={13} />
                            Verify Payment
                          </button>
                        )}

                        {ord.status === 'draft_manager_review' && (
                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              setDraftAction('release_to_client');
                              setDraftFeedback('');
                              setActiveModal('review_draft');
                            }}
                            style={{
                              width: '100%',
                              backgroundColor: 'var(--accent-primary)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <FileCheck2 size={13} />
                            Review Draft V{ord.currentDraftVersion}
                          </button>
                        )}

                        {(ord.status === 'client_approved' || ord.status === 'print_manager_review') && (
                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              setActiveModal('authorise_print');
                            }}
                            style={{
                              width: '100%',
                              backgroundColor: 'var(--accent-success)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <Printer size={13} />
                            Dispatch to Printer
                          </button>
                        )}

                        {['printing_sent', 'printing_in_progress'].includes(ord.status) && (
                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              setPrinterStage(ord.status === 'printing_sent' ? 'in_progress' : 'completed');
                              setActiveModal('printer_status');
                            }}
                            style={{
                              width: '100%',
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-main)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <Clock size={13} />
                            Update Print Status
                          </button>
                        )}

                        {ord.status === 'printing_completed' && (
                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              setCarrier('FastCourier');
                              setTrackingRef(`PKG-${Date.now().toString().slice(-6)}`);
                              setActiveModal('dispatch');
                            }}
                            style={{
                              width: '100%',
                              backgroundColor: 'var(--accent-primary)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <Truck size={13} />
                            Authorise Dispatch
                          </button>
                        )}

                        {ord.status === 'dispatched' && (
                          <button
                            onClick={() => handleCloseOrder(ord._id)}
                            style={{
                              width: '100%',
                              backgroundColor: 'var(--accent-success)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}
                          >
                            Confirm Delivery & Close
                          </button>
                        )}

                        {/* Reassign option if stuck in design */}
                        {['queued_for_assignment', 'assigned', 'in_design'].includes(ord.status) && (
                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              setTargetDesignerId(ord.assignedDesigner?._id || '');
                              setActiveModal('reassign');
                            }}
                            style={{
                              marginTop: '4px',
                              width: '100%',
                              backgroundColor: 'transparent',
                              color: 'var(--text-muted)',
                              border: '1px dashed var(--border-color)',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '11px',
                            }}
                          >
                            Reassign Designer
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- MODALS --- */}

      {/* 1. Verify Payment Modal */}
      {activeModal === 'verify_payment' && selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '24px',
              width: '460px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Verify Lipa Namba Payment</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Confirming payment will issue the official <strong>TNZ-YYYY-XXXX</strong> Tracking ID and
              automatically assign the order to the designer with lowest active workload.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Lipa Namba Reference Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. QK8912KL99"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Amount Paid (TZS)
                </label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setActiveModal(null)}
                style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', padding: '8px 14px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPayment}
                disabled={modalLoading}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  padding: '8px 18px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                {modalLoading ? 'Verifying...' : 'Confirm & Auto-Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Review Draft Modal */}
      {activeModal === 'review_draft' && selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '24px',
              width: '520px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
                Review Draft V{selectedOrder.currentDraftVersion} Gate
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Draft is currently hidden from the client. Releasing it will allow the client to review the
              whole magazine in their private portal.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setDraftAction('release_to_client')}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: draftAction === 'release_to_client' ? '#064e3b' : 'var(--bg-secondary)',
                  color: draftAction === 'release_to_client' ? '#6ee7b7' : 'var(--text-main)',
                  border: `1px solid ${draftAction === 'release_to_client' ? 'var(--accent-success)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                Approve & Release to Client
              </button>
              <button
                type="button"
                onClick={() => setDraftAction('return_to_designer')}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: draftAction === 'return_to_designer' ? '#451a03' : 'var(--bg-secondary)',
                  color: draftAction === 'return_to_designer' ? '#fcd34d' : 'var(--text-main)',
                  border: `1px solid ${draftAction === 'return_to_designer' ? 'var(--accent-warning)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                Return to Designer
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                Feedback / Notes:
              </label>
              <textarea
                rows={3}
                placeholder="Optional notes or change requests for designer..."
                value={draftFeedback}
                onChange={(e) => setDraftFeedback(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setActiveModal(null)}
                style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', padding: '8px 14px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReviewDraft}
                disabled={modalLoading}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  padding: '8px 18px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                {modalLoading ? 'Executing...' : 'Submit Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Authorise Print Modal */}
      {activeModal === 'authorise_print' && selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '24px',
              width: '480px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Dispatch Print to WhatsApp Partner</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              This dispatches the final print package and production specifications to the printing person's
              WhatsApp number via Twilio.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                Printer WhatsApp Phone Number:
              </label>
              <input
                type="text"
                value={printerPhone}
                onChange={(e) => setPrinterPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setActiveModal(null)}
                style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', padding: '8px 14px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAuthorisePrint}
                disabled={modalLoading}
                style={{
                  backgroundColor: 'var(--accent-success)',
                  color: '#ffffff',
                  padding: '8px 18px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Send size={14} />
                {modalLoading ? 'Dispatching...' : 'Dispatch via WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Printer Status Modal */}
      {activeModal === 'printer_status' && selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '24px',
              width: '460px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Log Printer WhatsApp Reply</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                Printer Progress State:
              </label>
              <select
                value={printerStage}
                onChange={(e) => setPrinterStage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              >
                <option value="in_progress">Printing In Progress (Acknowledged by Printer)</option>
                <option value="completed">Printing Completed (Ready for Pickup / Courier)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setActiveModal(null)}
                style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', padding: '8px 14px' }}
              >
                Cancel
              </button>
              <button
                onClick={handlePrinterStatus}
                disabled={modalLoading}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  padding: '8px 18px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Authorise Dispatch Modal */}
      {activeModal === 'dispatch' && selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '24px',
              width: '460px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Authorise Courier Dispatch</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Carrier / Delivery Service:
                </label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Waybill / Tracking Reference:
                </label>
                <input
                  type="text"
                  value={trackingRef}
                  onChange={(e) => setTrackingRef(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setActiveModal(null)}
                style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', padding: '8px 14px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAuthoriseDispatch}
                disabled={modalLoading}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  padding: '8px 18px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                Dispatch Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Reassign Designer Modal */}
      {activeModal === 'reassign' && selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '24px',
              width: '460px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Reassign Designer</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                Select Active Designer:
              </label>
              <select
                value={targetDesignerId}
                onChange={(e) => setTargetDesignerId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              >
                <option value="">-- Choose Designer --</option>
                {allDesigners.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} (Load: {d.currentActiveWorkload}/{d.maxActiveWorkload})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setActiveModal(null)}
                style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', padding: '8px 14px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReassign}
                disabled={modalLoading || !targetDesignerId}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  padding: '8px 18px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                Reassign Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
