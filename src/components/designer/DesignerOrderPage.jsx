import { orderSenderName } from '../../utils/orderDisplay';
import RevisionAudioPlayer from '../common/RevisionAudioPlayer';
import { runTransfer } from '../../services/fileTransfers';
import { ActionButton } from '../common/SoftFlutter';
import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import { savedDraftUpload, cancelDraftUpload, submitDraftUpload } from '../../services/draftUpload';
import { tabListKeys } from '../common/UI';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { draftUploads, useDraftUploads } from '../../hooks/useDraftUploads';
import DraftCorrectionReview from './DraftCorrectionReview';
import React, { lazy, useCallback, useEffect, useMemo, useState } from 'react';
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
  const [readyUpload, setReadyUpload] = useState(null);
  const [responses, setResponses] = useState({});
  const [addressing, setAddressing] = useState(null);
  useDialogFocus(showUpload && !readyUpload, () => {
    if (!uploading) setShowUpload(false);
  });
  const uploads = useDraftUploads();
  const backgroundUpload = uploads.find(job => job.orderId === orderId);
  const uploadInProgress = backgroundUpload && ['queued', 'uploading', 'canceling'].includes(backgroundUpload.status);
  const [uploadError, setUploadError] = useState('');
  const [resume, setResume] = useState(null);
  const [printFile, setPrintFile] = useState(null);
  const [printSpecs, setPrintSpecs] = useState({
    quantity: 1,
    paperType: 'Glossy 150gsm',
    coverFinish: 'Laminated Matte',
    binding: 'Saddle Stitch',
  });
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
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
  const openUpload = () => {
    const previous = savedDraftUpload(staffUser?._id, orderId) || (backgroundUpload?.status === 'ready' ? backgroundUpload.result : null);
    setResume(previous);
    setReadyUpload(previous?.readyForReview ? previous : null);
    setUploadError('');
    if (previous?.metadata?.designerNotes) setNotes(previous.metadata.designerNotes);
    setShowUpload(true);
  };
  useEffect(() => {
    const openReview = () => {
      if (window.location.pathname !== `/staff/design/orders/${encodeURIComponent(orderId)}` || !new URLSearchParams(window.location.search).has('reviewUpload')) return;
      const saved = savedDraftUpload(staffUser?._id, orderId) || (backgroundUpload?.status === 'ready' ? backgroundUpload.result : null);
      if (!saved?.readyForReview) return;
      setReadyUpload(saved);
      setResume(saved);
      setUploadError('');
      setShowUpload(true);
      window.history.replaceState(window.history.state, '', window.location.pathname);
    };
    openReview();
    window.addEventListener('popstate', openReview);
    return () => window.removeEventListener('popstate', openReview);
  }, [orderId, staffUser?._id, backgroundUpload?.status, backgroundUpload?.result]);
  useEffect(() => {
    if (backgroundUpload?.status !== 'complete') return;
    setSuccess('Draft uploaded and sent to manager review. Preparing opening pages.');
    load(true);
  }, [backgroundUpload?.id, backgroundUpload?.status, load]);
  const upload = (event) => {
    event.preventDefault();
    if (uploading || uploadInProgress) return;
    if (!file) {
      setUploadError('Select a magazine PDF before continuing.');
      return;
    }
    try {
      draftUploads.enqueue({
        token, staffId: staffUser?._id, orderId, file,
        label: orderSenderName(order, tx('Unnamed customer')),
        metadata: {
          designerNotes: notes,
          expectedVersion: order.currentDraftVersion,
          ...(activeReturn ? { revisionRequestId: activeReturn._id } : {}),
        },
        deferSubmission: Boolean(activeReturn),
      });
      setShowUpload(false);
      setFile(null);
      setNotes('');
      setResume(null);
      setUploadError('');
    } catch (err) {
      setUploadError(err.message);
    }
  };
  const submitReviewedDraft = async (confirmedCorrectionIds) => {
    setUploading(true);
    setUploadError('');
    try {
      await submitDraftUpload({ token, staffId: staffUser?._id, orderId, uploadId: readyUpload.id, confirmedCorrectionIds });
      draftUploads.finishReview(orderId);
      setShowUpload(false);
      setReadyUpload(null);
      setResume(null);
      setFile(null);
      setNotes('');
      setSelectedVersion(null);
      setTab('magazine');
      setSuccess('Draft uploaded and sent to manager review. Preparing opening pages.');
      await load();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };
  const cancelUpload = async () => {
    try {
      await cancelDraftUpload(token, staffUser?._id, orderId);
      if (backgroundUpload) draftUploads.dismiss(backgroundUpload.id);
      setResume(null);
      setReadyUpload(null);
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
      if (printFile) {
        await runTransfer({ key: `print:${orderId}`, name: printFile.name, kind: 'upload' }, context =>
          api.designer.uploadPrintDocument(token, orderId, data, context));
      } else {
        await api.designer.uploadPrintDocument(token, orderId, data);
      }
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
      await runTransfer({ key: `folder:${orderId}:${folder}`, name: `${folder}.zip`, kind: 'download' }, async context => {
        const { url } = await api.designer.downloadPhotoFolder(token, orderId, folder, {
          signal: context.signal,
          onStatus: stage => context.progress({ stage: stage === 'ready' ? 'transferring' : 'preparing', percent: null }),
        });
        // ZIP archives can be very large. The browser streams them to disk without buffering them in app memory.
        context.signal.throwIfAborted();
        const link = document.createElement('a');
        link.href = url; link.download = `${folder}.zip`;
        document.body.appendChild(link); link.click(); link.remove();
        context.progress({ stage: 'handed-off', percent: null });
      });
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && (!order || order._id !== orderId))
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
          <h1>{orderSenderName(order, tx('Unnamed customer'))}</h1>
          <p>
            {order.formTitle} ·{' '}
            <span className="designer-status" data-status={order.status}>
              {tx(order.status.replaceAll('_', ' '))}
            </span>
          </p>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8 }}>
            {['assigned', 'revision_requested'].includes(order.status) && (
              <ActionButton className="secondary-button" onClick={startDesign}>
                <InterfaceText>Start design</InterfaceText>
              </ActionButton>
            )}
            <button className="primary-button" onClick={openUpload} disabled={Boolean(uploadInProgress)}>
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
                          <RevisionAudioPlayer token={token} orderId={orderId} requestId={request._id} item={item} />
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
                            <ActionButton loading={Boolean(addressing)} className="secondary-button" disabled={Boolean(addressing) || !String(responses[item._id] || '').trim()}>
                              <InterfaceText>Mark addressed</InterfaceText>
                            </ActionButton>
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
                <ActionButton loading={uploading && !printFile} className="primary-button" disabled={uploading}>
                  {printFile
                    ? 'Upload & send print PDF'
                    : `Use approved draft v${order.approvedVersionNumber} for print`}
                </ActionButton>
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
          {readyUpload ? (
            <DraftCorrectionReview
              token={token} orderId={orderId} request={activeReturn}
              upload={readyUpload} submitting={uploading} error={uploadError}
              onSubmit={submitReviewedDraft} onCancel={cancelUpload}
              onClose={() => setShowUpload(false)}
            />
          ) : <form
            className="upload-dialog"
            onSubmit={upload}
            role="dialog"
            aria-modal="true"
            aria-label={tx('Upload new draft')}
          >
            <h2>
              <InterfaceText>Upload new draft</InterfaceText>
            </h2>
            {activeReturn && <p><InterfaceText>Upload your updated PDF first. You will preview and confirm each correction before sending it to the manager.</InterfaceText></p>}
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
            <p className="muted"><InterfaceText>You can continue working while your magazine uploads. Progress will appear at the bottom right.</InterfaceText></p>
            <footer>
              <button
                type="button"
                className="secondary-button"
                disabled={uploading}
                onClick={cancelUpload}
              >
                <InterfaceText>Cancel</InterfaceText>
              </button>
              <button className="primary-button" disabled={uploading || !file}>
                {tx(uploading ? 'Uploading…' : activeReturn ? 'Upload updated PDF' : 'Send to manager review')}
              </button>
            </footer>
          </form>}
        </div>
      )}
    </section>
  );
}
