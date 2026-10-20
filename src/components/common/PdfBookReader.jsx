import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import './pdfBookReader.css';

function PdfPage({ document, pageNumber }) {
  const canvas = useRef(null);
  useEffect(() => {
    let cancelled = false;
    let task;
    document.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: Math.min(1.45, 900 / page.getViewport({ scale: 1 }).width) });
      const target = canvas.current;
      target.width = viewport.width; target.height = viewport.height;
      task = page.render({ canvasContext: target.getContext('2d'), viewport });
      return task.promise;
    }).catch(() => {});
    return () => { cancelled = true; task?.cancel(); };
  }, [document, pageNumber]);
  return <canvas ref={canvas} className="pdf-book-page" aria-label={`Page ${pageNumber}`} />;
}

export default function PdfBookReader({ loadPdf, title = 'Magazine proof', allowDownload = false, onDownload }) {
  const [document, setDocument] = useState(null);
  const [page, setPage] = useState(1);
  const [singlePage, setSinglePage] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [turning, setTurning] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setSinglePage(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setDocument(null); setPage(1);
    Promise.all([loadPdf().then((blob) => blob.arrayBuffer()), import('pdfjs-dist')])
      .then(([data, pdfjsLib]) => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        return pdfjsLib.getDocument({ data }).promise;
      })
      .then((pdf) => { if (active) setDocument(pdf); })
      .catch((err) => { if (active) setError(err.message || 'Unable to open this PDF'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadPdf]);

  const step = singlePage ? 1 : 2;
  const go = (next) => {
    if (!document) return;
    setTurning(true);
    setPage(Math.max(1, Math.min(document.numPages, next)));
    window.setTimeout(() => setTurning(false), 280);
  };
  const onKeyDown = (event) => {
    if (event.key === 'ArrowLeft') go(page - step);
    if (event.key === 'ArrowRight') go(page + step);
  };

  if (loading) return <div className="pdf-book-state"><Loader2 className="spin" /> Loading magazine…</div>;
  if (error) return <div className="pdf-book-state is-error">{error}</div>;
  if (!document) return null;

  return (
    <section className="pdf-book" tabIndex={0} onKeyDown={onKeyDown} aria-label={`${title} PDF reader`}>
      <header><div><strong>{title}</strong><span>Page {page}{!singlePage && page < document.numPages ? `–${page + 1}` : ''} of {document.numPages}</span></div>
        {allowDownload && <button type="button" onClick={onDownload}><Download size={16} /> Download PDF</button>}
      </header>
      <div className={`pdf-book-spread${turning ? ' is-turning' : ''}`}>
        <PdfPage document={document} pageNumber={page} />
        {!singlePage && page < document.numPages && <PdfPage document={document} pageNumber={page + 1} />}
      </div>
      <footer>
        <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => go(page - step)}><ChevronLeft /></button>
        <span>{singlePage ? 'Single page' : 'Book view'}</span>
        <button type="button" aria-label="Next page" disabled={page + step > document.numPages} onClick={() => go(page + step)}><ChevronRight /></button>
      </footer>
    </section>
  );
}
