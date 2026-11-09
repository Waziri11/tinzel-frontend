import SoftFlutter, { ActionButton } from './SoftFlutter';
import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { geometryVersion, rectStyle, smallestImage, selectionAnchor } from '../../utils/proofAnnotations';
const IMAGE_HOLD_MS = 450;
const IMAGE_HOLD_SLOP = 12;
const imageSelection = (region, page) => ({
  page, kind: 'image', imageRegionId: region.id, imageQuad: region.quad,
  rects: [region.rect], selectedText: '',
});
let measureContext;
const TextRun = React.memo(function TextRun({ item: t, ratio }) {
  // Scale is independent of viewport size; one measurement also covers zoom and resize.
  const metrics = useMemo(() => {
    measureContext ||= document.createElement('canvas').getContext('2d');
    measureContext.font = `100px ${t.fontFamily || 'sans-serif'}`;
    const measurement = measureContext.measureText(t.str), measured = measurement.width;
    const ascent = measurement.fontBoundingBoxAscent ?? 80, descent = measurement.fontBoundingBoxDescent ?? 20;
    return { scale: measured > 0 && t.height > 0 ? t.width / ((t.height * ratio * measured) / 100) : 1,
      baseline: (ascent - (ascent + descent - 100) / 2) / 100 };

  }, [t, ratio]);
  const delta = t.source === 'ocr' ? 0 : ((t.ascent ?? .8) - metrics.baseline) * t.height;
  const angle = (t.angle || 0) * Math.PI / 180;
  return (
    <span
      dir={t.dir || 'ltr'}
      style={{
        left: `${(t.x - delta * ratio * Math.sin(angle)) * 100}%`,
        top: `${(t.y + delta * Math.cos(angle)) * 100}%`,
        fontSize: `${Math.max(0.01, t.height * ratio * 100)}cqw`,
        fontFamily: t.fontFamily || 'sans-serif',
        transform: `rotate(${t.angle || 0}deg) scaleX(${metrics.scale})`,
      }}
    >
      {t.str}
      {t.hasEOL ? '\n' : t.source === 'ocr' ? ' ' : ''}
    </span>
  );
});
export default React.memo(function ProofPage({
  reader,
  cache,
  number,
  annotations,
  mode,
  canSelectImages,
  onSelect,
  onFocus,
  focused,
  pendingSelection,
  onUseArea,
}) {
  const tx = useInterfaceText();
  const known = cache.peek(number),
    [value, setValue] = useState(known),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  const surface = useRef(null),
    drag = useRef(null),
    imagePress = useRef(null),
    suppressImageClick = useRef(false),
    [imagePoint, setImagePoint] = useState(null),
    [imageMiss, setImageMiss] = useState(false),
    [box, setBox] = useState(null),
    [candidate, setCandidate] = useState(null),
    [hover, setHover] = useState(null),
    [geometryState, setGeometryState] = useState(''),
    [geometryError, setGeometryError] = useState(''),
    [geometryAttempt, setGeometryAttempt] = useState(0);
  const cancelImagePress = () => {
    clearTimeout(imagePress.current?.timer);
    imagePress.current = null;
  };
  useEffect(() => {
    setImagePoint(null);
    setImageMiss(false);
    setCandidate(null);
    return cancelImagePress;
  }, [reader, cache, number, mode, canSelectImages]);
  useEffect(() => {
    let active = true,
      timer;
    setValue(cache.peek(number));
    setError('');
    setCandidate(null);
    const load = async () => {
      try {
        const data = await cache.get(number);
        if (active) setValue({ ...data });
      } catch (e) {
        if (active) {
          if (e.pending) timer = setTimeout(load, 1500);
          else setError(e.message);
        }
      }
    };
    load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [reader, cache, number, attempt]);
  useEffect(() => {
    if (!value || (!['text', 'image'].includes(mode) && !imagePoint) || value.text.geometryVersion >= geometryVersion) { setGeometryState(''); return; }
    let active = true,
      timer,
      attempts = 0;
    setGeometryState('preparing');
    setGeometryError('');
    const run = async () => {
      try {
        let status = await reader.prepare([number], { geometryOnly: true, retry: geometryAttempt > 0 });
        const poll = async () => {
          const g = await reader.text(number);
          if (!active) return;
          if (g.geometryVersion >= geometryVersion) {
            cache.updateText(number, g);
            setValue((v) => ({ ...v, text: g }));
            setGeometryState('');
            return;
          }
          const page = status.pages?.find((p) => p.page === number);
          if (page?.geometryState === 'failed')
            throw new Error(
              (page.geometryError?.message || 'Selection preparation failed') +
                (page.geometryError?.reference ? ` Reference: ${page.geometryError.reference}` : ''),
            );
          if (++attempts > 40) throw new Error('Selection preparation is taking too long. Retry or mark an area.');
          status =
            attempts % 6 === 0 ? await reader.prepare([number], { geometryOnly: true }) : await reader.metadata();
          if (active) timer = setTimeout(() => poll().catch(fail), 1500);
        };
        await poll();
      } catch (e) {
        fail(e);
      }
    };
    const fail = (error) => {
      if (active) {
        setGeometryState('failed');
        setGeometryError(error?.message || 'Selection preparation failed.');
      }
    };
    run();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [reader, cache, number, mode, value?.text.geometryVersion, geometryAttempt, Boolean(imagePoint)]);
  useEffect(() => {
    if (!imagePoint || !canSelectImages || !(value?.text.geometryVersion >= geometryVersion)) return;
    const region = smallestImage((value.text.imageRegions || []).filter(r => !r.pageImage), imagePoint);
    setCandidate(region ? imageSelection(region, number) : null);
    setImageMiss(!region);
    setImagePoint(null);
  }, [imagePoint, canSelectImages, value?.text, number]);
  const [ocrState, setOcrState] = useState(''), [ocrAttempt, setOcrAttempt] = useState(0);
  useEffect(() => {
    if (!value || mode !== 'text' || value.text.ocrVersion >= 1) { setOcrState(''); return; }
    let active = true, timer, attempts = 0;
    setOcrState('preparing');
    const run = async () => {
      try {
        let status = await reader.prepare([number], { ocr: true, retry: ocrAttempt > 0 });
        const poll = async () => {
          if (!active) return;
          try {
            const geometry = await reader.text(number);
            if (!active) return;
            if (geometry.ocrVersion >= 1) {
              cache.updateText(number, geometry);
              setValue(v => ({ ...v, text: geometry }));
              setOcrState(''); return;
            }
            if (status.pages?.find(p => p.page === number)?.ocrState === 'failed' || ++attempts > 60) {
              setOcrState('failed'); return;
            }
            if (attempts % 6 === 0) status = await reader.prepare([number], { ocr: true });
            else status = await reader.metadata();
            if (active) timer = setTimeout(poll, 2000);
          } catch { if (active) setOcrState('failed'); }
        };
        await poll();
      } catch { if (active) setOcrState('failed'); }
    };
    run();
    return () => { active = false; clearTimeout(timer); };
  }, [reader, cache, number, mode, Boolean(value), value?.text.ocrVersion, ocrAttempt]);
  useEffect(() => {
    setCandidate(null);
    if (mode !== 'text') return;
    let timer;
    const selected = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!surface.current) return;
        const anchor = selectionAnchor(surface.current, window.getSelection());
        if (anchor) setCandidate({ ...anchor, page: number });
        else if (!document.activeElement?.closest('.proof-add-comment')) setCandidate(null);
      }, 80);
    };
    document.addEventListener('selectionchange', selected);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('selectionchange', selected);
    };
  }, [mode, number]);
  const point = (e) => {
    const b = surface.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)),
      y: Math.max(0, Math.min(1, (e.clientY - b.top) / b.height)),
    };
  };
  const rectangle = (a, b) => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  });
  const commit = (selection) => {
    const b = surface.current.getBoundingClientRect(),
      r = selection.rects[0];
    onSelect({
      ...selection,
      anchor: { x: b.left + (r.x + r.width) * b.width, y: b.top + (r.y + r.height) * b.height },
    });
    setCandidate(null);
    window.getSelection()?.removeAllRanges();
  };
  const chooseImage = (region) => {
    setImagePoint(null);
    setImageMiss(false);
    setCandidate(imageSelection(region, number));
  };
  const detectImage = (position) => {
    setCandidate(null);
    setImageMiss(false);
    setImagePoint(position);
  };
  // Touch browsers can redirect a hit to a nearby button on a small page.
  // Image selection follows the finger's coordinates, not that adjusted target.
  const pointerTarget = (event) => (event.pointerType || event.nativeEvent?.pointerType) === 'touch'
    ? document.elementFromPoint(event.clientX, event.clientY) || event.target
    : event.target;
  if (error)
    return (
      <div className="proof-page-message" role="alert">
        {error}
        <ActionButton
          onClick={async () => {
            try {
              await reader.retry();
              await reader.prepare([number]);
              setAttempt((n) => n + 1);
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <InterfaceText>Retry preparation</InterfaceText>
        </ActionButton>
      </div>
    );
  if (!value)
    return (
      <div className="proof-page-message" role="status">
        <SoftFlutter size={32} /> <InterfaceText>Preparing page</InterfaceText> {number}…
      </div>
    );
  const { image, text } = value,
    regions = (text.imageRegions || []).filter(r => !r.pageImage),
    selected = pendingSelection || candidate;
  return (
    <div
      ref={surface}
      className={`proof-sheet mode-${mode}`}
      style={{
        aspectRatio: `${text.width}/${text.height}`,
        width: `min(100%, ${(100 * text.width) / text.height}cqh)`,
      }}
      onPointerDown={(e) => {
        cancelImagePress();
        if (e.isPrimary === false || e.button !== 0) {
          suppressImageClick.current = true;
          return;
        }
        suppressImageClick.current = false;
        if (canSelectImages && ['read', 'image'].includes(mode) && !pointerTarget(e).closest('button, input, textarea, a')) {
          const press = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, held: false, position: point(e) };
          imagePress.current = press;
          press.timer = setTimeout(() => {
            press.held = true;
            suppressImageClick.current = true;
            detectImage(press.position);
          }, IMAGE_HOLD_MS);
        }
        if (mode === 'area' && !e.target.closest('button')) {
          drag.current = point(e);
          surface.current.setPointerCapture(e.pointerId);
        }
      }}
      onPointerMove={(e) => {
        const press = imagePress.current;
        if (press && (e.pointerId !== press.pointerId || Math.hypot(e.clientX - press.x, e.clientY - press.y) > IMAGE_HOLD_SLOP)) {
          clearTimeout(press.timer);
          suppressImageClick.current = true;
        }
        if (drag.current) setBox(rectangle(drag.current, point(e)));
        if (mode === 'image') setHover(smallestImage(regions, point(e)));
      }}
      onPointerLeave={() => {
        setHover(null);
        if (imagePress.current) suppressImageClick.current = true;
        cancelImagePress();
      }}
      onPointerCancel={() => {
        cancelImagePress();
        suppressImageClick.current = true;
        drag.current = null;
        setBox(null);
      }}
      onPointerUp={(e) => {
        // A completed hold belongs to selection, even if the finger moves on release.
        if (imagePress.current?.held) e.stopPropagation();
        cancelImagePress();
        if (mode === 'area' && drag.current) {
          const rect = rectangle(drag.current, point(e));
          drag.current = null;
          setBox(null);
          if (rect.width > 0.003 && rect.height > 0.003)
            commit({ page: number, kind: 'area', rects: [rect], selectedText: '' });
        }
      }}
      onClickCapture={(e) => {
        if (suppressImageClick.current && e.detail !== 0) {
          suppressImageClick.current = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (canSelectImages && mode === 'image' && !pointerTarget(e).closest('button')) {
          e.stopPropagation();
          detectImage(point(e));
        }
      }}
    >
      <img src={image} alt={`Magazine page ${number}`} draggable={false} />
      {mode === 'text' && (
        <div className="proof-text-layer" aria-label={`Page ${number} text`}>
          {text.text.map((t, i) => (
            <TextRun key={i} item={t} ratio={text.height / text.width} />
          ))}
        </div>
      )}
      {mode === 'image' && (
        <svg
          className="proof-image-targets"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          aria-label={`Page ${number} images`}
        >
          {regions.map((r, i) => (
            <polygon
              key={r.id}
              points={r.quad.map((p) => `${p.x},${p.y}`).join(' ')}
              className={hover?.id === r.id ? 'is-hovered' : ''}
              role="button"
              aria-label={`Select ${r.pageImage ? 'page image' : 'image'} ${i + 1} on page ${number}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (['Enter', ' '].includes(e.key)) {
                  e.preventDefault();
                  e.stopPropagation();
                  chooseImage(r);
                }
              }}
            />
          ))}
        </svg>
      )}
      {selected?.imageQuad?.length >= 3 ? (
        <svg className="proof-selection-image" viewBox="0 0 1 1" preserveAspectRatio="none"
          aria-label={pendingSelection ? 'Unsaved correction selection' : 'Selected correction target'}>
          <polygon points={selected.imageQuad.map(p => `${p.x},${p.y}`).join(' ')} />
        </svg>
      ) : selected?.rects.map((r, i) => (
        <div
          key={i}
          className="proof-selection-mark"
          aria-label={pendingSelection ? 'Unsaved correction selection' : 'Selected correction target'}
          style={rectStyle(r)}
        />
      ))}
      {candidate && (
        <button
          className="proof-add-comment"
          onPointerDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            const latest = candidate.kind === 'text' ? selectionAnchor(surface.current, window.getSelection()) : null;
            commit(latest ? { ...latest, page: number } : candidate);
          }}
          style={{
            left: `${Math.min(75, candidate.rects[0].x * 100)}%`,
            top: `${Math.min(88, (candidate.rects[0].y + candidate.rects[0].height) * 100)}%`,
          }}
        >
          <InterfaceText>Add comment</InterfaceText>
        </button>
      )}
      {(['text', 'image'].includes(mode) || imagePoint) && geometryState && (
        <div className="proof-geometry-status" role="status">
          {geometryState !== 'failed' && <SoftFlutter />}
          {geometryState === 'failed' ? (
            <>
              {geometryError}{' '}
              <button onClick={() => setGeometryAttempt((n) => n + 1)}>
                <InterfaceText>Retry selection</InterfaceText>
              </button>
            </>
          ) : (
            'Preparing selection tools…'
          )}
        </div>
      )}
      {mode === 'text' && ocrState && (
        <div className="proof-ocr-status" role="status">
          {ocrState === 'preparing' ? <><SoftFlutter /> {tx('Recognizing text… You can keep reading.')}</> : <>
            <InterfaceText>Text recognition could not finish.</InterfaceText>{' '}
            <button onClick={() => setOcrAttempt(n => n + 1)}><InterfaceText>Retry text recognition</InterfaceText></button>{' '}
            <button onClick={onUseArea}><InterfaceText>Mark area</InterfaceText></button>
          </>}
        </div>
      )}
      {mode === 'text' && !text.text.length && !ocrState && (
        <button className="proof-image-page-hint" onClick={onUseArea}>
          <InterfaceText>No selectable text found. Mark an area instead.</InterfaceText>
        </button>
      )}
      {(imageMiss || (mode === 'image' && text.geometryVersion >= geometryVersion && !regions.length)) && (
        <button className="proof-image-page-hint" onClick={onUseArea}>
          {imageMiss && <><InterfaceText>No separate photo detected here.</InterfaceText>{' '}</>}
          <InterfaceText>Draw around the photo</InterfaceText>
        </button>
      )}
      {annotations
        .filter((a) => a.page === number)
        .map((a) => (
          <React.Fragment key={a._id}>
            {a.imageQuad?.length >= 3 ? (
              <svg
                className={`proof-saved-image${focused === a._id ? ' is-focused' : ''}`}
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
              >
                <polygon points={a.imageQuad.map((p) => `${p.x},${p.y}`).join(' ')} />
              </svg>
            ) : (
              a.rects.map((r, i) => (
                <div key={i} className={`proof-mark${focused === a._id ? ' is-focused' : ''}`} style={rectStyle(r)} />
              ))
            )}
            <button
              className={`proof-pin${focused === a._id ? ' is-focused' : ''}`}
              data-comment-id={a._id}
              style={{ left: `${a.rects[0].x * 100}%`, top: `${a.rects[0].y * 100}%` }}
              aria-label={`Comment ${a.displayNumber}: ${a.text || tx('Review attached images')}`}
              aria-pressed={focused === a._id}
              onClick={(e) => {
                e.stopPropagation();
                onFocus(a._id);
              }}
            >
              {a.displayNumber}
            </button>
          </React.Fragment>
        ))}
      {box && <div className="proof-drag-box" style={rectStyle(box)} />}
    </div>
  );
});
