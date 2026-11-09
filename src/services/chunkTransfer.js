// Share a small transfer budget across every uploader on the page.
let active = 0;
const waiting = [];
function drain() {
  while (active < 4 && waiting.length) waiting.shift()();
}
export function withUploadSlot(work, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => {
      const index = waiting.indexOf(start);
      if (index >= 0) waiting.splice(index, 1);
      reject(signal.reason || new DOMException('Cancelled', 'AbortError'));
    };
    const start = () => {
      signal?.removeEventListener('abort', abort);
      if (signal?.aborted) { abort(); return; }
      active++;
      Promise.resolve().then(work).then(resolve, reject).finally(() => { active--; drain(); });
    };
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, { once: true });
    waiting.push(start); drain();
  });
}

export const hashBytes = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
  .map(value => value.toString(16).padStart(2, '0')).join('');

// Compress the transport, never re-encode the image/PDF. The API inflates gzip
// before validating length/hash and persisting the original bytes.
export async function encodeUploadPart(blob, { enabled = true, signal } = {}) {
  const unchanged = { body: blob, headers: {} };
  if (!enabled || typeof CompressionStream !== 'function' || blob.size < 65536) return unchanged;
  try {
    signal?.throwIfAborted();
    const gzip = value => new Response(value.stream().pipeThrough(new CompressionStream('gzip'), { signal })).blob();
    // Sampling bounds wasted CPU on already-compressed photos and PDFs.
    const sample = new Blob([blob.slice(0, 16384), blob.slice(Math.floor(blob.size / 2), Math.floor(blob.size / 2) + 16384), blob.slice(-16384)]);
    const started = performance.now();
    if ((await gzip(sample)).size > sample.size * 0.9 || performance.now() - started > 40) return unchanged;
    const compressed = await gzip(blob);
    signal?.throwIfAborted();
    return compressed.size < blob.size * 0.9
      ? { body: compressed, headers: { 'Content-Encoding': 'gzip' } } : unchanged;
  } catch (error) {
    if (signal?.aborted) throw signal.reason || error;
    return unchanged; // Older browsers and unsupported encoders upload originals.
  }
}

export async function transferChunks({ file, chunkBytes, received = [], concurrency = 3, batchParts = 1, compression = false,
  signal, send, onProgress = () => {}, onRetry = () => {} }) {
  const controller = new AbortController();
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  const saved = new Map(received.map(part => [part.n, part]));
  const count = Math.ceil(file.size / chunkBytes), progress = new Map();
  const jobs = [];
  const groupSize = Math.max(1, Math.min(3, batchParts, Math.floor(count / Math.min(4, concurrency))));
  for (let n = 0; n < count;) {
    const start = n++;
    if (!saved.has(start)) while (n < count && n - start < groupSize && !saved.has(n)) n++;
    jobs.push({ n: start, count: n - start });
  }
  let cursor = 0, confirmed = 0, uploadedBytes = 0, networkBytes = 0;
  const report = () => {
    const inFlight = [...progress.values()].reduce((a, b) => a + b, 0);
    onProgress({ bytes: Math.min(file.size, confirmed + inFlight), total: file.size, uploadedBytes: uploadedBytes + inFlight, networkBytes });
  };
  const lane = async () => {
    while (cursor < jobs.length) {
      combined.throwIfAborted();
      const { n, count: partCount } = jobs[cursor++], part = file.slice(n * chunkBytes, Math.min(file.size, (n + partCount) * chunkBytes));
      await withUploadSlot(async () => {
        combined.throwIfAborted();
        const sha256 = await hashBytes(await part.arrayBuffer());
        combined.throwIfAborted();
        const old = saved.get(n);
        if (old) {
          if (old.sha256 !== sha256) throw new Error('This file differs from its saved upload. Select the original file or start again.');
        } else {
          const encoded = await encodeUploadPart(part, { enabled: compression, signal: combined });
          combined.throwIfAborted();
          // Production measurements favour small parallel requests for compressed
          // photos/PDFs. Batch only when gzip makes the wire payload small enough.
          if (partCount > 1 && encoded.body.size > chunkBytes) {
            for (let i = 0; i < partCount; i++) jobs.push({ n: n + i, count: 1 });
            return;
          }
          await send({ n, count: partCount, body: encoded.body, headers: { ...encoded.headers, 'X-Chunk-SHA256': sha256 }, sha256, signal: combined,
            progress: loaded => { progress.set(n, Math.min(part.size, loaded / encoded.body.size * part.size)); report(); },
            retry: () => { progress.delete(n); onRetry(); report(); } });
          networkBytes += encoded.body.size; uploadedBytes += part.size;
        }
        progress.delete(n); confirmed += part.size; report();
      }, combined);
    }
  };
  const lanes = Array.from({ length: Math.min(count, Math.max(1, Math.min(4, concurrency))) }, lane);
  try { await Promise.all(lanes); }
  catch (error) { controller.abort(error); await Promise.allSettled(lanes); throw error; }
  return { networkBytes, originalBytes: file.size };
}
