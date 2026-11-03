// Shared across routes so an in-flight transfer remains visible while navigating.
let snapshot = [];
const listeners = new Set();
const active = new Map();
const controllers = new Map();
export const getTransfers = () => snapshot;
export const subscribeTransfers = listener => { listeners.add(listener); return () => listeners.delete(listener); };
function update(id, changes) {
  snapshot = snapshot.map(job => job.id === id ? { ...job, ...changes } : job);
  listeners.forEach(listener => listener());
}
export function dismissTransfer(id) {
  if (controllers.has(id)) return;
  snapshot = snapshot.filter(job => job.id !== id);
  listeners.forEach(listener => listener());
}
export function cancelTransfer(id) { controllers.get(id)?.abort(); }
export function clearTransfers() {
  controllers.forEach(controller => controller.abort());
  controllers.clear(); active.clear(); snapshot = [];
  listeners.forEach(listener => listener());
}
export const transferIsActive = job => !['complete', 'error', 'cancelled', 'handed-off'].includes(job.stage);

export function runTransfer({ key, name, kind = 'download' }, work) {
  if (active.has(key)) return active.get(key);
  const id = crypto.randomUUID(), controller = new AbortController();
  controllers.set(id, controller);
  snapshot = [...snapshot, { id, name, kind, stage: 'preparing', bytes: 0, total: null, percent: null }];
  listeners.forEach(listener => listener());
  const progress = changes => update(id, changes);
  // Defer work until the duplicate-request lock has been registered.
  const promise = Promise.resolve().then(() => { controller.signal.throwIfAborted(); return work({ signal: controller.signal, progress }); }).then(result => {
    const job = snapshot.find(job => job.id === id);
    if (job?.stage !== 'handed-off') progress({ stage: 'complete', percent: 100 });
    return result;
  }).catch(error => {
    progress({ stage: controller.signal.aborted ? 'cancelled' : 'error', error: error.message });
    throw error;
  }).finally(() => { controllers.delete(id); if (active.get(key) === promise) active.delete(key); });
  active.set(key, promise);
  return promise;
}

/** Progress is based on received bytes; unknown/compressed lengths stay indeterminate. */
export async function readDownload(response, { signal, progress }) {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw Object.assign(new Error(data.message || 'Download unavailable'), { status: response.status });
  }
  const length = Number(response.headers.get('content-length'));
  const encoding = response.headers.get('content-encoding');
  const total = Number.isFinite(length) && length > 0 && (!encoding || encoding === 'identity') ? length : null;
  progress({ stage: 'transferring', bytes: 0, total, percent: total ? 0 : null });
  if (!response.body?.getReader) return response.blob();
  const reader = response.body.getReader(), chunks = [];
  let bytes = 0;
  const abort = () => { reader.cancel(signal.reason).catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      chunks.push(value); bytes += value.byteLength;
      progress({ stage: 'transferring', bytes, total, percent: total ? Math.min(99, bytes / total * 100) : null });
    }
    if (total && bytes < total) throw new Error('Download interrupted. Please retry.');
    return new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' });
  } finally { signal?.removeEventListener('abort', abort); reader.releaseLock(); }
}

export function saveDownload(blob, filename) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
