import React, { lazy, useState, useEffect, useCallback } from 'react';
import {
  Search,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Send,
  Truck,
  Printer,
  Sparkles,
  LogOut,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

const PdfBookReader = lazy(() => import('../common/PdfBookReader'));

const STAGES = [
  { key: 'submission', labelKey: 'track.stage.submission' },
  { key: 'payment', labelKey: 'track.stage.payment' },
  { key: 'design', labelKey: 'track.stage.design' },
  { key: 'review', labelKey: 'track.stage.review' },
  { key: 'printing', labelKey: 'track.stage.printing' },
  { key: 'delivery', labelKey: 'track.stage.delivery' },
];

export default function ClientTrackingPortal() {
  const { t } = useLanguage();
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
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionItems, setRevisionItems] = useState([{ text: '', pageReference: '' }]);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [readerVersion,setReaderVersion] = useState(null);

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
      setError(err.message || t('track.err.sessionExpired'));
      setClientToken('');
      sessionStorage.removeItem('tinzel_client_token');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!trackingId.trim() || !clientWhatsApp.trim()) {
      setError(t('track.err.enterBoth'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.client.requestOtp(trackingId.trim(), clientWhatsApp.trim());
      setOtpSent(true);
      if (res.devOtp) setDevOtp(res.devOtp);
      setSuccessMsg(t('track.ok.otpSent'));
    } catch (err) {
      setError(err.message || t('track.err.requestOtp'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError(t('track.err.enterOtp'));
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
      setError(err.message || t('track.err.invalidOtp'));
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
    if (!confirm(t('track.confirm.approve'))) return;
    setSubmittingDecision(true);
    setError(null);
    try {
      const res = await api.client.approveDraft(clientToken, 'Client approved whole magazine.', order.currentDraftVersion);
      setOrder(res.order);
      setSuccessMsg(t('track.ok.approved'));
    } catch (err) {
      setError(err.message || t('track.err.approve'));
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleRequestRevision = async (e) => {
    e.preventDefault();
    const items = revisionItems.map((item) => ({ text: item.text.trim(), pageReference: item.pageReference.trim() })).filter((item) => item.text);
    if (!items.length) {
      setError(t('track.err.describeChanges'));
      return;
    }

    setSubmittingDecision(true);
    setError(null);
    try {
      const res = await api.client.requestRevision(clientToken, items, order.currentDraftVersion);
      setOrder(res.order);
      setShowRevisionForm(false);
      setRevisionItems([{ text: '', pageReference: '' }]);
      setSuccessMsg(t('track.ok.revisionSent'));
    } catch (err) {
      setError(err.message || t('track.err.revision'));
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
              {t('track.login.title')}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {t('track.login.subtitle')}
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
                  {t('track.login.trackingId')}
                </label>
                <input
                  type="text"
                  placeholder={t('track.login.trackingIdPh')}
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
                  {t('track.login.whatsapp')}
                </label>
                <input
                  type="text"
                  placeholder={t('track.login.whatsappPh')}
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
                {t('track.login.sendCode')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                  {t('track.login.enterOtp')}
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
                    {t('track.login.devOtp')} <strong>{devOtp}</strong>
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
                {t('track.login.verify')}
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
                {t('track.login.change')}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Active Order & Whole-Magazine Review Portal View
  const currentStageIdx = getStageIndex(order.status);
  const releasedDraft = (order.draftVersions || []).find((v) => v.versionNumber === order.currentDraftVersion) || (order.draftVersions || []).at(-1);

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
              {t('track.status.' + order.status) || order.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {t('track.client')} <strong>{order.clientName}</strong> • {t('track.magazine')} <strong>{order.formTitle}</strong>
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
          {t('track.signOut')}
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
          {t('track.progress')}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
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
                    ? '#F0FDF4'
                    : isCurrent
                    ? '#EFF6FF'
                    : 'var(--bg-primary)',
                  border: `1px solid ${
                    isCompleted ? '#16A34A' : isCurrent ? '#2563EB' : 'var(--border-color)'
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
                    color: isCompleted ? '#15803D' : isCurrent ? '#1D4ED8' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {t(stg.labelKey)}
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

      {(order.revisionRequests || []).length > 0 && (
        <section style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Your requested fixes</h2>
          {(order.revisionRequests || []).slice().reverse().map((request) => <div key={request._id} style={{ borderTop: '1px solid var(--border-color)', padding: '12px 0' }}>
            <strong style={{ fontSize: 13 }}>Round {request.roundNumber} · {String(request.status).replaceAll('_', ' ')}</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>{request.items.map((item) => <li key={item._id} style={{ fontSize: 13, marginBottom: 4 }}>{item.pageReference ? `Page ${item.pageReference}: ` : ''}{item.text}</li>)}</ul>
          </div>)}
        </section>
      )}

      {/* Whole-Magazine Reader Section */}
      {releasedDraft ? (
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
                {t('track.proof.title', { version: releasedDraft?.versionNumber })}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {t('track.proof.hint')}
              </p>
            </div>
          </div>

          <label>Magazine version <select aria-label="Magazine version" value={readerVersion||releasedDraft?.versionNumber} onChange={(e)=>setReaderVersion(Number(e.target.value))}>{(order.draftVersions||[]).map((v)=><option key={v.versionNumber} value={v.versionNumber}>Version {v.versionNumber}</option>)}</select></label>
          <PdfBookReader token={clientToken} version={readerVersion||releasedDraft?.versionNumber} client title={t('track.proof.title', { version: readerVersion||releasedDraft?.versionNumber })} onReviewed={()=>loadOrder(clientToken)} />

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
                {t('track.decision.title')}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                {t('track.decision.desc')}
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
                    {t('track.decision.approve')}
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
                    {t('track.decision.requestChanges')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestRevision}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    {t('track.decision.describe')}
                  </label>
                  {revisionItems.map((item,index)=><div key={index} style={{display:'grid',gridTemplateColumns:'110px 1fr auto',gap:8,marginBottom:10}}><input aria-label={`Page reference ${index+1}`} placeholder="Page (optional)" value={item.pageReference} onChange={(e)=>setRevisionItems((rows)=>rows.map((row,i)=>i===index?{...row,pageReference:e.target.value}:row))} style={{padding:'10px 12px',border:'1px solid var(--border-color)',borderRadius:6}}/><textarea rows={2} required placeholder={t('track.decision.describePh')} value={item.text} onChange={(e)=>setRevisionItems((rows)=>rows.map((row,i)=>i===index?{...row,text:e.target.value}:row))} style={{padding:'10px 12px',border:'1px solid var(--border-color)',borderRadius:6}}/>{revisionItems.length>1&&<button type="button" onClick={()=>setRevisionItems((rows)=>rows.filter((_,i)=>i!==index))} style={{border:0,background:'transparent',color:'#991B1B'}}>Remove</button>}</div>)}
                  <button type="button" onClick={()=>setRevisionItems((rows)=>[...rows,{text:'',pageReference:''}])} style={{background:'transparent',border:'1px solid var(--border-color)',borderRadius:6,padding:'8px 12px',marginBottom:16}}>Add another fix</button>
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
                      {t('track.decision.submit')}
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
                      {t('track.decision.cancel')}
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
                <strong>{t('track.approved.title', { version: order.approvedVersionNumber })}</strong>! {t('track.approved.body')}
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
                <strong>{t('track.revreq.title')}</strong>: {t('track.revreq.body')}
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
            {t('track.wait.title')}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto' }}>
            {t('track.wait.body')}
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
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{t('track.print.title')}</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                {t('track.print.partner')}
              </span>
              <span>{t('track.print.partnerName')}</span>
            </div>
            {order.dispatchDetails?.trackingReference && (
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  {t('track.print.courier')}
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
