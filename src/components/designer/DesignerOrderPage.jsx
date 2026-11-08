import OrderCountdownBadge from '../common/OrderCountdownBadge';
import { orderSenderName } from '../../utils/orderDisplay';
import RevisionAudioPlayer from '../common/RevisionAudioPlayer';
import { runTransfer } from '../../services/fileTransfers';
import { ActionButton } from '../common/SoftFlutter';
import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import { MAX_DRAFT_BYTES, savedDraftUpload, cancelDraftUpload, submitDraftUpload } from '../../services/draftUpload';
import { tabListKeys } from '../common/UI';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { draftUploads, useDraftUploads } from '../../hooks/useDraftUploads';
import DraftCorrectionReview from './DraftCorrectionReview';
import React, { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, UploadCloud } from 'lucide-react';
import { api } from '../../services/api';
import PageSkeleton from '../common/PageSkeleton';
import StatePanel, { StateError } from '../common/StatePanel';
import { useConfirm } from '../common/ConfirmDialog';
import { useLanguage } from '../../i18n/LanguageContext';
import { useVisiblePolling } from '../../hooks/useVisiblePolling';
import { navigate } from '../../navigation/location';
import OrderAnswersView from '../common/OrderAnswersView';
import OrderPhotosFolderView from '../common/OrderPhotosFolderView';
import './designerWorkspace.css';

const PdfBookReader = lazy(() => import('../common/PdfBookReader'));
const MAX_PRINT_BYTES = 4 * 1024 * 1024;

