import React, { useState, useEffect } from 'react';
import {
  Search,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Send,
  FileCheck2,
  Truck,
  Printer,
  Sparkles,
  LogOut,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api';

const STAGES = [
  { key: 'submission', label: '1. Submitted' },
  { key: 'payment', label: '2. Payment' },
  { key: 'design', label: '3. In Design' },
  { key: 'review', label: '4. Whole-Magazine Review' },
  { key: 'printing', label: '5. Printing' },
  { key: 'delivery', label: '6. Delivered' },
];

export default function ClientTrackingPortal() {
  const [trackingId, setTrackingId] = useState('');
  const [clientWhatsApp, setClientWhatsApp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [clientToken, setClientToken] = useState(sessionStorage.getItem('tinzel_client_token') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [devOtp, setDevOtp] = useState(null);

  // Reader state
  const [currentPage, setCurrentPage] = useState(0);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  useEffect(() => {
    if (clientToken) {
      loadOrder(clientToken);
    }
  }, [clientToken]);

  const loadOrder = async (token) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.client.getOrder(token);
      setOrder(data.order);
    } catch (err) {
      setError(err.message || 'Session expired. Please log in again.');
      setClientToken('');
      sessionStorage.removeItem('tinzel_client_token');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!trackingId.trim() || !clientWhatsApp.trim()) {
      setError('Please enter both Tracking ID and WhatsApp number');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.client.requestOtp(trackingId.trim(), clientWhatsApp.trim());
      setOtpSent(true);
      if (res.devOtp) setDevOtp(res.devOtp);
      setSuccessMsg('A 6-digit OTP code was sent to your WhatsApp number.');
    } catch (err) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit OTP code');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.client.verifyOtp(trackingId.trim(), otpCode.trim());
      setClientToken(res.clientToken);
      sessionStorage.setItem('tinzel_client_token', res.clientToken);
      await loadOrder(res.clientToken);
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setClientToken('');
    sessionStorage.removeItem('tinzel_client_token');
    setOrder(null);
    setOtpSent(false);
    setOtpCode('');
  };

  const handleApproveWholeMagazine = async () => {
    if (!confirm('Are you sure you want to approve the entire magazine for print production?')) return;
    setSubmittingDecision(true);
    setError(null);
    try {
      const res = await api.client.approveDraft(clientToken, 'Client approved whole magazine.');
      setOrder(res.order);
      setSuccessMsg('Whole magazine approved! Your magazine has proceeded to print document preparation.');
    } catch (err) {
      setError(err.message || 'Failed to approve draft');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleRequestRevision = async (e) => {
    e.preventDefault();
    if (!revisionFeedback.trim()) {
      setError('Please describe the changes needed.');
      return;
    }

    setSubmittingDecision(true);
    setError(null);
    try {
      const res = await api.client.requestRevision(clientToken, revisionFeedback.trim());
      setOrder(res.order);
      setShowRevisionForm(false);
      setRevisionFeedback('');
      setSuccessMsg('Your revision request has been submitted to your assigned designer.');
    } catch (err) {
      setError(err.message || 'Failed to submit revision');
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Determine stage progression
  const getStageIndex = (status) => {
    switch (status) {
      case 'awaiting_payment':
        return 0;
      case 'payment_verified':
      case 'queued_for_assignment':
        return 1;
      case 'assigned':
      case 'in_design':
      case 'draft_manager_review':
        return 2;
      case 'client_review':
      case 'revision_requested':
        return 3;
      case 'client_approved':
      case 'print_document_prep':
      case 'print_manager_review':
      case 'printing_sent':
      case 'printing_in_progress':
      case 'printing_completed':
        return 4;
      case 'dispatched':
      case 'delivered':
      case 'closed':
        return 5;
      default:
        return 0;
    }
  };

  // Login Gate View
  if (!clientToken || !order) {
    return (
      <div style={{ maxWidth: '480px', margin: '40px auto' }}>
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '32px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#1e3a8a',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}
            >
              <KeyRound size={24} color="#93c5fd" />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '6px' }}>
              Client Tracking & Review Portal
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Enter your Tracking ID and WhatsApp number to securely review your magazine.
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: '#450a0a',
                border: '1px solid var(--accent-danger)',
                borderRadius: '6px',
                padding: '12px 14px',
                marginBottom: '18px',
                fontSize: '13px',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                backgroundColor: '#064e3b',
                border: '1px solid var(--accent-success)',
                borderRadius: '6px',
                padding: '12px 14px',
                marginBottom: '18px',
                fontSize: '13px',
                color: '#6ee7b7',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                  Magazine Tracking ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. TNZ-2026-0001"
                  required
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    outline: 'none',
                    letterSpacing: '0.5px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                  WhatsApp Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +255712345678"
                  required
                  value={clientWhatsApp}
                  onChange={(e) => setClientWhatsApp(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
                Send WhatsApp Verification Code
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                  Enter 6-Digit WhatsApp OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    textAlign: 'center',
                    fontSize: '24px',
                    letterSpacing: '8px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
                {devOtp && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#60a5fa' }}>
                    [Dev Mode] Generated OTP: <strong>{devOtp}</strong>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                Verify & Enter Portal
              </button>

              <button
                type="button"
                onClick={() => setOtpSent(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  textAlign: 'center',
                  padding: '4px',
                }}
              >
                Change Tracking ID or WhatsApp Number
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Active Order & Whole-Magazine Review Portal View
  const currentStageIdx = getStageIndex(order.status);
  const releasedDraft = (order.draftVersions || []).find((v) => v.versionNumber === order.currentDraftVersion);
  const previewPages = releasedDraft?.previewPages || [];

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Banner / Order Summary */}
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '0.5px' }}>
              {order.trackingId}
            </span>
            <span
              style={{
                backgroundColor: '#1e3a8a',
                color: '#93c5fd',
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
              }}
            >
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Client: <strong>{order.clientName}</strong> • Magazine: <strong>{order.formTitle}</strong>
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '12px',
          }}
        >
          <LogOut size={13} />
          Sign Out
        </button>
      </div>

      {/* Visual Conveyor Belt Progress Bar */}
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '20px 24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '14px', color: 'var(--text-muted)' }}>
          CONVEYOR BELT PRODUCTION PROGRESS
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '8px',
          }}
        >
          {STAGES.map((stg, i) => {
            const isCompleted = i < currentStageIdx;
            const isCurrent = i === currentStageIdx;
            return (
              <div
                key={stg.key}
                style={{
                  backgroundColor: isCompleted
                    ? '#064e3b'
                    : isCurrent
                    ? '#1e3a8a'
                    : 'var(--bg-primary)',
                  border: `1px solid ${
                    isCompleted ? '#059669' : isCurrent ? '#2563eb' : 'var(--border-color)'
                  }`,
                  borderRadius: '6px',
                  padding: '10px 8px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: isCompleted ? '#6ee7b7' : isCurrent ? '#93c5fd' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {stg.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {successMsg && (
        <div
          style={{
            backgroundColor: '#064e3b',
            border: '1px solid var(--accent-success)',
            borderRadius: '6px',
            padding: '14px 16px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: '#450a0a',
            border: '1px solid var(--accent-danger)',
            borderRadius: '6px',
            padding: '14px 16px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Whole-Magazine Reader Section */}
      {previewPages.length > 0 ? (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
                Complete Magazine Proof (Version {releasedDraft?.versionNumber})
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Flip through each page carefully to inspect all layouts, titles, and photos.
              </p>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
              Page {currentPage + 1} of {previewPages.length}
            </div>
          </div>

          {/* Interactive Page Spread / Viewer */}
          <div
            style={{
              position: 'relative',
              backgroundColor: '#020617',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              minHeight: '480px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              marginBottom: '16px',
            }}
          >
            <img
              src={previewPages[currentPage]}
              alt={`Magazine Page ${currentPage + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '520px',
                borderRadius: '4px',
                objectFit: 'contain',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            {/* Fallback mock page renderer if PDF image preview is not generated locally */}
            <div
              style={{
                display: 'none',
                textAlign: 'center',
                padding: '40px',
                color: 'var(--text-muted)',
              }}
            >
              <FileCheck2 size={48} color="var(--accent-primary)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
                Magazine Page Proof {currentPage + 1}
              </h3>
              <p style={{ fontSize: '13px', maxWidth: '360px', margin: '0 auto 16px auto' }}>
                High-resolution proof document: <strong>{releasedDraft?.fileUrl}</strong>
              </p>
              <a
                href={releasedDraft?.fileUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                Open Draft Document
              </a>
            </div>

            {/* Navigation Arrows */}
            {currentPage > 0 && (
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                style={{
                  position: 'absolute',
                  left: '12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid var(--border-color)',
                  color: '#ffffff',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {currentPage < previewPages.length - 1 && (
              <button
                onClick={() => setCurrentPage((p) => Math.min(previewPages.length - 1, p + 1))}
                style={{
                  position: 'absolute',
                  right: '12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid var(--border-color)',
                  color: '#ffffff',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>

          {/* Thumbnail Strip */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '24px' }}>
            {previewPages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: idx === currentPage ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: '#ffffff',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                }}
              >
                Page {idx + 1}
              </button>
            ))}
          </div>

          {/* Action Decision Controls (Whole-Magazine Approval Gate) */}
          {order.status === 'client_review' ? (
            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '24px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
                Whole-Magazine Approval Decision
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                You can approve the entire magazine in a single action to authorize print production, or
                request targeted revisions. Any requested revision will restart the approval loop.
              </p>

              {!showRevisionForm ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button
                    onClick={handleApproveWholeMagazine}
                    disabled={submittingDecision}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'var(--accent-success)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '700',
                    }}
                  >
                    <CheckCircle2 size={18} />
                    Approve Complete Magazine
                  </button>

                  <button
                    onClick={() => setShowRevisionForm(true)}
                    disabled={submittingDecision}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      padding: '12px 20px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    Request Changes / Revisions
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestRevision}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Describe Changes or Revisions Required:
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Specify page numbers and requested changes (e.g., Page 3: replace the photo on the left; Page 7: fix typo in bride's surname)."
                    value={revisionFeedback}
                    onChange={(e) => setRevisionFeedback(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      outline: 'none',
                      marginBottom: '16px',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="submit"
                      disabled={submittingDecision}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'var(--accent-warning)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                      }}
                    >
                      <Send size={14} />
                      Submit Revision Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRevisionForm(false)}
                      style={{
                        backgroundColor: 'transparent',
                        color: 'var(--text-muted)',
                        padding: '10px 16px',
                        fontSize: '13px',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : order.status === 'client_approved' ? (
            <div
              style={{
                backgroundColor: '#064e3b',
                border: '1px solid var(--accent-success)',
                borderRadius: '6px',
                padding: '16px',
                color: '#6ee7b7',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <CheckCircle2 size={20} />
              <div>
                <strong>Whole Magazine Approved (Version {order.approvedVersionNumber})</strong>! Your designer
                is preparing the high-res print-ready package.
              </div>
            </div>
          ) : order.status === 'revision_requested' ? (
            <div
              style={{
                backgroundColor: '#451a03',
                border: '1px solid var(--accent-warning)',
                borderRadius: '6px',
                padding: '16px',
                color: '#fcd34d',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Clock size={20} />
              <div>
                <strong>Revision Requested</strong>: Your designer is updating the layout based on your feedback.
                You will receive a WhatsApp message when the revised draft is released.
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        /* Status Card when Draft is Not Yet Released */
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '36px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <Clock size={28} color="var(--accent-primary)" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
            Magazine Layout In Progress
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto' }}>
            Your magazine is currently in production with your assigned designer. Once the first complete
            proof is reviewed by our production manager, it will appear here for your review and approval.
          </p>
        </div>
      )}

      {/* Printing & Delivery Tracking Details */}
      {['printing_sent', 'printing_in_progress', 'printing_completed', 'dispatched', 'delivered'].includes(
        order.status
      ) && (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Printer size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Print & Dispatch Status</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                Printing Partner:
              </span>
              <span>Tinzel Certified Print Facility (WhatsApp-Integrated)</span>
            </div>
            {order.dispatchDetails?.trackingReference && (
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  Courier Tracking:
                </span>
                <span>
                  {order.dispatchDetails.carrier}: {order.dispatchDetails.trackingReference}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
