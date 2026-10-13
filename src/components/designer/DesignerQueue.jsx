import React, { useState, useEffect } from 'react';
import {
  Layers,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Eye,
  FileCheck2,
  Printer,
  Download,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';

export default function DesignerQueue({ token, staffUser }) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Upload Draft State
  const [draftFile, setDraftFile] = useState(null);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [designerNotes, setDesignerNotes] = useState('');

  // Upload Print State
  const [printFile, setPrintFile] = useState(null);
  const [printSpecs, setPrintSpecs] = useState({
    quantity: 1,
    paperType: 'Glossy 150gsm',
    coverFinish: 'Laminated Matte',
    binding: 'Saddle Stitch',
  });

  // Flag issue state
  const [flagIssueText, setFlagIssueText] = useState('');
  const [showFlagModal, setShowFlagModal] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [token]);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.designer.getOrders(token);
      setOrders(data.orders || []);
      if (data.orders?.length > 0 && !selectedOrder) {
        setSelectedOrder(data.orders[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch assigned orders');
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetail = async (id) => {
    try {
      const data = await api.designer.getOrder(token, id);
      setSelectedOrder(data.order);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartDesign = async () => {
    try {
      await api.designer.startDesign(token, selectedOrder._id);
      await loadOrderDetail(selectedOrder._id);
      await loadOrders();
      setSuccessMsg('Order marked as In Design');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUploadDraft = async (e) => {
    e.preventDefault();
    if (!draftFile) {
      setError('Please select a draft file (PDF or document)');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('draftFile', draftFile);
      formData.append('designerNotes', designerNotes);
      previewFiles.forEach((file) => {
        formData.append('previewPages', file);
      });

      await api.designer.uploadDraft(token, selectedOrder._id, formData);
      setDraftFile(null);
      setPreviewFiles([]);
      setDesignerNotes('');
      setSuccessMsg('Draft version uploaded successfully! Awaiting manager review.');
      await loadOrderDetail(selectedOrder._id);
      await loadOrders();
    } catch (err) {
      setError(err.message || 'Failed to upload draft');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadPrintDocument = async (e) => {
    e.preventDefault();
    if (!printFile) {
      setError('Please select a final print-ready PDF file');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('printFile', printFile);
      formData.append('quantity', printSpecs.quantity);
      formData.append('paperType', printSpecs.paperType);
      formData.append('coverFinish', printSpecs.coverFinish);
      formData.append('binding', printSpecs.binding);

      await api.designer.uploadPrintDocument(token, selectedOrder._id, formData);
      setPrintFile(null);
      setSuccessMsg('Final print document uploaded! Ready for manager print authorization.');
      await loadOrderDetail(selectedOrder._id);
      await loadOrders();
    } catch (err) {
      setError(err.message || 'Failed to upload print file');
    } finally {
      setUploading(false);
    }
  };

  const handleFlagIssue = async () => {
    if (!flagIssueText.trim()) return;
    try {
      await api.designer.flagIssue(token, selectedOrder._id, flagIssueText.trim());
      setShowFlagModal(false);
      setFlagIssueText('');
      setSuccessMsg('Issue flagged for manager oversight.');
      await loadOrderDetail(selectedOrder._id);
      await loadOrders();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
      {/* Left Column: Assigned Queue */}
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px',
          height: 'fit-content',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700' }}>My Assigned Orders</h2>
          <button
            onClick={loadOrders}
            style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '4px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No orders currently assigned to you.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {orders.map((ord) => (
              <div
                key={ord._id}
                onClick={() => {
                  loadOrderDetail(ord._id);
                  setError(null);
                  setSuccessMsg(null);
                }}
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: selectedOrder?._id === ord._id ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                  border: `1px solid ${selectedOrder?._id === ord._id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#60a5fa' }}>
                    {ord.trackingId || ord.submissionId}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      fontWeight: '600',
                    }}
                  >
                    {ord.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>{ord.clientName}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ord.formTitle}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Column: Order Detail & Actions */}
      <div>
        {error && (
          <div
            style={{
              backgroundColor: '#450a0a',
              border: '1px solid var(--accent-danger)',
              borderRadius: '6px',
              padding: '12px 14px',
              marginBottom: '16px',
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
              marginBottom: '16px',
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

        {selectedOrder ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Card */}
            <div
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h1 style={{ fontSize: '20px', fontWeight: '700' }}>{selectedOrder.trackingId}</h1>
                  <span
                    style={{
                      backgroundColor: '#1e3a8a',
                      color: '#93c5fd',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {selectedOrder.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Client: <strong>{selectedOrder.clientName}</strong> ({selectedOrder.clientWhatsApp}) •{' '}
                  {selectedOrder.formTitle}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {(selectedOrder.status === 'assigned' || selectedOrder.status === 'revision_requested') && (
                  <button
                    onClick={handleStartDesign}
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}
                  >
                    Mark as In Design
                  </button>
                )}
                <button
                  onClick={() => setShowFlagModal(true)}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <AlertTriangle size={13} />
                  Flag Issue
                </button>
              </div>
            </div>

            {/* Client Assets & Photos Section */}
            <div
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>
                Client Submitted Photos & Information
              </h2>

              {/* Submitted text answers */}
              {selectedOrder.submittedData && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--text-muted)' }}>
                    Form Answers:
                  </div>
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                    }}
                  >
                    {typeof selectedOrder.submittedData === 'object'
                      ? JSON.stringify(selectedOrder.submittedData, null, 2)
                      : String(selectedOrder.submittedData)}
                  </pre>
                </div>
              )}

              {/* Photos Gallery */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-muted)' }}>
                  High-Resolution Uploaded Photos ({selectedOrder.uploadedPhotos?.length || 0}):
                </div>
                {selectedOrder.uploadedPhotos && selectedOrder.uploadedPhotos.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                    {selectedOrder.uploadedPhotos.map((photo, i) => (
                      <div
                        key={i}
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={photo.url}
                          alt={photo.originalName}
                          style={{ width: '100%', height: '90px', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div
                          style={{
                            display: 'none',
                            height: '90px',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-muted)',
                            fontSize: '11px',
                          }}
                        >
                          Photo {i + 1}
                        </div>
                        <div style={{ padding: '6px 8px', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {photo.originalName || `Photo-${i + 1}`}
                          </span>
                          <a href={photo.url} target="_blank" rel="noreferrer" download style={{ color: '#60a5fa' }}>
                            <Download size={12} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No photos uploaded for this order.</div>
                )}
              </div>
            </div>

            {/* Versioned Draft History & Revisions */}
            <div
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>
                Draft Version History & Feedback
              </h2>

              {selectedOrder.draftVersions && selectedOrder.draftVersions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {selectedOrder.draftVersions.map((ver) => (
                    <div
                      key={ver.versionNumber}
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '700', fontSize: '13px' }}>Version {ver.versionNumber}</span>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              backgroundColor: ver.managerReview?.status === 'approved' ? '#064e3b' : '#451a03',
                              color: ver.managerReview?.status === 'approved' ? '#6ee7b7' : '#fcd34d',
                            }}
                          >
                            Manager: {ver.managerReview?.status || 'pending'}
                          </span>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              backgroundColor: ver.clientReview?.status === 'approved' ? '#064e3b' : '#1e293b',
                              color: ver.clientReview?.status === 'approved' ? '#6ee7b7' : 'var(--text-muted)',
                            }}
                          >
                            Client: {ver.clientReview?.status || 'awaiting'}
                          </span>
                        </div>
                      </div>

                      {ver.designerNotes && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          Designer Note: {ver.designerNotes}
                        </div>
                      )}
                      {ver.managerReview?.feedback && (
                        <div style={{ fontSize: '12px', color: '#fcd34d', marginBottom: '4px' }}>
                          Manager Feedback: {ver.managerReview.feedback}
                        </div>
                      )}
                      {ver.clientReview?.feedback && (
                        <div style={{ fontSize: '12px', color: '#fca5a5' }}>
                          Client Feedback: {ver.clientReview.feedback}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                  No drafts uploaded yet. Upload Draft V1 below.
                </div>
              )}

              {/* Upload Draft Version Form */}
              <form
                onSubmit={handleUploadDraft}
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '6px',
                  padding: '16px',
                }}
              >
                <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '10px' }}>
                  Upload New Draft Version (PDF & Page Proofs)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                      Main Magazine Draft File (PDF) *
                    </label>
                    <input
                      type="file"
                      required
                      accept=".pdf,image/*"
                      onChange={(e) => setDraftFile(e.target.files[0])}
                      style={{ fontSize: '12px', color: 'var(--text-muted)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                      Page Proof Images (for Whole-Magazine Reader)
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => setPreviewFiles(Array.from(e.target.files || []))}
                      style={{ fontSize: '12px', color: 'var(--text-muted)' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                    Designer Notes / Version Summary:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Updated layout with enhanced send-off spread"
                    value={designerNotes}
                    onChange={(e) => setDesignerNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <UploadCloud size={14} />
                  {uploading ? 'Uploading Draft...' : 'Submit Draft to Manager Gate'}
                </button>
              </form>
            </div>

            {/* Print Document Preparation (Unlocked only upon Client Whole-Magazine Approval) */}
            <div
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>
                Print-Ready Document Preparation
              </h2>

              {selectedOrder.approvedVersionNumber ? (
                <div>
                  <div
                    style={{
                      backgroundColor: '#064e3b',
                      color: '#6ee7b7',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>
                      Client approved whole magazine Version {selectedOrder.approvedVersionNumber}. You may now
                      upload the final CMYK 300DPI print package.
                    </span>
                  </div>

                  <form onSubmit={handleUploadPrintDocument}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                          Quantity:
                        </label>
                        <input
                          type="number"
                          value={printSpecs.quantity}
                          onChange={(e) => setPrintSpecs({ ...printSpecs, quantity: Number(e.target.value) })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: 'var(--input-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: 'var(--text-main)',
                            fontSize: '12px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                          Paper Type:
                        </label>
                        <input
                          type="text"
                          value={printSpecs.paperType}
                          onChange={(e) => setPrintSpecs({ ...printSpecs, paperType: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: 'var(--input-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: 'var(--text-main)',
                            fontSize: '12px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                          Cover Finish:
                        </label>
                        <input
                          type="text"
                          value={printSpecs.coverFinish}
                          onChange={(e) => setPrintSpecs({ ...printSpecs, coverFinish: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: 'var(--input-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: 'var(--text-main)',
                            fontSize: '12px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                          Binding:
                        </label>
                        <input
                          type="text"
                          value={printSpecs.binding}
                          onChange={(e) => setPrintSpecs({ ...printSpecs, binding: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: 'var(--input-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: 'var(--text-main)',
                            fontSize: '12px',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                        High-Res Print PDF Document *
                      </label>
                      <input
                        type="file"
                        required
                        accept=".pdf"
                        onChange={(e) => setPrintFile(e.target.files[0])}
                        style={{ fontSize: '12px', color: 'var(--text-muted)' }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={uploading}
                      style={{
                        backgroundColor: 'var(--accent-success)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Printer size={14} />
                      {uploading ? 'Uploading Print File...' : 'Submit Print Document to Manager'}
                    </button>
                  </form>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Print document preparation is locked until the client approves the whole magazine proof.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '60px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            Select an assigned order from the left to inspect assets and upload drafts.
          </div>
        )}
      </div>

      {/* Flag Issue Modal */}
      {showFlagModal && (
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
              width: '440px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Flag Issue for Manager</h3>
            <textarea
              rows={3}
              placeholder="e.g. Missing high-res couple photo; need client to supply replacement image."
              value={flagIssueText}
              onChange={(e) => setFlagIssueText(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-main)',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowFlagModal(false)}
                style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', padding: '6px 12px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleFlagIssue}
                style={{
                  backgroundColor: 'var(--accent-warning)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                Submit Flag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