export default function DesignerOrderPage({ token, staffUser, orderId, onBack }) {
  const tx = useInterfaceText();
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const confirm = useConfirm();

  const [order, setOrder] = useState(null);
  const orderRequest = useRef(0);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [printUncertain, setPrintUncertain] = useState(false);
  const [uploadUncertain, setUploadUncertain] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(false);
  const [downloadingImages, setDownloadingImages] = useState(false);
  const [printValidation, setPrintValidation] = useState('');
  const [printErrors, setPrintErrors] = useState({});
  const [printDirty, setPrintDirty] = useState(false);
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
  const hasLocalDraft = Boolean(file || (!resume && notes.trim()) || printFile || printDirty || Object.values(responses).some(value => String(value).trim()));
  const savingLocalWork = Boolean(addressing || uploading);
  useEffect(() => {
    const beforeNavigate = event => {
      // Query changes within this order do not discard its inputs.
      if (event.detail?.path && new URL(event.detail.path, window.location.href).pathname === window.location.pathname) return;
      if (savingLocalWork) { event.preventDefault(); return; }
      if (!hasLocalDraft) return;
      if (!event.detail?.waitUntil) { event.preventDefault(); return; }
      event.detail.waitUntil(confirm({
        title: ui('Leave this order?', 'Ondoka kwenye oda hii?'),
        description: ui('Unsent correction replies, selected files and unfinished edits will be discarded. Your current magazine remains available.', 'Majibu ya marekebisho ambayo hayajatumwa, faili ulizochagua na mabadiliko ambayo hayajakamilika yataondolewa. Jarida lako la sasa litabaki.'),
        confirmLabel: ui('Discard and leave', 'Ondoa na uondoke'),
        cancelLabel: ui('Keep working', 'Endelea kufanya kazi'),
        danger: true,
      }));
    };
    const beforeUnload = event => {
      if (!hasLocalDraft && !savingLocalWork) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('tinzel:before-navigate', beforeNavigate);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('tinzel:before-navigate', beforeNavigate);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [hasLocalDraft, savingLocalWork, confirm, lang]);
  const load = useCallback(async (quiet = false) => {
    const request = ++orderRequest.current;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const data = await api.designer.getOrder(token, orderId);
      if (request !== orderRequest.current) return;
      setOrder(data.order);
      setLogs(data.auditLogs || []);
      return data.order;
    } catch (err) {
      if (request === orderRequest.current) setError(err);
    } finally {
      if (request === orderRequest.current) setLoading(false);
    }
  }, [token, orderId]);
  useEffect(() => {
    load();
    return () => { orderRequest.current++; };
  }, [load]);
  useVisiblePolling(() => load(true), !loading && !hasLocalDraft && !savingLocalWork && !showUpload && !uploadInProgress);
  const activeReturn = useMemo(
    () => order?.revisionRequests?.find((item) => item.status === 'open' || item.status === 'submitted_for_review'),
    [order],
  );
  const currentDraft = order?.draftVersions?.find((item) => item.versionNumber === order.currentDraftVersion);
  const canEdit = ['designer', 'admin'].includes(staffUser?.role);
  const canUploadDraft = canEdit && ['assigned', 'in_design', 'revision_requested'].includes(order?.status);
  const canPreparePrint = canEdit && order?.approvedVersionNumber && ['client_approved', 'print_document_prep'].includes(order?.status);
  const [tab, setTab] = useState(null);
  const activeTab = tab || (currentDraft ? 'magazine' : 'text');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [focusAnnotation, setFocusAnnotation] = useState(null);
  const readerVersion = order?.draftVersions?.some(draft => draft.versionNumber === selectedVersion) ? selectedVersion : currentDraft?.versionNumber;

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
    let cleanupTimer;
    const openReview = () => {
      if (window.location.pathname !== `/staff/design/orders/${encodeURIComponent(orderId)}` || !new URLSearchParams(window.location.search).has('reviewUpload')) return;
      const saved = savedDraftUpload(staffUser?._id, orderId) || (backgroundUpload?.status === 'ready' ? backgroundUpload.result : null);
      if (!saved?.readyForReview) return;
      setReadyUpload(saved);
      setResume(saved);
      setUploadError('');
      setShowUpload(true);
      // Consume only the review flag after entering this order. This changes no
      // editor content; defer until an enclosing approved navigation has finished.
      clearTimeout(cleanupTimer);
      cleanupTimer = setTimeout(() => {
        if (window.location.pathname !== `/staff/design/orders/${encodeURIComponent(orderId)}`) return;
        const params = new URLSearchParams(window.location.search);
        if (!params.has('reviewUpload')) return;
        params.delete('reviewUpload');
        navigate(`${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`, { replace: true, confirmed: true });
      }, 0);
    };
    openReview();
    window.addEventListener('popstate', openReview);
    return () => { clearTimeout(cleanupTimer); window.removeEventListener('popstate', openReview); };
  }, [orderId, staffUser?._id, backgroundUpload?.status, backgroundUpload?.result]);
  useEffect(() => {
    if (backgroundUpload?.status !== 'complete') return;
    setSuccess(ui('Draft uploaded and sent to manager review. Preparing opening pages.', 'Rasimu imepakiwa na kutumwa kwa ukaguzi wa meneja. Kurasa za mwanzo zinaandaliwa.'));
    load(true);
  }, [backgroundUpload?.id, backgroundUpload?.status, load]);
  const upload = (event) => {
    event.preventDefault();
    if (uploading || uploadInProgress) return;
    if (!file) {
      setUploadError(ui('Select a magazine PDF before continuing.', 'Chagua PDF ya jarida kabla ya kuendelea.'));
      return;
    }
    if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf') || file.size > MAX_DRAFT_BYTES || file.size === 0) {
      setUploadError(ui('Choose a valid PDF up to 500 MB.', 'Chagua PDF halali isiyozidi MB 500.'));
      document.getElementById('draft-pdf')?.focus();
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
      setUploadError(err);
    }
  };
  const submitReviewedDraft = async (confirmedCorrectionIds) => {
    if (uploading || uploadUncertain) return;
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
      setSuccess(ui('Draft uploaded and sent to manager review. Preparing opening pages.', 'Rasimu imepakiwa na kutumwa kwa ukaguzi wa meneja. Kurasa za mwanzo zinaandaliwa.'));
      await load();
    } catch (err) {
      setUploadError(err);
      setUploadUncertain(!err.status || [408, 409].includes(err.status) || err.status >= 500);
    } finally {
      setUploading(false);
    }
  };
  const cancelUpload = async () => {
    if (uploading) return;
    if ((readyUpload || resume || file) && !(await confirm({ title: ui('Cancel this upload?', 'Ghairi upakiaji huu?'), description: ui('This removes the unfinished upload. Your current magazine remains.', 'Hii itaondoa upakiaji ambao haujakamilika. Jarida lako la sasa litabaki.'), confirmLabel: ui('Cancel upload', 'Ghairi upakiaji'), cancelLabel: ui('Keep upload', 'Endelea na upakiaji'), danger: true }))) return;
    try {
      await cancelDraftUpload(token, staffUser?._id, orderId);
      if (backgroundUpload) draftUploads.dismiss(backgroundUpload.id);
      setResume(null);
      setReadyUpload(null);
      setFile(null);
      setNotes('');
      setUploadUncertain(false);
      setShowUpload(false);
    } catch (err) {
      setUploadError(err);
    }
  };
  const uploadPrint = async (event) => {
    event.preventDefault();
    if (uploading || printUncertain) return;
    const invalid = {};
    if (printFile && (!/\.pdf$/i.test(printFile.name) || (printFile.type && printFile.type !== 'application/pdf') || printFile.size > MAX_PRINT_BYTES || !printFile.size)) invalid.pdf = ui('Choose a valid PDF up to 4 MB, or use the approved magazine for print.', 'Chagua PDF halali isiyozidi MB 4, au tumia jarida lililoidhinishwa kwa uchapishaji.');
    if (!Number.isInteger(Number(printSpecs.quantity)) || Number(printSpecs.quantity) < 1) invalid.quantity = ui('Enter a whole-number quantity of at least one.', 'Weka idadi kamili ya angalau moja.');
    for (const field of ['paperType', 'coverFinish', 'binding']) if (!printSpecs[field].trim()) invalid[field] = ui('Complete this print specification.', 'Jaza maelezo haya ya uchapishaji.');
    setPrintErrors(invalid);
    if (Object.keys(invalid).length) {
      setPrintValidation(ui('Correct the highlighted details before sending.', 'Sahihisha maelezo yaliyoonyeshwa kabla ya kutuma.'));
      document.getElementById(`print-${Object.keys(invalid)[0]}`)?.focus();
      return;
    }
    setPrintValidation('');
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
      setPrintDirty(false);
      setSuccess(ui('Print-ready PDF sent for manager authorization.', 'PDF ya uchapishaji imetumwa kwa idhini ya meneja.'));
      await load();
    } catch (err) {
      setError(err);
      setPrintUncertain(!err.status || [408, 409].includes(err.status) || err.status >= 500);
    } finally {
      setUploading(false);
    }
  };
  const downloadImages = async () => {
    if (downloadingImages || !order.uploadedPhotos?.length) return;
    setDownloadingImages(true);
    setError('');
    const fallbackName = `${orderSenderName(order, 'Unnamed customer')}.zip`;
    try {
      await runTransfer({ key: `photos:${orderId}`, name: fallbackName, kind: 'download' }, async context => {
        const { url, fileName } = await api.designer.downloadPhotoFolder(token, orderId, null, {
          signal: context.signal,
          onStatus: stage => context.progress({ stage: stage === 'ready' ? 'transferring' : 'preparing', percent: null }),
        });
        // ZIP archives can be very large. The browser streams them to disk without buffering them in app memory.
        context.signal.throwIfAborted();
        const link = document.createElement('a');
        link.href = url; link.download = fileName || fallbackName;
        document.body.appendChild(link); link.click(); link.remove();
        context.progress({ stage: 'handed-off', percent: null });
      });
    } catch (err) {
      setError(err);
    } finally { setDownloadingImages(false); }
  };
  const checkSaved = async (kind) => {
    setCheckingSaved(true);
    try {
      const saved = await load(true);
      if (!saved) return;
      if (kind === 'print') setPrintUncertain(false);
      else {
        setUploadUncertain(false);
        setUploadError(null);
        if (readyUpload?.metadata?.expectedVersion !== undefined && saved.currentDraftVersion !== readyUpload.metadata.expectedVersion) {
          setUploadUncertain(true);
          setUploadError(ui('The magazine version has changed. Check the current version before canceling this unfinished submission.', 'Toleo la jarida limebadilika. Kagua toleo la sasa kabla ya kughairi uwasilishaji huu ambao haujakamilika.'));
        }
      }
    } finally { setCheckingSaved(false); }
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
        <StateError error={error || { status: 404 }} onRetry={() => load()} title={ui('This order could not be opened', 'Oda hii haikuweza kufunguliwa')} />
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
          <OrderCountdownBadge order={order} />
          <p>
            {order.formTitle} ·{' '}
            <span className="designer-status" data-status={order.status}>
              {tx(order.status.replaceAll('_', ' '))}
            </span>
          </p>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primary-button" onClick={openUpload} disabled={!canUploadDraft || Boolean(uploadInProgress)}>
              <UploadCloud size={16} />
              <InterfaceText>Upload new draft</InterfaceText>
            </button>
          </div>
        )}
      </div>
      {error && <StateError compact error={error} onRetry={() => load()} />}
      {success && <StatePanel compact kind="success" title={success} />}
      {loading && <p role="status">{ui('Refreshing order…', 'Tunapakia oda upya…')}</p>}
      {!canEdit && <StatePanel compact kind="info" title={ui('Read-only order', 'Oda ya kusoma tu')} description={ui('You can review this order. Changes are available to its designer and administrators.', 'Unaweza kukagua oda hii. Msanifu wake na wasimamizi ndio wanaoweza kuibadilisha.')} />}
      {!order.assignedDesigner && <StatePanel compact kind="info" title={ui('Designer assignment is pending', 'Mgawo wa msanifu unasubiri')} description={ui('A manager will assign this order to an available designer.', 'Meneja atamgawia msanifu anayepatikana oda hii.')} />}
      {canEdit && !canUploadDraft && <StatePanel compact kind="info" title={ui('New drafts are not needed at this stage', 'Rasimu mpya hazihitajiki katika hatua hii')} description={ui('You can view the magazine and its history. Draft uploads reopen when the order returns to design.', 'Unaweza kuona jarida na historia yake. Upakiaji wa rasimu utafunguliwa tena oda ikirudi kwenye usanifu.')} />}
      <nav className="designer-tabs" role="tablist" onKeyDown={tabListKeys} aria-label={tx('Order sections')}>
        {[
          ['magazine', 'Magazine'],
          ['corrections', 'Corrections'],
          ['text', ui('Text responses', 'Majibu ya maandishi')],
          ['images', ui('Images', 'Picha')],
          ['history', 'Version history'],
        ].map(([id, label]) => (
          <button
            key={id}
            id={`designer-${orderId}-${id}-tab`}
            role="tab"
            tabIndex={activeTab === id ? 0 : -1}
            aria-selected={activeTab === id}
            aria-controls={['text', 'images'].includes(id) ? `designer-${orderId}-${id}-panel` : undefined}
            onClick={() => setTab(id)}
          >
            {tx(label)}
          </button>
        ))}
      </nav>
      <div hidden={activeTab !== 'magazine'}>
        {currentDraft ? (
          <PdfBookReader
            token={token}
            orderId={orderId}
            version={readerVersion}
            title={`Draft version ${readerVersion}`}
            focusAnnotation={readerVersion === selectedVersion ? focusAnnotation : null}
          />
        ) : (
          <StatePanel kind="empty" title={ui('No magazine uploaded yet', 'Bado hakuna jarida lililopakiwa')} description={ui('The first draft will appear here after it has been submitted.', 'Rasimu ya kwanza itaonekana hapa baada ya kuwasilishwa.')}>
            {canUploadDraft && <button className="primary-button" onClick={openUpload} disabled={Boolean(uploadInProgress)}>{ui('Upload first draft', 'Pakia rasimu ya kwanza')}</button>}
          </StatePanel>
        )}
      </div>
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div hidden={tab !== 'corrections'} className="designer-card">
            <h2>
              <InterfaceText>Returns &amp; fixes</InterfaceText>
            </h2>
            {!(order.revisionRequests || []).length ? (
              <StatePanel compact kind="empty" title={ui('No corrections waiting', 'Hakuna marekebisho yanayosubiri')} description={ui('Requests from the manager or client will appear here.', 'Maombi ya meneja au mteja yataonekana hapa.')} />
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
                          {item.annotationId && order.draftVersions?.some(draft => draft.versionNumber === request.draftVersionNumber) && (
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
          <div hidden={activeTab !== 'text'} className="designer-card" role="tabpanel" id={`designer-${orderId}-text-panel`} aria-labelledby={`designer-${orderId}-text-tab`}>
            <h2>{ui('Text responses', 'Majibu ya maandishi')}</h2>
            <OrderAnswersView
              submittedData={order.submittedData}
              submittedFields={order.submittedFields}
              formFields={order.formId?.fields}
              textOnly
              imageFieldIds={(order.uploadedPhotos || []).map(photo => photo.fieldId).filter(Boolean)}
            />
          </div>
          <div hidden={activeTab !== 'images'} className="designer-card" role="tabpanel" id={`designer-${orderId}-images-panel`} aria-labelledby={`designer-${orderId}-images-tab`}>
            <div className="designer-images-heading">
              <div>
                <h2>{ui('Images', 'Picha')}</h2>
                <p>{ui('Download all images in one ZIP, with a folder named after the customer and a subfolder for each image question.', 'Pakua picha zote katika ZIP moja, yenye folda ya jina la mteja na folda ndogo kwa kila swali la picha.')}</p>
              </div>
              <ActionButton className="secondary-button" loading={downloadingImages} disabled={downloadingImages || !order.uploadedPhotos?.length} onClick={downloadImages}>
                <Download size={16} aria-hidden="true" />
                {downloadingImages ? ui('Preparing ZIP…', 'Inaandaa ZIP…') : ui('Download all images ZIP', 'Pakua picha zote kama ZIP')}
              </ActionButton>
            </div>
            <OrderPhotosFolderView uploadedPhotos={order.uploadedPhotos} submittedFields={order.submittedFields} formFields={order.formId?.fields} groupByQuestion />
          </div>
          <div hidden={tab !== 'history'} className="designer-card">
            <h2>
              {ui('Current magazine', 'Jarida la sasa')}
            </h2>
            <p className="muted">{ui('Only the latest submitted magazine is kept. Correction notes remain available under Returns & fixes.', 'Jarida la mwisho lililowasilishwa pekee ndilo linalohifadhiwa. Maelezo ya marekebisho yanabaki kwenye sehemu ya marekebisho.')}</p>
            {!order.draftVersions?.length && <StatePanel compact kind="empty" title={ui('No versions submitted yet', 'Bado hakuna matoleo yaliyowasilishwa')} description={ui('Submitted magazine versions will appear here.', 'Matoleo ya jarida yaliyowasilishwa yataonekana hapa.')} />}
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
          <div hidden={activeTab !== 'magazine'} className="designer-card">
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
            {canEdit && !order.approvedVersionNumber && <StatePanel compact kind="info" title={ui('Waiting for client approval', 'Tunasubiri idhini ya mteja')} description={ui('Print preparation becomes available after the client approves a magazine version.', 'Maandalizi ya uchapishaji yatapatikana mteja akiidhinisha toleo la jarida.')} />}
            {printUncertain && <StatePanel compact kind="warning" title={ui('The print submission is unconfirmed', 'Uwasilishaji wa uchapishaji haujathibitishwa')} description={ui('Check the saved order before sending the file again.', 'Kagua oda iliyohifadhiwa kabla ya kutuma faili tena.')}>
              <ActionButton loading={checkingSaved} disabled={checkingSaved} onClick={() => checkSaved('print')}>{ui('Check saved order', 'Kagua oda iliyohifadhiwa')}</ActionButton>
            </StatePanel>}
            {canPreparePrint && !order.printDocument?.uploadedAt && (
              <form className="print-upload" onSubmit={uploadPrint} noValidate>
                {printValidation && <StatePanel compact kind="error" title={ui("Check the print details", "Kagua maelezo ya uchapishaji")} description={printValidation} />}
                <label htmlFor="print-pdf">
                  <InterfaceText>Print-ready PDF (leave empty to promote approved draft v</InterfaceText>{' '}
                  {order.approvedVersionNumber})
                </label>
                <p className="muted">{ui('Optional replacement PDF, up to 4 MB. Leave it empty to use the approved magazine.', 'PDF mbadala ya hiari, isiyozidi MB 4. Acha wazi kutumia jarida lililoidhinishwa.')}</p>
                <input
                  id="print-pdf"
                  aria-invalid={Boolean(printErrors.pdf)}
                  aria-describedby={printErrors.pdf ? 'print-pdf-error' : undefined}
                  disabled={uploading || printUncertain}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setPrintFile(e.target.files?.[0] || null)}
                />
                {printErrors.pdf && <p id="print-pdf-error" role="alert">{printErrors.pdf}</p>}
                <div className="print-specs">
                  <label>
                    <InterfaceText>Quantity</InterfaceText>
                    <input
                      id="print-quantity"
                      type="number"
                      min="1"
                      step="1"
                      aria-invalid={Boolean(printErrors.quantity)}
                      aria-describedby={printErrors.quantity ? 'print-quantity-error' : undefined}
                      value={printSpecs.quantity}
                      onChange={(e) => { setPrintDirty(true); setPrintSpecs({ ...printSpecs, quantity: e.target.value }); }}
                    />
                    {printErrors.quantity && <span id="print-quantity-error" role="alert">{printErrors.quantity}</span>}
                  </label>
                  <label>
                    <InterfaceText>Paper</InterfaceText>
                    <input
                      id="print-paperType"
                      aria-invalid={Boolean(printErrors.paperType)}
                      aria-describedby={printErrors.paperType ? 'print-paperType-error' : undefined}
                      value={printSpecs.paperType}
                      onChange={(e) => { setPrintDirty(true); setPrintSpecs({ ...printSpecs, paperType: e.target.value }); }}
                    />
                    {printErrors.paperType && <span id="print-paperType-error" role="alert">{printErrors.paperType}</span>}
                  </label>
                  <label>
                    <InterfaceText>Finish</InterfaceText>
                    <input
                      id="print-coverFinish"
                      aria-invalid={Boolean(printErrors.coverFinish)}
                      aria-describedby={printErrors.coverFinish ? 'print-coverFinish-error' : undefined}
                      value={printSpecs.coverFinish}
                      onChange={(e) => { setPrintDirty(true); setPrintSpecs({ ...printSpecs, coverFinish: e.target.value }); }}
                    />
                    {printErrors.coverFinish && <span id="print-coverFinish-error" role="alert">{printErrors.coverFinish}</span>}
                  </label>
                  <label>
                    <InterfaceText>Binding</InterfaceText>
                    <input
                      id="print-binding"
                      aria-invalid={Boolean(printErrors.binding)}
                      aria-describedby={printErrors.binding ? 'print-binding-error' : undefined}
                      value={printSpecs.binding}
                      onChange={(e) => { setPrintDirty(true); setPrintSpecs({ ...printSpecs, binding: e.target.value }); }}
                    />
                    {printErrors.binding && <span id="print-binding-error" role="alert">{printErrors.binding}</span>}
                  </label>
                </div>
                <ActionButton loading={uploading} className="primary-button" disabled={uploading || printUncertain}>
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
              <StatePanel compact kind="empty" title={ui('No recorded activity yet', 'Bado hakuna shughuli zilizorekodiwa')} description={ui('Changes to this order will appear here.', 'Mabadiliko ya oda hii yataonekana hapa.')} />
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
              upload={readyUpload} submitting={uploading} error={uploadError} uncertain={uploadUncertain} checkingSaved={checkingSaved} onCheckSaved={() => checkSaved('upload')}
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
            {currentDraft && <p>{ui('After you successfully submit this PDF, it will replace the previous magazine and its previews.', 'Baada ya kuwasilisha PDF hii kwa mafanikio, itachukua nafasi ya jarida la awali na hakikisho zake.')}</p>}
            {resume && !uploading && (
              <StatePanel compact kind="info" title={ui('An unfinished upload is available', 'Kuna upakiaji ambao haujakamilika')} description={ui(`Select the same PDF (${resume.name}) to resume. If its saved session has expired, the upload will restart.`, `Chagua PDF ileile (${resume.name}) kuendelea. Ikiwa muda wa kipindi chake umeisha, upakiaji utaanza upya.`)} />
            )}
            {uploadError && (
              <StateError compact error={uploadError} description={typeof uploadError === 'string' ? uploadError : undefined} />
            )}
            <label htmlFor="draft-pdf">
              <InterfaceText>Magazine PDF · up to 500 MB</InterfaceText>
            </label>
            <input
              id="draft-pdf"
              aria-invalid={Boolean(uploadError)}
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
