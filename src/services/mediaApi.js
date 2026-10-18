const base = import.meta.env?.VITE_API_URL || '';
const root = `${base}/api/public/media`;
const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
  const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
});
export const isRetryable = (e) => e.name !== 'AbortError' && (e.retryable === true ||
  (e.retryable !== false && (!e.status || [408, 429, 502, 503, 504].includes(e.status))));

export async function mediaRequest(path, session, { method = 'GET', body, signal, binary = false, progress, onRetry } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    signal?.throwIfAborted();
    try {
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, `${root}${path}`); xhr.timeout = binary ? 120000 : 30000;
        xhr.setRequestHeader('X-Upload-Token', session.token);
        if (body !== undefined) xhr.setRequestHeader('Content-Type', binary ? 'application/octet-stream' : 'application/json');
        const abort = () => xhr.abort();
        signal?.addEventListener('abort', abort, { once: true });
        xhr.onloadend = () => signal?.removeEventListener('abort', abort);
        xhr.upload.onprogress = (event) => progress?.(event.loaded);
        xhr.onerror = () => reject(new Error('Connection interrupted. Retry this photo.'));
        xhr.ontimeout = () => reject(Object.assign(new Error('Upload timed out. Retry this photo.'), { status: 408 }));
        xhr.onabort = () => reject(new DOMException('Cancelled', 'AbortError'));
        xhr.onload = () => {
          let data = {}; try { data = JSON.parse(xhr.responseText); } catch { /* gateway error */ }
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(Object.assign(new Error((data.message || `Upload failed (${xhr.status})`) + (data.requestId && xhr.status >= 500 ? ` Reference: ${data.requestId}` : '')), { status: xhr.status, retryable: data.retryable, requestId: data.requestId }));
        };
        if (signal?.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
        xhr.send(body === undefined ? undefined : binary ? body : JSON.stringify(body));
      });
    } catch (error) {
      if (attempt === 2 || !isRetryable(error)) throw error;
      onRetry?.();
      await sleep(600 * 2 ** attempt + Math.random() * 300, signal);
    }
  }
}

export const createUploadSession = (session, slug) => mediaRequest('/sessions', session, { method: 'POST', body: { id: session.id, slug } });
export const readUploadSession = (session) => mediaRequest(`/sessions/${session.id}`, session);
export const removeUpload = (session, assetId) => mediaRequest(`/sessions/${session.id}/assets/${assetId}`, session, { method: 'DELETE' });
export const cancelUpload = (session, clientId) => mediaRequest(`/sessions/${session.id}/selections/${clientId}`, session, { method: 'DELETE' });
export const submitUploadSession = (session, body) => mediaRequest(`/sessions/${session.id}/submit`, session, { method: 'POST', body });

const contentType = (file) => file.type || ({ heic: 'image/heic', heif: 'image/heif', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[file.name.split('.').pop().toLowerCase()] || 'application/octet-stream');

export async function transferPhoto(session, item, signal, progress) {
  const prefix = `/sessions/${session.id}/assets`;
  const reservation = await mediaRequest(prefix, session, { method: 'POST', signal,
    body: { clientId: item.id, name: item.name, size: item.size, contentType: contentType(item.file), fieldId: item.fieldId } });
  const assetId = reservation.entry._id;
  progress(0, { assetId });
  const path = `${prefix}/${assetId}`;
  const status = await mediaRequest(path, session, { signal });
  if (status.photo) return status.photo;
  if (reservation.entry.provider === 'blob') {
    // Reconcile a successful transfer whose completion response was lost.
    try { return (await mediaRequest(`${path}/complete`, session, { method: 'POST', signal, body: {} })).photo; }
    catch (e) { if (e.status !== 409) throw e; }
    const { upload } = await import('@vercel/blob/client');
    await upload(reservation.path, item.file, { access: 'private', handleUploadUrl: `${root}/blob`,
      contentType: contentType(item.file), abortSignal: signal, multipart: false,
      clientPayload: JSON.stringify({ sessionId: session.id, token: session.token, assetId }),
      onUploadProgress: ({ percentage }) => progress(Math.min(99, percentage), { stage: 'uploading' }),
    });
  } else {
    const chunks = new Map(status.chunks.map((chunk) => [chunk.n, chunk]));
    const size = reservation.chunkBytes;
    for (let n = 0; n < Math.ceil(item.size / size); n++) {
      signal.throwIfAborted();
      const part = item.file.slice(n * size, Math.min((n + 1) * size, item.size));
      if (chunks.has(n)) {
        const digest = await crypto.subtle.digest('SHA-256', await part.arrayBuffer());
        const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
        if (hash !== chunks.get(n).sha256) throw new Error('This file differs from its saved upload. Remove it and choose the original again.');
      } else {
        await mediaRequest(`${path}/chunks/${n}`, session, { method: 'PUT', body: part, binary: true, signal,
          onRetry: () => progress(Math.min(99, 100 * n * size / item.size), { stage: 'retrying' }),
          progress: (bytes) => progress(Math.min(99, 100 * (n * size + bytes) / item.size), { stage: 'uploading' }) });
      }
      progress(Math.min(99, 100 * Math.min((n + 1) * size, item.size) / item.size));
    }
  }
  progress(99, { stage: 'confirming' });
  return (await mediaRequest(`${path}/complete`, session, { method: 'POST', signal, body: {} })).photo;
}
