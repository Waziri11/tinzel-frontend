import RevisionAudioPlayer from '../common/RevisionAudioPlayer';
import { ActionButton, InlineLoading } from '../common/SoftFlutter';
import React, { lazy, Suspense, useState } from 'react';
import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import StatePanel, { StateError } from '../common/StatePanel';
import { useLanguage } from '../../i18n/LanguageContext';

const PdfBookReader = lazy(() => import('../common/PdfBookReader'));

export default function DraftCorrectionReview({ token, orderId, request, upload, submitting, error, uncertain = false, checkingSaved = false, onCheckSaved, onSubmit, onCancel, onClose }) {
  const tx = useInterfaceText();
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const [index, setIndex] = useState(0);
  const [confirmed, setConfirmed] = useState([]);
  useDialogFocus(true, () => { if (!submitting) onClose(); });
  const items = request?.items || [];
  const item = items[index];
  const currentConfirmed = item && confirmed.includes(item._id);
  const allConfirmed = items.length > 0 && items.every(item => confirmed.includes(item._id));
  const matchingRound = request?._id === upload.metadata?.revisionRequestId;
  return (
    <div className="upload-dialog correction-review-dialog" role="dialog" aria-modal="true" aria-label={tx('Review corrections before submitting')}>
      <h2><InterfaceText>Review corrections before submitting</InterfaceText></h2>
      <p><InterfaceText>Your PDF is uploaded. Confirm each requested correction in your updated file before sending it to the manager.</InterfaceText></p>
      <p className="muted">{upload.name}</p>
      {error && <StateError compact error={error} description={typeof error === 'string' ? error : undefined} />}
      {uncertain && <StatePanel compact kind="warning" title={ui('The submission is unconfirmed', 'Uwasilishaji haujathibitishwa')} description={ui('Check the saved order before sending this version again. Your checklist remains here.', 'Kagua oda iliyohifadhiwa kabla ya kutuma toleo hili tena. Orodha yako bado ipo hapa.')}>
        <ActionButton loading={checkingSaved} disabled={checkingSaved || submitting} onClick={onCheckSaved}>{ui('Check saved order', 'Kagua oda iliyohifadhiwa')}</ActionButton>
      </StatePanel>}
      {matchingRound && !items.length && <StatePanel compact kind="warning" title={ui('No corrections are available in this round', 'Hakuna marekebisho yanayopatikana katika awamu hii')} description={ui('Refresh the order to check whether the correction request has changed.', 'Pakia oda upya kukagua kama ombi la marekebisho limebadilika.')} onRetry={onCheckSaved} />}
      {matchingRound && items.length > 0 && <StatePanel compact kind={allConfirmed ? 'success' : 'info'} title={allConfirmed ? ui('Ready to send for review', 'Iko tayari kutumwa kwa ukaguzi') : ui(`${confirmed.length} of ${items.length} corrections confirmed`, `Marekebisho ${confirmed.length} kati ya ${items.length} yamethibitishwa`)} description={allConfirmed ? ui('Your PDF is uploaded. Send it to the manager to complete this submission.', 'PDF yako imepakiwa. Itume kwa meneja kukamilisha uwasilishaji huu.') : ui('Review each correction in your updated PDF before sending.', 'Kagua kila marekebisho katika PDF yako iliyosasishwa kabla ya kutuma.')} />}
      {!matchingRound ? <StatePanel compact kind="warning" title={ui("The correction round changed", "Awamu ya marekebisho imebadilika")} description={ui("Cancel this unfinished upload, check the latest corrections, then upload the updated magazine.", "Ghairi upakiaji huu ambao haujakamilika, kagua marekebisho mapya, kisha pakia jarida lililosasishwa.")} /> : item ? (
        <section className="correction-preview" aria-label={tx('Correction preview')}>
          <h3 aria-live="polite"><InterfaceText>Correction</InterfaceText> {index + 1} / {items.length}</h3>
          <p className="correction-preview-text">
            {item.pageReference && <strong>{tx('Page')} {item.pageReference}: </strong>}
            {item.text}
          </p>
          <RevisionAudioPlayer key={item._id} token={token} orderId={orderId} requestId={request._id} item={item} />
          {request.draftVersionNumber > 0 && (item.annotationId || /^\d+$/.test(item.pageReference || '')) && (
            <Suspense fallback={<InlineLoading />}>
              <PdfBookReader key={item._id} token={token} orderId={orderId} version={request.draftVersionNumber}
                title={tx('Original correction reference')} focusAnnotation={item.annotationId}
                focusPage={Number(item.pageReference) || undefined} hideCommentSubmit interactionDisabled />
            </Suspense>
          )}
          <label className="verify-check">
            <input type="checkbox" checked={Boolean(currentConfirmed)} disabled={submitting}
              onChange={event => setConfirmed(old => event.target.checked ? [...old, item._id] : old.filter(id => id !== item._id))} />
            <InterfaceText>I reviewed this correction and confirmed it is fixed in my updated PDF</InterfaceText>
          </label>
          <div className="correction-review-navigation">
            <button type="button" className="secondary-button" disabled={submitting || index === 0} onClick={() => setIndex(index - 1)}><InterfaceText>Previous correction</InterfaceText></button>
            {index < items.length - 1 && <button type="button" className="primary-button" disabled={submitting || !currentConfirmed} onClick={() => setIndex(index + 1)}><InterfaceText>Next correction</InterfaceText></button>}
          </div>
        </section>
      ) : null}
      <footer>
        <button type="button" className="secondary-button" disabled={submitting} onClick={onCancel}><InterfaceText>Cancel upload</InterfaceText></button>
        <ActionButton loading={submitting} type="button" className="primary-button" disabled={submitting || uncertain || checkingSaved || !matchingRound || !allConfirmed} onClick={() => onSubmit(confirmed)}>
          {tx(submitting ? 'Submitting…' : 'Send to manager review')}
        </ActionButton>
      </footer>
    </div>
  );
}
