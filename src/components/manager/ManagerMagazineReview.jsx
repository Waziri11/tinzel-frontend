import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { api } from '../../services/api';
import PdfBookReader from '../common/PdfBookReader';
import './managerMagazineReview.css';
function Confirmation({
  action,
  notes,
  annotations,
  busy,
  onCancel,
  onConfirm,
  t,
}) {
  const approve = action === 'release_to_client';
  useDialogFocus(true, () => {
    if (!busy) onCancel();
  });
  return (
    <div
      className="manager-proof-confirm-backdrop"
      onClick={(e) => e.stopPropagation()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={
          approve
            ? t('Confirm approval', 'Thibitisha idhini')
            : t('Confirm return', 'Thibitisha kurudisha')
        }
        className="manager-proof-confirmation"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            if (!busy) onCancel();
          }
        }}
      >
        <h2>
          {approve
            ? t(
                'Release this magazine to the client?',
                'Tuma jarida hili kwa mteja?',
              )
            : t(
                'Return this magazine to the designer?',
                'Rudisha jarida hili kwa msanifu?',
              )}
        </h2>
        <p>
          {approve
            ? t(
                'The client will be able to review this complete version.',
                'Mteja ataweza kukagua toleo hili kamili.',
              )
            : t(
                'The designer will receive these corrections as a checklist.',
                'Msanifu atapokea marekebisho haya kama orodha ya kazi.',
              )}
        </p>
        {!approve && (
          <ol>
            {annotations.map((a, i) => (
              <li key={a._id || i}>
                <strong>
                  {t('Page', 'Ukurasa')} {a.page}
                </strong>
                : {a.text}
              </li>
            ))}
            {notes.trim() && (
              <li>
                <strong>{t('General notes', 'Maelezo ya jumla')}</strong>:{' '}
                {notes.trim()}
              </li>
            )}
          </ol>
        )}
        <div className="manager-proof-buttons">
          <button type="button" onClick={onCancel} disabled={busy}>
            {t('Cancel', 'Ghairi')}
          </button>
          <button
            type="button"
            className="is-primary"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy
              ? t('Saving decision…', 'Inahifadhi uamuzi…')
              : approve
                ? t(
                    'Approve and release to client',
                    'Idhinisha na tuma kwa mteja',
                  )
                : t('Return to designer', 'Rudisha kwa msanifu')}
          </button>
        </div>
      </section>
    </div>
  );
}
export default function ManagerMagazineReview({
  token,
  order,
  version,
  onReviewed,
  onReload,
  registerGuard,
}) {
  const { lang } = useLanguage(),
    t = (en, sw) => (lang === 'sw' ? sw : en);
  const [notes, setNotes] = useState(''),
    [state, setState] = useState({
      pendingAnnotations: [],
      saving: false,
      composing: false,
      ready: false,
      canComment: false,
    }),
    [decision, setDecision] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [reloadRequired, setReloadRequired] = useState(false);
  const requestLock = useRef(false),
    completed = useRef(false);
  const eligible =
    order.status === 'draft_manager_review' &&
    version === order.currentDraftVersion;
  const dirty = Boolean(notes.trim() || state.composing);
  const allowLeave = useCallback(() => {
    if (completed.current) return true;
    if (requestLock.current || state.saving) return false;
    return (
      !dirty ||
      window.confirm(
        t(
          'Discard unsent general notes or the unfinished comment? Saved page corrections will remain.',
          'Ondoa maelezo ambayo hayajatumwa au maoni ambayo hayajakamilika? Marekebisho ya kurasa yaliyohifadhiwa yatabaki.',
        ),
      )
    );
  }, [dirty, state.saving, lang]);
  useEffect(() => {
    registerGuard?.(allowLeave);
    return () => registerGuard?.(null);
  }, [allowLeave, registerGuard]);
  useEffect(() => {
    const navigate = (event) => {
      if (!allowLeave()) event.preventDefault();
    };
    const unload = (event) => {
      if (dirty || state.saving || requestLock.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('tinzel:before-navigate', navigate);
    window.addEventListener('beforeunload', unload);
    return () => {
      window.removeEventListener('tinzel:before-navigate', navigate);
      window.removeEventListener('beforeunload', unload);
    };
  }, [allowLeave, dirty, state.saving]);
  const decide = async () => {
    if (
      requestLock.current ||
      state.saving ||
      state.composing ||
      !eligible ||
      reloadRequired
    )
      return;
    if (decision === 'release_to_client' && state.pendingAnnotations.length) {
      setError(
        t(
          'Return or discard the saved corrections before approval.',
          'Rudisha au ondoa marekebisho yaliyohifadhiwa kabla ya kuidhinisha.',
        ),
      );
      setDecision(null);
      return;
    }
    if (
      decision === 'return_to_designer' &&
      !state.pendingAnnotations.length &&
      !notes.trim()
    )
      return;
    requestLock.current = true;
    setBusy(true);
    setError('');
    try {
      await api.manager.reviewDraft(token, order._id, {
        action: decision,
        feedback: notes.trim(),
        expectedVersion: version,
      });
      completed.current = true;
      setNotes('');
      setDecision(null);
      registerGuard?.(null);
      if (document.fullscreenElement)
        await document.exitFullscreen?.().catch(() => {});
      await onReviewed?.(
        decision === 'release_to_client'
          ? t(
              'Magazine approved and released to client',
              'Jarida limeidhinishwa na kutumwa kwa mteja',
            )
          : t(
              'Magazine returned to designer',
              'Jarida limerudishwa kwa msanifu',
            ),
      );
    } catch (e) {
      setDecision(null);
      setError(
        e.message ||
          t(
            'Unable to save the decision. Your corrections and notes remain.',
            'Imeshindikana kuhifadhi uamuzi. Marekebisho na maelezo yako yamebaki.',
          ),
      );
      if (
        [409, 400].includes(e.status) ||
        e.name === 'TimeoutError' ||
        e.status >= 500
      ) {
        setReloadRequired(true);
      }
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  };
  const controls = (reader) => (
    <>
      <section
        className="manager-proof-controls"
        aria-label={t(
          'Manager review decision',
          'Uamuzi wa ukaguzi wa msimamizi',
        )}
      >
        {!eligible ? (
          <p>
            {t(
              'Read-only version. Decisions are available only for the current magazine awaiting manager review.',
              'Toleo la kusoma tu. Uamuzi unaruhusiwa kwa toleo la sasa linalosubiri ukaguzi wa msimamizi.',
            )}
          </p>
        ) : (
          <>
            <label htmlFor={`manager-review-notes-${order._id}-${version}`}>
              {t('General notes', 'Maelezo ya jumla')}
            </label>
            <textarea
              id={`manager-review-notes-${order._id}-${version}`}
              rows={2}
              maxLength={10000}
              placeholder={t(
                'Optional corrections for the whole magazine',
                'Marekebisho ya hiari kwa jarida zima',
              )}
              value={notes}
              disabled={busy}
              onChange={(e) => setNotes(e.target.value)}
            />
            {error && <div role="alert">{error}</div>}
            {reader.composing && (
              <p>
                {t(
                  'Save or cancel the current comment before making a decision.',
                  'Hifadhi au ghairi maoni ya sasa kabla ya kufanya uamuzi.',
                )}
              </p>
            )}
            {reader.pendingAnnotations.length > 0 && (
              <p>
                {t(
                  'Saved corrections must be returned or discarded before approval.',
                  'Marekebisho yaliyohifadhiwa lazima yarudishwe au yaondolewe kabla ya kuidhinisha.',
                )}{' '}
                ({reader.pendingAnnotations.length})
              </p>
            )}
            {reloadRequired ? (
              <div>
                <p>
                  {t(
                    'Reload the current draft to check its saved state before trying again. Your notes remain until you choose to reload.',
                    'Pakia toleo la sasa ili kukagua hali iliyohifadhiwa kabla ya kujaribu tena. Maelezo yako yatabaki hadi uchague kupakia upya.',
                  )}
                </p>
                <button type="button" disabled={busy} onClick={onReload}>
                  {t('Reload current draft', 'Pakia toleo la sasa')}
                </button>
              </div>
            ) : (
              <div className="manager-proof-buttons">
                <button
                  type="button"
                  className="is-primary"
                  disabled={
                    !reader.ready ||
                    !reader.canComment ||
                    reader.saving ||
                    reader.composing ||
                    busy ||
                    reader.pendingAnnotations.length > 0
                  }
                  onClick={() => setDecision('release_to_client')}
                >
                  {t(
                    'Approve and release to client',
                    'Idhinisha na tuma kwa mteja',
                  )}
                </button>
                <button
                  type="button"
                  disabled={
                    !reader.ready ||
                    !reader.canComment ||
                    reader.saving ||
                    reader.composing ||
                    busy ||
                    (!reader.pendingAnnotations.length && !notes.trim())
                  }
                  onClick={() => setDecision('return_to_designer')}
                >
                  {t('Return to designer', 'Rudisha kwa msanifu')}
                </button>
              </div>
            )}
          </>
        )}
      </section>
      {decision && (
        <Confirmation
          action={decision}
          notes={notes}
          annotations={state.pendingAnnotations}
          busy={busy}
          onCancel={() => setDecision(null)}
          onConfirm={decide}
          t={t}
        />
      )}
    </>
  );
  return (
    <PdfBookReader
      token={token}
      orderId={order._id}
      version={version}
      title={`${t('Magazine version', 'Toleo la jarida')} ${version}`}
      hideCommentSubmit
      interactionDisabled={busy || reloadRequired}
      onReviewStateChange={setState}
      renderReviewControls={controls}
    />
  );
}
