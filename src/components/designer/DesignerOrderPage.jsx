import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import { transferDraft, savedDraftUpload, cancelDraftUpload } from '../../services/draftUpload';
import { tabListKeys } from '../common/UI';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import DraftUploadProgress from './DraftUploadProgress';
import React, { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, UploadCloud } from 'lucide-react';
import { api } from '../../services/api';
import PageSkeleton from '../common/PageSkeleton';
import OrderAnswersView from '../common/OrderAnswersView';
import OrderPhotosFolderView from '../common/OrderPhotosFolderView';
import './designerWorkspace.css';

const PdfBookReader = lazy(() => import('../common/PdfBookReader'));

export default function DesignerOrderPage({ token, staffUser, orderId, onBack }) {
  const tx = useInterfaceText();

  const [order, setOrder] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [verifyAll, setVerifyAll] = useState(false);
  const [responses, setResponses] = useState({});
  const [addressing, setAddressing] = useState(null);
  useDialogFocus(showUpload, () => {
    if (!uploading) setShowUpload(false);
  });
  const uploadAbort = useRef(null);
  const [progress, setProgress] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [resume, setResume] = useState(null);
  const [printFile, setPrintFile] = useState(null);
  const [printSpecs, setPrintSpecs] = useState({
    quantity: 1,
    paperType: 'Glossy 150gsm',
    coverFinish: 'Laminated Matte',
    binding: 'Saddle Stitch',
  });
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.designer.getOrder(token, orderId);
      setOrder(data.order);
      setLogs(data.auditLogs || []);
    } catch (err) {
      setError(err.message || 'Unable to load this order');
    } finally {
      setLoading(false);
    }
  }, [token, orderId]);
  useEffect(() => {
    load();
  }, [load]);
  const activeReturn = useMemo(
    () => order?.revisionRequests?.find((item) => item.status === 'open' || item.status === 'submitted_for_review'),
    [order],
  );
  const pendingFixes = activeReturn?.items.filter((item) => item.status !== 'addressed') || [];
  const allAddressed = pendingFixes.length === 0;
  const currentDraft = order?.draftVersions?.find((item) => item.versionNumber === order.currentDraftVersion);
  const canEdit = ['designer', 'admin'].includes(staffUser?.role);
  const [tab, setTab] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [focusAnnotation, setFocusAnnotation] = useState(null);

  const address = async (requestId, itemId) => {
    const response = String(responses[itemId] || '').trim();
    if (!response || addressing) return;
    setAddressing(itemId);
    setError('');
    setUploadError('');
    try {
      await api.designer.addressFix(token, orderId, requestId, itemId, response);
      // Refresh the checklist without unmounting the dialog and its selected PDF.
      const data = await api.designer.getOrder(token, orderId);
      setOrder(data.order);
      setLogs(data.auditLogs || []);
      setResponses((old) => ({ ...old, [itemId]: '' }));
    } catch (err) {
      (showUpload ? setUploadError : setError)(err.message || 'Unable to save this correction. Please retry.');
    } finally {
      setAddressing(null);
    }
  };
  useEffect(() => () => uploadAbort.current?.abort(), []);
  const openUpload = () => {
    const previous = savedDraftUpload(staffUser?._id, orderId);
    setResume(previous);
    setProgress(null);
    setUploadError('');
    if (previous?.metadata?.designerNotes) setNotes(previous.metadata.designerNotes);
    setShowUpload(true);
  };
  const upload = async (event) => {
    event.preventDefault();
    if (uploading || addressing) return;
    if (activeReturn && (!allAddressed || !verifyAll)) {
      setUploadError(!allAddressed
        ? 'Describe and mark each correction addressed below before uploading.'
        : 'Confirm that you verified every requested fix before uploading.');
      return;
    }
    if (!file) {
      setUploadError('Select a magazine PDF before continuing.');
      return;
    }
    setUploading(true);
    setUploadError('');
    uploadAbort.current = new AbortController();
    try {
      await transferDraft({
        token,
        staffId: staffUser?._id,
        orderId,
        file,
        metadata: {
          designerNotes: notes,
          expectedVersion: order.currentDraftVersion,
          ...(activeReturn ? { revisionRequestId: activeReturn._id, verifyAll } : {}),
        },
        signal: uploadAbort.current.signal,
        onProgress: setProgress,
      });
      setShowUpload(false);
      setFile(null);
      setNotes('');
      setVerifyAll(false);
      setResume(null);
      setSelectedVersion(null);
      setTab('magazine');
      setSuccess('Draft uploaded and sent to manager review. Preparing opening pages.');
      await load();
    } catch (err) {
      if (err.name !== 'AbortError') setUploadError(err.message);
      setResume(savedDraftUpload(staffUser?._id, orderId));
    } finally {
      setUploading(false);
      uploadAbort.current = null;
    }
  };
  const cancelUpload = async () => {
    uploadAbort.current?.abort();
    try {
      await cancelDraftUpload(token, staffUser?._id, orderId);
      setResume(null);
      setProgress(null);
      setFile(null);
      setShowUpload(false);
    } catch (err) {
      setUploadError(err.message);
    }
  };
  const startDesign = async () => {
    try {
      await api.designer.startDesign(token, orderId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };
  const uploadPrint = async (event) => {
    event.preventDefault();
    setUploading(true);
    setError('');
    try {
      const data = new FormData();
      if (printFile) {
        data.append('printFile', printFile);
      } else {
        data.append('useApprovedDraft', 'true');
      }
      Object.entries(printSpecs).forEach(([key, value]) => data.append(key, value));
      await api.designer.uploadPrintDocument(token, orderId, data);
      setPrintFile(null);
      setSuccess('Print-ready PDF sent for manager authorization.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };
  const downloadFolder = async (folder) => {
    try {
      const { url } = await api.designer.downloadPhotoFolder(token, orderId, folder);
      const link = document.createElement('a');
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading)
    return <PageSkeleton variant="detail" title={tx('Opening order')} description={tx('Loading its files, fixes and history.')} />;
  if (!order)
    return (
      <section className="designer-page">
        <button className="secondary-button" onClick={onBack}>
          <ArrowLeft size={16} />
          <InterfaceText>Back</InterfaceText>
        </button>
        <div className="designer-alert is-error" role="alert">
          {error || 'Order not found'}
        </div>
      </section>
    );
  return (
    <section className="designer-page">
      <div className="designer-page-title">
        <div>
          <button className="text-back" onClick={onBack}>
            <ArrowLeft size={15} /> {staffUser?.role === 'manager' ? 'Returns' : 'Design orders'}
          </button>
          <h1>{order.trackingId || order.submissionId}</h1>
          <p>
            {order.clientName} · {order.formTitle} ·{' '}
            <span className="designer-status" data-status={order.status}>
              {tx(order.status.replaceAll('_', ' '))}
            </span>
          </p>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8 }}>
            {['assigned', 'revision_requested'].includes(order.status) && (
              <button className="secondary-button" onClick={startDesign}>
                <InterfaceText>Start design</InterfaceText>
              </button>
            )}
            <button className="primary-button" onClick={openUpload}>
              <UploadCloud size={16} />
              <InterfaceText>Upload new draft</InterfaceText>
            </button>
          </div>
        )}
      </div>
      {error && (
        <div className="designer-alert is-error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="designer-alert is-success" role="status">
          {success}
        </div>
      )}
      <nav className="designer-tabs" role="tablist" onKeyDown={tabListKeys} aria-label={tx('Order sections')}>
        {[
          ['magazine', 'Magazine'],
          ['corrections', 'Corrections'],
          ['content', 'Client content'],
          ['history', 'Version history'],
        ].map(([id, label]) => (
          <button
            key={id}
            id={`designer-${orderId}-${id}-tab`}
            role="tab"
            tabIndex={(tab || (currentDraft ? 'magazine' : 'content')) === id ? 0 : -1}
            aria-selected={(tab || (currentDraft ? 'magazine' : 'content')) === id}
            onClick={() => setTab(id)}
          >
            {tx(label)}
          </button>
        ))}
      </nav>
      <div hidden={(tab || (currentDraft ? 'magazine' : 'content')) !== 'magazine'}>
        {currentDraft ? (
          <PdfBookReader
            token={token}
            orderId={orderId}
            version={selectedVersion || currentDraft.versionNumber}
            title={`Draft version ${selectedVersion || currentDraft.versionNumber}`}
            focusAnnotation={focusAnnotation}
          />
        ) : (
          <p>
            <InterfaceText>No magazine uploaded yet.</InterfaceText>
          </p>
        )}
      </div>
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div hidden={tab !== 'corrections'} className="designer-card">
            <h2>
              <InterfaceText>Returns &amp; fixes</InterfaceText>
            </h2>
            {!(order.revisionRequests || []).length ? (
              <p className="muted">
                <InterfaceText>No returns have been issued.</InterfaceText>
              </p>
            ) : (
              (order.revisionRequests || [])
                .slice()
                .reverse()
                .map((request) => (
                  <article className="fix-round" key={request._id}>
                    <header>
                      <strong>
                        <InterfaceText>Round</InterfaceText> {request.roundNumber} · {request.source}
                      </strong>
                      <span className="designer-status">{request.status.replaceAll('_', ' ')}</span>
                    </header>
                    {request.items.map((item) => (
                      <div className="fix-item" key={item._id}>
                        <div>
                          <p>
                            <strong>{item.pageReference && `Page ${item.pageReference}: `}</strong>
                            {item.text}
                          </p>
                          {item.annotationId && (
                            <button
                              className="secondary-button"
                              onClick={() => {
                                setSelectedVersion(request.draftVersionNumber);
                                setFocusAnnotation(item.annotationId);
                                setTab('magazine');
                              }}
                            >
                              <InterfaceText>View marked area</InterfaceText>
                            </button>
                          )}
                          {item.designerResponse && (
                            <small>
                              <InterfaceText>Response:</InterfaceText> {item.designerResponse}
                            </small>
                          )}
                        </div>
                        {canEdit && request.status === 'open' && item.status !== 'addressed' ? (
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              address(request._id, item._id);
                            }}
                          >
                            <input
                              aria-label={`Response for ${item.text}`}
                              placeholder={tx('How was this fixed?')}
                              value={responses[item._id] || ''}
                              onChange={(e) => setResponses({ ...responses, [item._id]: e.target.value })}
                            />
                            <button className="secondary-button" disabled={Boolean(addressing) || !String(responses[item._id] || '').trim()}>
                              <InterfaceText>Mark addressed</InterfaceText>
                            </button>
                          </form>
                        ) : (
                          <span className="return-progress done">
                            <CheckCircle2 size={14} />
                            {item.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </article>
                ))
            )}
          </div>
          <div hidden={(tab || (currentDraft ? 'magazine' : 'content')) !== 'content'} className="designer-card">
            <h2>
              <InterfaceText>Client submission</InterfaceText>
            </h2>
            <OrderAnswersView
              submittedData={order.submittedData}
              submittedFields={order.submittedFields}
              formFields={order.formId?.fields}
            />
            <div style={{ marginTop: 18 }}>
              <OrderPhotosFolderView uploadedPhotos={order.uploadedPhotos} onDownloadFolder={downloadFolder} />
            </div>
          </div>
          <div hidden={tab !== 'history'} className="designer-card">
            <h2>
              <InterfaceText>Draft versions</InterfaceText>
            </h2>
            {(order.draftVersions || [])
              .slice()
              .reverse()
              .map((draft) => (
                <div className="history-entry" key={draft._id}>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setSelectedVersion(draft.versionNumber);
                      setFocusAnnotation(null);
                      setTab('magazine');
                    }}
                  >
                    <InterfaceText>Open version</InterfaceText> {draft.versionNumber}
                  </button>
                  <p>
                    {draft.designerNotes || 'No version note'} <InterfaceText>· Manager:</InterfaceText>{' '}
                    {draft.managerReview?.status || 'pending'} <InterfaceText>· Client:</InterfaceText>{' '}
                    {draft.clientReview?.status || 'pending'}
                  </p>
                  <time>{new Date(draft.uploadedAt).toLocaleString()}</time>
                </div>
              ))}
          </div>
          <div hidden={(tab || (currentDraft ? 'magazine' : 'content')) !== 'magazine'} className="designer-card">
            <h2>
              <InterfaceText>Production details</InterfaceText>
            </h2>
            <div className="production-grid">
              <div>
                <span>
                  <InterfaceText>Approved version</InterfaceText>
                </span>
                <strong>{order.approvedVersionNumber || 'Not approved'}</strong>
              </div>
              <div>
                <span>
                  <InterfaceText>Print status</InterfaceText>
                </span>
                <strong>
                  {order.printingDetails?.completedAt
                    ? 'Completed'
                    : order.printDocument?.uploadedAt
                      ? 'Prepared'
                      : 'Not prepared'}
                </strong>
              </div>
              <div>
                <span>
                  <InterfaceText>Delivery</InterfaceText>
                </span>
                <strong>{order.dispatchDetails?.trackingReference || 'Not dispatched'}</strong>
              </div>
            </div>
            {canEdit && order.approvedVersionNumber && !order.printDocument?.uploadedAt && (
              <form className="print-upload" onSubmit={uploadPrint}>
                <label htmlFor="print-pdf">
                  <InterfaceText>Print-ready PDF (leave empty to promote approved draft v</InterfaceText>{' '}
                  {order.approvedVersionNumber})
                </label>
                <input
                  id="print-pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setPrintFile(e.target.files?.[0] || null)}
                />
                <div className="print-specs">
                  <label>
                    <InterfaceText>Quantity</InterfaceText>
                    <input
                      type="number"
                      min="1"
                      value={printSpecs.quantity}
                      onChange={(e) => setPrintSpecs({ ...printSpecs, quantity: e.target.value })}
                    />
                  </label>
                  <label>
                    <InterfaceText>Paper</InterfaceText>
                    <input
                      value={printSpecs.paperType}
                      onChange={(e) => setPrintSpecs({ ...printSpecs, paperType: e.target.value })}
                    />
                  </label>
                  <label>
                    <InterfaceText>Finish</InterfaceText>
                    <input
                      value={printSpecs.coverFinish}
                      onChange={(e) => setPrintSpecs({ ...printSpecs, coverFinish: e.target.value })}
                    />
                  </label>
                  <label>
                    <InterfaceText>Binding</InterfaceText>
                    <input
                      value={printSpecs.binding}
                      onChange={(e) => setPrintSpecs({ ...printSpecs, binding: e.target.value })}
                    />
                  </label>
                </div>
                <button className="primary-button" disabled={uploading}>
                  {printFile
                    ? 'Upload & send print PDF'
                    : `Use approved draft v${order.approvedVersionNumber} for print`}
                </button>
              </form>
            )}
          </div>
        </div>
        <aside hidden={tab !== 'history'} className="designer-card">
          <h2>
            <InterfaceText>Submission history</InterfaceText>
          </h2>
          <div className="order-history">
            {logs.map((log) => (
              <div className="history-entry" key={log._id}>
                <strong>{log.action.replaceAll('_', ' ')}</strong>
                <p>
                  {log.actor?.name || 'System'}
                  {log.details?.feedback ? ` · ${log.details.feedback}` : ''}
                </p>
                <time>{new Date(log.createdAt).toLocaleString()}</time>
              </div>
            ))}
            {!logs.length && (
              <p className="muted">
                <InterfaceText>No recorded activity.</InterfaceText>
              </p>
            )}
          </div>
        </aside>
      </div>
      {showUpload && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !uploading) setShowUpload(false);
          }}
        >
          <form
            className="upload-dialog"
            onSubmit={upload}
            role="dialog"
            aria-modal="true"
            aria-label={tx('Upload new draft')}
          >
            <h2>
              <InterfaceText>Upload new draft</InterfaceText>
            </h2>
            {activeReturn && (
              <p>
                <InterfaceText>This version must address return round</InterfaceText> {activeReturn.roundNumber}{' '}
                <InterfaceText>. All checklist items must be completed first.</InterfaceText>
              </p>
            )}
            {pendingFixes.length > 0 && (
              <section className="upload-corrections" aria-label={tx('Pending corrections')}>
                <h3><InterfaceText>Pending corrections</InterfaceText> ({pendingFixes.length})</h3>
                <p><InterfaceText>Describe and mark each correction addressed below before uploading.</InterfaceText></p>
                {pendingFixes.map((item) => (
                  <div className="upload-correction" key={item._id}>
                    <p>
                      {item.pageReference && <strong>{tx('Page')} {item.pageReference}: </strong>}
                      {item.text}
                    </p>
                    <label htmlFor={`upload-fix-${item._id}`}><InterfaceText>How was this fixed?</InterfaceText></label>
                    <input
                      id={`upload-fix-${item._id}`}
                      value={responses[item._id] || ''}
                      disabled={uploading || Boolean(addressing)}
                      onChange={(e) => setResponses((old) => ({ ...old, [item._id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          address(activeReturn._id, item._id);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={uploading || Boolean(addressing) || !String(responses[item._id] || '').trim()}
                      onClick={() => address(activeReturn._id, item._id)}
                    >
                      {tx(addressing === item._id ? 'Saving…' : 'Mark addressed')}
                    </button>
                  </div>
                ))}
              </section>
            )}
            {resume && !uploading && (
              <p>
                <InterfaceText>A saved upload is available for</InterfaceText> {resume.name}{' '}
                <InterfaceText>. Select the same PDF to resume.</InterfaceText>
              </p>
            )}
            {uploadError && (
              <div className="designer-alert is-error" role="alert">
                {tx(uploadError)}
              </div>
            )}
            <label htmlFor="draft-pdf">
              <InterfaceText>Magazine PDF · up to 500 MB</InterfaceText>
            </label>
            <input
              id="draft-pdf"
              type="file"
              required
              disabled={uploading}
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="draft-summary">
              <InterfaceText>Version summary</InterfaceText>
            </label>
            <textarea
              id="draft-summary"
              rows="3"
              disabled={uploading || Boolean(resume)}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tx('What changed in this version?')}
            />
            <DraftUploadProgress progress={progress} />
            {activeReturn && (
              <label className="verify-check">
                <input
                  type="checkbox"
                  checked={verifyAll}
                  disabled={!allAddressed || uploading || Boolean(addressing)}
                  aria-describedby="draft-upload-requirements"
                  onChange={(e) => setVerifyAll(e.target.checked)}
                />
                <InterfaceText>I verified every requested fix</InterfaceText>
              </label>
            )}
            <p id="draft-upload-requirements" className="upload-requirements" role="status">
              {tx(!allAddressed
                ? 'Complete the pending corrections above to unlock verification and sending.'
                : activeReturn && !verifyAll
                  ? 'All corrections are addressed. Tick the verification checkbox to continue.'
                  : !file
                    ? 'Select a magazine PDF before continuing.'
                    : 'Ready to send to manager review.')}
            </p>
            <footer>
              <button
                type="button"
                className="secondary-button"
                disabled={uploading && progress?.stage === 'finalizing'}
                onClick={cancelUpload}
              >
                <InterfaceText>Cancel</InterfaceText>
              </button>
              <button className="primary-button" aria-describedby="draft-upload-requirements" disabled={uploading || Boolean(addressing) || !file || !allAddressed || Boolean(activeReturn && !verifyAll)}>
                {tx(uploading ? 'Uploading…' : 'Send to manager review')}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
