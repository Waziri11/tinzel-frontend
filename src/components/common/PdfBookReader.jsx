import StatePanel, { StateError } from './StatePanel';
import { useConfirm } from './ConfirmDialog';
import { useLanguage } from '../../i18n/LanguageContext';
import SoftFlutter, { ActionButton } from './SoftFlutter';
import { useProofAttachments } from '../../hooks/useProofAttachments';
import { AttachmentEditor } from './ProofAttachments';
import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import { createProofPageCache, proofWindow } from '../../utils/proofPageCache';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { proofApi } from '../../services/api';
import './pdfBookReader.css';
import Page from './ProofPage';
import ProofComments from './ProofComments';
import ProofMobilePanel from './ProofMobilePanel';
import ReviewChatComposer from './ReviewChatComposer';
import BookStage, { PAPER_TURN_MS } from './BookStage';
import { createPortal } from 'react-dom';
import {
  Maximize,
  Minimize,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Square,
  Minus,
  Plus,
  ClipboardCheck,
} from 'lucide-react';

const MOBILE_QUERY = '(max-width:760px), (hover:none) and (pointer:coarse)';
export default function PdfBookReader({
  token,
  orderId,
  version,
  client = false,
  title = 'Magazine proof',
  onReviewed,
  focusAnnotation,
  focusPage,
  renderReviewControls,
  onReviewStateChange,
  hideCommentSubmit = false,
  interactionDisabled = false,
  canDownloadAttachments = false,
}) {
  const tx = useInterfaceText();
  const confirmLeave = useConfirm();
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const [openingError, setOpeningError] = useState(null);
  const [slowOpening, setSlowOpening] = useState(false);
  const reader = useMemo(() => proofApi(token, orderId, version, client), [token, orderId, version, client]);
  const uploads = useProofAttachments(reader);
  const [cache, setCache] = useState(null);
  const [opened, setOpened] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const root = useRef(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [mobile, setMobile] = useState(window.matchMedia(MOBILE_QUERY).matches);
  const [singlePreference, setSinglePreference] = useState(false);
  const single = mobile || singlePreference;
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false),
    [turn, setTurn] = useState(null),
    [navigating, setNavigating] = useState(false);
  const navigation = useRef(0),
    turnTimer = useRef(null),
    jumpTimer = useRef(null),
    metadataRef = useRef(null),
    busy = useRef(false);
  const [pageInput, setPageInput] = useState('1');
  useEffect(() => setPageInput(String(page)), [page]);
  const reviewGeneration = useRef(0),
    discardLock = useRef(false);
  const [discarding, setDiscarding] = useState(null);
  const annotationRevision = useRef(0),
    saveAttempt = useRef(null),
    draftRef = useRef(null),
    commentInput = useRef(null);
  const rememberMetadata = (data) => {
    metadataRef.current = data;
    setMetadata(data);
  };
  const readReview = async (load) => {
    const revision = annotationRevision.current,
      data = await load();
    return revision === annotationRevision.current
      ? data
      : { ...data, annotations: metadataRef.current?.annotations || data.annotations };
  };
  const readMetadata = () => readReview(() => reader.metadata());
  const preparePages = (pages) => readReview(() => reader.prepare(pages));
  const pagesAt = (number) => [
    number,
    ...(!single && number > 1 && number < metadataRef.current?.pageCount ? [number + 1] : []),
  ];
  const [mode, setMode] = useState('read');
  const [selection, setSelection] = useState(null);
  const [comment, setComment] = useState('');
  const [replacement, setReplacement] = useState(null),
    [focusSerial, setFocusSerial] = useState(0);
  const select = useCallback((value) => {
    if (draftRef.current?.saving) {
      setError('Wait for the current comment to finish saving.');
      return;
    }
    if (draftRef.current?.selection && (draftRef.current.comment.trim() || draftRef.current.hasAttachments)) {
      setReplacement(value);
      return;
    }
    setSelection(value);
    setComment('');
  }, []);
  const useArea = useCallback(() => setMode('area'), []);
  const focus = useCallback((id) => {
    setFocused(id);
    setFocusSerial((n) => n + 1);
    setShowComments(true);
  }, []);
  const [saving, setSaving] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [sync, setSync] = useState('');
  const [focused, setFocused] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [showReview, setShowReview] = useState(false);
  draftRef.current = { selection, comment, saving: saving || audioBusy, hasAttachments: uploads.items.length > 0 };
  useEffect(() => {
    if (selection) commentInput.current?.focus({ preventScroll: true });
  }, [selection]);
  useEffect(() => {
    // Manager review owns the combined notes/comment guard. Other readers need
    // the same protection for attachment-only drafts and in-flight saves.
    if (renderReviewControls && !client) return;
    const unload = event => {
      if (draftRef.current?.selection || draftRef.current?.saving) { event.preventDefault(); event.returnValue = ''; }
    };
    const navigate = event => {
      if (draftRef.current?.saving) { event.preventDefault(); return; }
      if (draftRef.current?.selection) event.detail?.waitUntil?.(confirmLeave({ title: ui('Discard the unfinished comment?', 'Uache maoni ambayo hayajakamilika?'), description: ui('Saved comments will remain. This unfinished comment will be removed.', 'Maoni yaliyohifadhiwa yatabaki. Maoni haya ambayo hayajakamilika yataondolewa.'), confirmLabel: ui('Discard comment', 'Acha maoni'), cancelLabel: ui('Keep writing', 'Endelea kuandika'), danger: true }));
    };
    window.addEventListener('beforeunload', unload);
    window.addEventListener('tinzel:before-navigate', navigate);
    return () => { window.removeEventListener('beforeunload', unload); window.removeEventListener('tinzel:before-navigate', navigate); };
  }, [renderReviewControls, client, tx, confirmLeave, lang]);

  useEffect(() => {
    if (!focused || turn || navigating) return;
    const pin = Array.from(root.current?.querySelectorAll('[data-comment-id]') || []).find(
      (el) => el.dataset.commentId === focused,
    );
    pin?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [focused, focusSerial, page, turn, navigating, showComments]);
  useEffect(() => {
    if (!mobile || !selection || !window.visualViewport) return;
    const viewport = window.visualViewport,
      element = root.current;
    const fit = () => {
      element.style.setProperty(
        '--proof-keyboard-offset',
        `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`,
      );
      element.style.setProperty('--proof-visible-height', `${viewport.height}px`);
    };
    viewport.addEventListener('resize', fit);
    viewport.addEventListener('scroll', fit);
    fit();
    return () => {
      viewport.removeEventListener('resize', fit);
      viewport.removeEventListener('scroll', fit);
      element.style.removeProperty('--proof-keyboard-offset');
      element.style.removeProperty('--proof-visible-height');
    };
  }, [mobile, selection, expanded]);
  useLayoutEffect(() => {
    if (expanded) return;
    const element = root.current;
    const fit = () => {
      const rect = element.getBoundingClientRect();
      if (!rect.width) return;
      const value = `${Math.min(820, Math.max(320, window.innerHeight - Math.max(12, rect.top) - 12))}px`;
      if (element.style.getPropertyValue('--reader-height') !== value)
        element.style.setProperty('--reader-height', value);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    window.addEventListener('resize', fit);
    fit();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [expanded]);
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const change = () => setMobile(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    let active = true,
      timer;
    const localCache = createProofPageCache(reader);
    setCache(localCache);
    reviewGeneration.current++;
    discardLock.current = false;
    setDiscarding(null);
    setSaving(false);
    annotationRevision.current = 0;
    saveAttempt.current = null;
    metadataRef.current = null;
    setMetadata(null);
    setOpened(false);
    setTurn(null);
    busy.current = false;
    setNavigating(false);
    setShowComments(false);
    setFocused(null);
    setReplacement(null);
    setPage(1);
    setSelection(null);
    uploads.clear(true);
    setComment('');
    setError('');
    setOpeningError(null);
    setSlowOpening(false);
    setSync('');
    // Both endpoints authenticate independently. Start the cover while metadata is in flight.
    let openingCover = localCache.get(1).then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    const load = async () => {
      try {
        let data = await readMetadata();
        if (!active) return;
        rememberMetadata(data);
        const cover = data.pages?.some((p) => p.page === 1);
        if (!cover) {
          const diagnostic = data.diagnostics?.find((d) => d.page === 0 || d.page === 1);
          if (data.state === 'failed' || diagnostic)
            throw new Error(
              (diagnostic?.message || data.message || 'Cover preparation failed') +
                (diagnostic?.reference ? ` Reference: ${diagnostic.reference}` : ''),
            );
          data = await preparePages([1]);
          if (!active) return;
          rememberMetadata(data);
        }
        if (data.pages?.some((p) => p.page === 1)) {
          const first = openingCover ? await openingCover : null;
          openingCover = null;
          if (!first?.value) await localCache.get(1);
          if (!active) return;
          setOpened(true);
          return;
        }
        timer = setTimeout(load, 1000);
      } catch (e) {
        if (active) { setError(e.message); setOpeningError(e); }
      }
    };
    load();
    return () => {
      active = false;
      navigation.current++;
      busy.current = false;
      clearTimeout(timer);
      clearTimeout(turnTimer.current);
      clearTimeout(jumpTimer.current);
      localCache.dispose();
    };
  }, [reader, refresh]);
  useEffect(() => {
    if (opened) return;
    const timer = setTimeout(() => setSlowOpening(true), 15000);
    return () => clearTimeout(timer);
  }, [opened, reader, refresh]);
  useEffect(() => {
    if (!opened || !metadata?.pageCount || !cache) return;
    let active = true,
      timer,
      prepared = false;
    const { visible, desired } = proofWindow(page, metadata.pageCount, single);
    const load = async () => {
      try {
        let data = metadataRef.current;
        const ready = new Set(data.pages.map((p) => p.page)),
          failed = new Set((data.diagnostics || []).map((d) => d.page));
        const missing = desired.filter((n) => !ready.has(n) && !failed.has(n));
        if (missing.length) {
          if (!prepared) {
            prepared = true;
            data = await preparePages([missing[0], missing.at(-1)].filter((n, i, a) => a.indexOf(n) === i));
          } else data = await readMetadata();
          if (!active) return;
          rememberMetadata(data);
        }
        const available = new Set(data.pages.map((p) => p.page));
        for (const number of desired)
          if (available.has(number))
            cache.get(number, { priority: visible.includes(number) ? 100 : 0 }).catch(() => {});
        if (desired.some((n) => !available.has(n) && !(data.diagnostics || []).some((d) => d.page === n)))
          timer = setTimeout(load, 2000);
      } catch (e) {
        if (active) setError(e.message);
      }
    };
    load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [reader, cache, opened, page, single, metadata?.pageCount]);
  useEffect(() => {
    if (!cache || !opened || !metadata?.pageCount) return;
    const { visible, desired } = proofWindow(page, metadata.pageCount, single);
    cache.setVisible([...visible, ...(turn?.oldPages || [])], { retain: desired });
  }, [cache, opened, page, single, metadata?.pageCount, turn]);
  useEffect(() => {
    if (!expanded) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root.current.focus({ preventScroll: true });
    // A native file picker may exit browser fullscreen. Keep the expanded
    // reader mounted until the user closes it, so file inputs retain selection.
    root.current.requestFullscreen?.().catch(() => {});
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [expanded]);
  const toggleFullscreen = () => {
    if (expanded) {
      setExpanded(false);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    } else setExpanded(true);
  };
  const navigate = async (target) => {
    if (!cache || busy.current || target === page || target < 1 || target > metadataRef.current?.pageCount) return;
    const id = ++navigation.current,
      oldPages = pagesAt(page),
      targetPages = pagesAt(target);
    busy.current = true;
    setNavigating(true);
    setError('');
    cache.setVisible([...oldPages, ...targetPages], {
      retain: proofWindow(target, metadataRef.current.pageCount, single).desired,
    });
    try {
      const load = () => Promise.all(targetPages.map((number) => cache.get(number)));
      try {
        await load();
      } catch (e) {
        if (!e.pending) throw e;
        let data = await preparePages(targetPages);
        if (id !== navigation.current) return;
        rememberMetadata(data);
        for (let attempt = 0; !targetPages.every((n) => data.pages.some((p) => p.page === n)); attempt++) {
          const failure = data.diagnostics?.find((d) => targetPages.includes(d.page));
          if (failure) throw new Error(`${failure.message} Reference: ${failure.reference}`);
          if (attempt >= 90) throw new Error('These pages are still being prepared. Please try again shortly.');
          await new Promise((resolve) => setTimeout(resolve, 1500));
          if (id !== navigation.current) return;
          data = await readMetadata();
          if (id !== navigation.current) return;
          rememberMetadata(data);
        }
        await load();
      }
      if (id !== navigation.current) return;
      const direction = target > page ? 'forward' : 'backward',
        front = cache.peek(direction === 'forward' ? oldPages.at(-1) : oldPages[0]),
        back = cache.peek(direction === 'forward' ? targetPages[0] : targetPages.at(-1));
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced) {
        setTurn({
          direction,
          front,
          back,
          oldPages,
          fromCover: page === 1,
          toCover: target === 1,
          stationary:
            !single && oldPages.length === 2 ? cache.peek(direction === 'forward' ? oldPages[0] : oldPages[1]) : null,
        });
      }
      setPage(target);
      setNavigating(false);
      if (reduced) busy.current = false;
      else
        turnTimer.current = setTimeout(() => {
          setTurn(null);
          busy.current = false;
        }, PAPER_TURN_MS + 20);
    } catch (e) {
      if (id === navigation.current) {
        setError(e.message);
        setNavigating(false);
        busy.current = false;
        cache.setVisible(pagesAt(page), { retain: proofWindow(page, metadataRef.current.pageCount, single).desired });
      }
    }
  };
  useEffect(() => {
    if (!opened) return;
    if (metadata && focusPage && !focusAnnotation) {
      const target = Math.min(metadata.pageCount, Math.max(1, Number(focusPage) || 1));
      navigate(single || target === 1 ? target : target % 2 === 0 ? target : target - 1);
    }
    if (focusAnnotation && metadata) {
      const a = metadata.annotations.find((a) => a._id === focusAnnotation);
      if (a) {
        navigate(single || a.page === 1 ? a.page : a.page % 2 === 0 ? a.page : a.page - 1);
        setFocused(a._id);
        setShowComments(true);
      }
    }
  }, [focusAnnotation, focusPage, metadata, single, opened]);
  useEffect(() => {
    if (!single) setPage((p) => (p > 1 && p % 2 === 1 ? p - 1 : p));
  }, [single]);
  const annotations = (metadata?.annotations || []).map((a, i) => ({ ...a, displayNumber: i + 1 }));
  const pending = annotations.filter((a) => !a.submittedAt);
  const next = () => navigate(Math.min(metadata.pageCount, page === 1 || single ? page + 1 : page + 2));
  const previous = () => navigate(Math.max(1, single ? page - 1 : page === 2 ? 1 : page - 2));
  const reviewState = {
    mobile,
    reviewPanelOpen: showReview,
    onCloseReview: () => setShowReview(false),
    onFinishReview: () => {
      setShowReview(false);
      setShowComments(false);
      setExpanded(false);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    },
    ready: opened,
    canComment: Boolean(metadata?.canComment),
    pendingAnnotations: pending,
    saving: saving || audioBusy || Boolean(discarding),
    composing: Boolean(selection),
  };
  useEffect(() => {
    onReviewStateChange?.({mobile,reviewPanelOpen:showReview,ready:opened,canComment:Boolean(metadata?.canComment),pendingAnnotations:(metadata?.annotations||[]).filter(a=>!a.submittedAt),saving:saving||audioBusy||Boolean(discarding),composing:Boolean(selection)});
  }, [mobile, showReview, opened, metadata, saving, audioBusy, discarding, selection, onReviewStateChange]);
  const save = async (e) => {
    e.preventDefault();
    if (!selection || (!comment.trim() && !uploads.items.length) || !uploads.ready || saving || audioBusy || interactionDisabled) return;
    const { anchor, ...fields } = selection;
    const generation = reviewGeneration.current,
      submitted = { selection, comment },
      body = { ...fields, text: comment.trim(), attachmentIds: uploads.ids },
      key = JSON.stringify(body);
    if (saveAttempt.current?.key !== key) saveAttempt.current = { key, id: crypto.randomUUID() };
    const saveAttemptId = saveAttempt.current.id;
    setSaving(true);
    setSync('Saving…');
    setError('');
    try {
      const data = await reader.save({ ...body, clientMutationId: saveAttempt.current.id });
      if (generation !== reviewGeneration.current) return;
      annotationRevision.current++;
      uploads.clear();
      rememberMetadata({ ...metadataRef.current, annotations: data.annotations });
      if (draftRef.current.selection === submitted.selection && draftRef.current.comment === submitted.comment) {
        setSelection(replacement || null);
        setReplacement(null);
        setComment('');
        saveAttempt.current = null;
        setSync('Saved');
        if (!replacement) {
          setShowComments(true);
          const added = data.annotations.find((a) => a.clientMutationId === saveAttemptId) || data.annotations.at(-1);
          if (added) setFocused(added._id);
        }
      } else setSync('Saved earlier comment — your current draft is still here');
    } catch (e) {
      if (generation === reviewGeneration.current) {
        setError(e.message);
        setSync('Save failed — retry');
      }
    } finally {
      if (generation === reviewGeneration.current) setSaving(false);
    }
  };
  const discard = async (id) => {
    if (discardLock.current) return;
    const generation = reviewGeneration.current;
    discardLock.current = true;
    setDiscarding(id);
    setError('');
    try {
      const data = await reader.discard(id);
      if (generation !== reviewGeneration.current) return;
      annotationRevision.current++;
      rememberMetadata({ ...metadataRef.current, annotations: data.annotations });
      setSync('Saved');
    } catch (e) {
      if (generation === reviewGeneration.current) setError(e.message);
    } finally {
      if (generation === reviewGeneration.current) {
        discardLock.current = false;
        setDiscarding(null);
      }
    }
  };
  const submit = async () => {
    if (selection) {
      setError('Save or cancel the current comment first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await reader.submit();
      const data = await readMetadata();
      rememberMetadata(data);
      setMode('read');
      setSync('Corrections submitted');
      onReviewed?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const jump = (a) => {
    clearTimeout(jumpTimer.current);
    if (busy.current) {
      navigation.current++;
      clearTimeout(turnTimer.current);
      setTurn(null);
      busy.current = false;
    }
    navigate(single || a.page === 1 ? a.page : a.page % 2 === 0 ? a.page : a.page - 1);
    setFocused(a._id);
    setFocusSerial((n) => n + 1);
    setShowComments(true);
  };
  const composerTop = Math.max(16, Math.min((selection?.anchor?.y || 0) + 8, window.innerHeight - 640));
  const comments = (
    <ProofComments
      client={client}
      mobile={mobile}
      reader={reader}
      canDownloadAttachments={canDownloadAttachments}
      annotations={annotations}
      focused={focused}
      focusSerial={focusSerial}
      onJump={annotation => { jump(annotation); if (mobile) setShowComments(false); }}
      onClose={() => setShowComments(false)}
      onDiscard={discard}
      discarding={discarding}
      canComment={Boolean(metadata?.canComment) && !interactionDisabled}
      pending={pending}
      saving={saving}
      onSubmit={hideCommentSubmit ? undefined : submit}
      onReview={client && mobile && renderReviewControls ? () => { setShowComments(false); setShowReview(true); } : undefined}
      currentPages={pagesAt(page)}
    />
  );
  const content = (
    <section
      ref={root}
      role={expanded ? 'dialog' : 'region'}
      aria-modal={expanded ? true : undefined}
      className={`pdf-book${expanded ? ' is-expanded' : ''}${turn ? ' is-turning' : ''}`}
      aria-label={`${title} reader`}
      onContextMenu={(e) => {
        if (mode !== 'text' || !e.target.closest('.proof-text-layer')) e.preventDefault();
      }}
      onKeyDown={(e) => {
        if (e.defaultPrevented || (e.target.closest('[role="dialog"]') && e.target.closest('[role="dialog"]') !== root.current)) return;
        if (expanded && e.key === 'Tab') {
          const items = [
            ...root.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)'),
          ].filter((el) => el.getClientRects().length);
          const first = items[0],
            last = items.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
        if (e.key === 'Escape' && expanded) {
          e.preventDefault();
          e.stopPropagation();
          toggleFullscreen();
          return;
        }
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        if (!metadata?.pageCount) return;
        if (e.key === 'ArrowRight' && mode === 'read') {
          e.preventDefault();
          next();
        }
        if (e.key === 'ArrowLeft' && mode === 'read') {
          e.preventDefault();
          previous();
        }
        if ((e.ctrlKey || e.metaKey) && ['p', 's'].includes(e.key.toLowerCase())) e.preventDefault();
      }}
      tabIndex={0}
    >
      <header className="proof-toolbar">
        <strong>{tx(title)}</strong>
        {metadata?.canComment && !interactionDisabled && (
          <div className="proof-modes" aria-label={tx('Review tools')}>
            {[
              ['read', 'Read'],
              ['text', 'Select text'],
              ['image', 'Select image'],
              ['area', 'Mark area'],
            ].map(([value, label]) => (
              <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>
                {tx(label)}
              </button>
            ))}
          </div>
        )}
        <div className="proof-tools">
          {!mobile && (
            <button
              aria-label={tx(single ? 'Book view' : 'Single page')}
              title={tx(single ? 'Book view' : 'Single page')}
              disabled={navigating || Boolean(turn)}
              onClick={() => {
                setTurn(null);
                setSinglePreference(!singlePreference);
                setZoom(1);
              }}
            >
              {single ? <Columns2 size={17} /> : <Square size={17} />}
            </button>
          )}
          {!mobile && <button
            aria-label={`${tx('Comments')} (${metadata?.annotations?.length || 0})`}
            aria-expanded={showComments}
            title={tx('Comments')}
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare size={17} />
            <span>{metadata?.annotations?.length || 0}</span>
          </button>}
          <button
            aria-label={tx(expanded ? 'Exit fullscreen' : 'Fullscreen')}
            title={tx(expanded ? 'Exit fullscreen' : 'Fullscreen')}
            onClick={toggleFullscreen}
          >
            {expanded ? <Minimize size={17} /> : <Maximize size={17} />}
          </button>
        </div>
      </header>
      {error && opened && <div className="proof-error state-inline" role="alert">{tx(error)}</div>}
      {openingError && !opened ? (
        <StateError error={openingError} title={ui('Unable to open magazine', 'Hatukuweza kufungua jarida')}
          retryLabel={metadata?.state === 'failed' ? tx('Retry preparation') : undefined}
          onRetry={async () => {
            try {
              if (metadata?.state === 'failed') await reader.retry();
              setRefresh(n => n + 1);
            } catch (e) { setError(e.message); setOpeningError(e); }
          }} />
      ) : !metadata ? (
        <StatePanel compact kind="loading" title={ui('Opening magazine…', 'Tunafungua jarida…')} description={slowOpening ? ui('This is taking longer than usual. You can try opening the magazine again.', 'Hii inachukua muda zaidi. Unaweza kujaribu kufungua jarida tena.') : undefined} onRetry={slowOpening ? () => setRefresh(n => n + 1) : undefined} />
      ) : !opened ? (
        <StatePanel compact kind="loading" title={ui('Preparing magazine cover…', 'Tunatayarisha jalada la jarida…')} description={slowOpening ? ui('Preparation has not finished. Try again to check the latest result.', 'Maandalizi hayajakamilika. Jaribu tena kuangalia matokeo ya hivi karibuni.') : undefined} onRetry={slowOpening ? () => setRefresh(n => n + 1) : undefined} />
      ) : (
        <>
          <div className={`proof-layout${showComments && !mobile ? '' : ' no-comments'}`}>
            <BookStage
              page={page}
              single={single}
              zoom={zoom}
              cache={cache}
              turn={turn}
              mode={mode}
              onNext={next}
              onPrevious={previous}
              renderPage={(number) =>
                number <= metadata.pageCount ? (
                  <Page
                    cache={cache}
                    key={`${version}-${number}`}
                    reader={reader}
                    number={number}
                    annotations={annotations}
                    mode={metadata.canComment && !interactionDisabled ? mode : 'read'}
                    onSelect={select}
                    onFocus={focus}
                    focused={focused}
                    pendingSelection={selection?.page === number ? selection : null}
                    onUseArea={useArea}
                  />
                ) : null
              }
            />
            {showComments && !mobile && comments}
            {selection && metadata.canComment && !interactionDisabled && (
              <form
                className="proof-composer"
                aria-label={tx('Comment editor')}
                onSubmit={save}
                onDragOver={e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }}
                onDrop={e => { e.preventDefault(); if (!saving) uploads.add(e.dataTransfer.files); }}
                onPaste={e => { if (e.clipboardData.files.length) { e.preventDefault(); if (!saving) uploads.add(e.clipboardData.files); } }}
                style={
                  !mobile && selection.anchor
                    ? {
                        position: 'fixed',
                        zIndex: 2300,
                        maxHeight: `calc(100dvh - ${composerTop + 16}px)`,
                        left: Math.max(
                          16,
                          Math.min(
                            selection.anchor.x + 8,
                            window.innerWidth - 376,
                          ),
                        ),
                        top: composerTop,
                      }
                    : undefined
                }
              >
                <ReviewChatComposer
                  title={<><InterfaceText>Page</InterfaceText> {selection.page} · {tx(selection.kind === 'image' ? 'Image' : selection.kind === 'text' ? 'Text' : 'Area')} <InterfaceText>comment</InterfaceText></>}
                  cancelLabel={tx('Cancel')} cancelDisabled={saving || audioBusy}
                  onCancel={() => { uploads.clear(true); setSelection(null); setReplacement(null); setComment(''); }}
                  quote={selection.selectedText} inputRef={commentInput} inputLabel={tx('Correction comment')}
                  value={comment} onChange={event => setComment(event.target.value)} disabled={saving}
                  placeholder={ui('Write your comment…', 'Andika maoni yako…')}
                  attachments={<AttachmentEditor uploads={uploads} disabled={saving} onAudioBusyChange={setAudioBusy} />}
                  footer={<span>{ui('Add text, photos or audio.', 'Ongeza maandishi, picha au sauti.')}</span>}
                  submitLabel={tx('Save comment')} submitting={saving}
                  submitDisabled={saving || audioBusy || !uploads.ready || (!comment.trim() && !uploads.items.length)}>
                  {replacement && (
                    <div className="proof-replacement" role="alert">
                      <p>
                        <InterfaceText>Save or discard this comment before choosing another selection.</InterfaceText>
                      </p>
                      <ActionButton loading={saving} type="submit" disabled={saving || audioBusy || !uploads.ready || (!comment.trim() && !uploads.items.length)}>
                        <InterfaceText>Save current comment</InterfaceText>
                      </ActionButton>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          uploads.clear(true);
                          setSelection(replacement);
                          setReplacement(null);
                          setComment('');
                        }}
                      >
                        <InterfaceText>Discard current draft</InterfaceText>
                      </button>
                      <button type="button" onClick={() => setReplacement(null)}>
                        <InterfaceText>Keep editing</InterfaceText>
                      </button>
                    </div>
                  )}
                </ReviewChatComposer>
              </form>
            )}
          </div>
          <footer className="proof-footer">
            <div className="proof-zoom">
              <button
                onClick={() => setZoom((z) => Math.max(0.6, Math.round((z - 0.2) * 10) / 10))}
                aria-label={tx('Zoom out')}
              >
                <Minus size={15} />
              </button>
              <button className="proof-fit" aria-label={tx('Fit pages to screen')} onClick={() => setZoom(1)}>
                {zoom === 1 ? tx('Fit') : `${Math.round(zoom * 100)}%`}
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(2, Math.round((z + 0.2) * 10) / 10))}
                aria-label={tx('Zoom in')}
              >
                <Plus size={15} />
              </button>
            </div>
            <div className="proof-pagination">
              <button
                aria-label={tx('Previous page')}
                disabled={page === 1 || navigating || Boolean(turn)}
                onClick={previous}
              >
                <ChevronLeft size={19} />
              </button>
              <label>
                <span className="sr-only">
                  <InterfaceText>Page</InterfaceText>
                </span>
                <input
                  aria-label={tx('Go to page')}
                  type="number"
                  min="1"
                  max={metadata.pageCount}
                  disabled={navigating || Boolean(turn)}
                  value={pageInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPageInput(value);
                    clearTimeout(jumpTimer.current);
                    const n = Number(value);
                    if (n >= 1 && n <= metadata.pageCount)
                      jumpTimer.current = setTimeout(
                        () => navigate(single || n === 1 ? n : n % 2 === 0 ? n : n - 1),
                        250,
                      );
                  }}
                />
                <span> / {metadata.pageCount}</span>
              </label>
              <button
                aria-label={tx('Next page')}
                disabled={page + (single || page === 1 ? 1 : 2) > metadata.pageCount || navigating || Boolean(turn)}
                onClick={next}
              >
                <ChevronRight size={19} />
              </button>
            </div>
            <span className="proof-sync" role="status">
              {(navigating || saving || discarding) && <SoftFlutter />} {tx(navigating ? 'Preparing pages…' : sync)}
            </span>
          </footer>
        </>
      )}
      {mobile && (
        <nav className="proof-mobile-dock" aria-label={ui('Magazine review', 'Ukaguzi wa jarida')}>
          <button type="button" aria-label={`${tx('Comments')} (${annotations.length})`} aria-haspopup="dialog"
            aria-expanded={showComments} onClick={() => { setShowReview(false); setShowComments(true); }}>
            <MessageSquare size={18} aria-hidden="true" /> {tx('Comments')}
            <span className="proof-dock-count">{annotations.length}</span>
          </button>
          {renderReviewControls && <button type="button" className="proof-review-trigger" aria-haspopup="dialog"
            aria-expanded={showReview} onClick={() => { setShowComments(false); setShowReview(true); }}>
            <ClipboardCheck size={18} aria-hidden="true" /> {client ? ui('Review magazine', 'Kagua jarida') : ui('Review & return', 'Kagua na rudisha')}
          </button>}
        </nav>
      )}
      {mobile && showComments && <ProofMobilePanel title={`${tx('Comments')} · ${annotations.length}`}
        closeLabel={tx('Close comments')} onClose={() => setShowComments(false)}>{comments}</ProofMobilePanel>}
      {renderReviewControls?.(reviewState)}
    </section>
  );
  return expanded ? createPortal(content, document.body) : content;
}
