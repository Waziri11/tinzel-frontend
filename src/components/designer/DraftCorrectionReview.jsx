import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import RevisionAudioPlayer from '../common/RevisionAudioPlayer';
import ProofAttachments from '../common/ProofAttachments';
import { ActionButton, InlineLoading } from '../common/SoftFlutter';
import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import StatePanel, { StateError } from '../common/StatePanel';
import { useLanguage } from '../../i18n/LanguageContext';
import { proofApi } from '../../services/api';
import './draftCorrectionReview.css';

const PdfBookReader = lazy(() => import('../common/PdfBookReader'));

export default function DraftCorrectionReview({ token, orderId, request, upload, submitting, error, uncertain = false, checkingSaved = false, onCheckSaved, onSubmit, onCancel, onClose }) {
  const tx = useInterfaceText();
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const [index, setIndex] = useState(0);
  const [confirmed, setConfirmed] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const receiveReviewState = useCallback(state => setAnnotations(state.annotations), []);
  const reader = useMemo(() => proofApi(token, orderId, request?.draftVersionNumber), [token, orderId, request?.draftVersionNumber]);
  useDialogFocus(true, () => { if (!submitting) onClose(); });
  const items = request?.items || [];
  const item = items[index];
  const annotation = annotations.find(annotation => annotation._id === item?.annotationId);
  const currentConfirmed = item && confirmed.includes(item._id);
  const allConfirmed = items.length > 0 && items.every(item => confirmed.includes(item._id));
  const confirmedCount = items.filter(item => confirmed.includes(item._id)).length;
  const matchingRound = request?._id === upload.metadata?.revisionRequestId;
  const hasPreview = request?.draftVersionNumber > 0;
  const hasAlerts = error || uncertain || !matchingRound || !items.length;

  return (
    <div className="correction-review-dialog" role="dialog" aria-modal="true" aria-label={tx('Review corrections before submitting')}>
      <header className="correction-review-header">
        <div className="correction-review-heading">
          <h2>{ui('Review corrections', 'Kagua marekebisho')}</h2>
          <p title={upload.name}>{upload.name}</p>
        </div>
        <span className={`correction-review-progress${allConfirmed ? ' is-complete' : ''}`} role="status">
          {allConfirmed && <Check size={16} aria-hidden="true" />}
          {ui(`${confirmedCount} / ${items.length} confirmed`, `${confirmedCount} / ${items.length} yamethibitishwa`)}
        </span>
        <button type="button" className="correction-review-close" disabled={submitting} onClick={onClose}
          aria-label={ui('Close correction review', 'Funga ukaguzi wa marekebisho')} title={ui('Close correction review', 'Funga ukaguzi wa marekebisho')}>
          <X size={22} aria-hidden="true" />
        </button>
      </header>

      {hasAlerts && <div className="correction-review-alerts">
        {error && <StateError compact error={error} description={typeof error === 'string' ? error : undefined} />}
        {uncertain && <StatePanel compact kind="warning" title={ui('The submission is unconfirmed', 'Uwasilishaji haujathibitishwa')} description={ui('Check the saved order before sending this version again. Your checklist remains here.', 'Kagua oda iliyohifadhiwa kabla ya kutuma toleo hili tena. Orodha yako bado ipo hapa.')}>
          <ActionButton loading={checkingSaved} disabled={checkingSaved || submitting} onClick={onCheckSaved}>{ui('Check saved order', 'Kagua oda iliyohifadhiwa')}</ActionButton>
        </StatePanel>}
        {matchingRound && !items.length && <StatePanel compact kind="warning" title={ui('No corrections are available in this round', 'Hakuna marekebisho yanayopatikana katika awamu hii')} description={ui('Refresh the order to check whether the correction request has changed.', 'Pakia oda upya kukagua kama ombi la marekebisho limebadilika.')} onRetry={onCheckSaved} />}
        {!matchingRound && <StatePanel compact kind="warning" title={ui('The correction round changed', 'Awamu ya marekebisho imebadilika')} description={ui('Cancel this unfinished upload, check the latest corrections, then upload the updated magazine.', 'Ghairi upakiaji huu ambao haujakamilika, kagua marekebisho mapya, kisha pakia jarida lililosasishwa.')} />}
      </div>}

      {matchingRound && item && <div className="correction-review-workspace">
        <section className="correction-review-magazine" aria-label={tx('Correction preview')}>
          {hasPreview ? <Suspense fallback={<InlineLoading />}>
            <PdfBookReader key={item._id} token={token} orderId={orderId} version={request.draftVersionNumber}
              title={ui('Original magazine · correction reference', 'Jarida la awali · rejea ya marekebisho')}
              focusAnnotation={item.annotationId} focusPage={Number(item.pageReference) || undefined}
              onReviewStateChange={receiveReviewState} hideComments hideFullscreen hideCommentSubmit interactionDisabled />
          </Suspense> : <StatePanel compact kind="empty" title={ui('No magazine reference', 'Hakuna jarida la rejea')}
            description={ui('Review the correction alongside your updated PDF.', 'Kagua marekebisho pamoja na PDF yako iliyosasishwa.')} />}
        </section>

        <aside className="correction-review-panel" aria-label={ui('Requested correction', 'Marekebisho yaliyoombwa')}>
          <div className="correction-review-picker">
            <label htmlFor="correction-review-item">{ui('Correction', 'Marekebisho')}</label>
            <select id="correction-review-item" aria-label={ui('Choose correction', 'Chagua marekebisho')} value={index} disabled={submitting}
              onChange={event => setIndex(Number(event.target.value))}>
              {items.map((entry, position) => <option key={entry._id} value={position}>
                {position + 1} / {items.length}{entry.pageReference ? ` · ${tx('Page')} ${entry.pageReference}` : ''}{confirmed.includes(entry._id) ? ' ✓' : ''}
              </option>)}
            </select>
          </div>
          <div className="correction-review-details" key={item._id}>
            <h3>{item.pageReference ? `${tx('Page')} ${item.pageReference}` : ui('Magazine correction', 'Marekebisho ya jarida')}</h3>
            <p className="correction-review-note">{item.text}</p>
            {annotation?.selectedText && <blockquote>{annotation.selectedText}</blockquote>}
            {item.audio?.assetId && <RevisionAudioPlayer token={token} orderId={orderId} requestId={request._id} item={item} />}
            <ProofAttachments attachments={annotation?.attachments} reader={reader} canDownload />
          </div>
          <div className="correction-review-actions">
            <label className={`correction-review-confirm${currentConfirmed ? ' is-confirmed' : ''}`}>
              <input type="checkbox" checked={Boolean(currentConfirmed)} disabled={submitting}
                aria-label={tx('I reviewed this correction and confirmed it is fixed in my updated PDF')}
                onChange={event => setConfirmed(old => event.target.checked ? [...new Set([...old, item._id])] : old.filter(id => id !== item._id))} />
              <span>{ui('Fixed in my updated PDF', 'Imerekebishwa katika PDF yangu mpya')}</span>
            </label>
            <div className="correction-review-navigation">
              <button type="button" className="secondary-button" aria-label={tx('Previous correction')} disabled={submitting || index === 0} onClick={() => setIndex(index - 1)}>
                <ChevronLeft size={17} aria-hidden="true" />{ui('Previous', 'Iliyotangulia')}
              </button>
              {index < items.length - 1 ? <button type="button" className="primary-button" aria-label={tx('Next correction')} disabled={submitting || !currentConfirmed} onClick={() => setIndex(index + 1)}>
                {ui('Next correction', 'Marekebisho yanayofuata')}<ChevronRight size={17} aria-hidden="true" />
              </button> : !allConfirmed && <button type="button" className="secondary-button" disabled={submitting} onClick={() => setIndex(items.findIndex(entry => !confirmed.includes(entry._id)))}>
                {ui('Next unchecked', 'Yasiyothibitishwa')}
              </button>}
            </div>
          </div>
        </aside>
      </div>}

      <footer className="correction-review-footer">
        <button type="button" className="secondary-button" disabled={submitting} onClick={onCancel}><InterfaceText>Cancel upload</InterfaceText></button>
        <ActionButton loading={submitting} type="button" className="primary-button" disabled={submitting || uncertain || checkingSaved || !matchingRound || !allConfirmed} onClick={() => onSubmit(confirmed)}>
          {tx(submitting ? 'Submitting…' : 'Send to manager review')}
        </ActionButton>
      </footer>
    </div>
  );
}
