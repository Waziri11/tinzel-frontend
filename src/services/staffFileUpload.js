import { encodeUploadPart, hashBytes, transferChunks, withUploadSlot } from './chunkTransfer';

const storageKey = (purpose, orderId) => `tinzel:file-upload:${purpose}:${orderId || 'cover'}`;
export function forgetStaffFile(purpose, orderId) {
  try { localStorage.removeItem(storageKey(purpose, orderId)); } catch { /* Optional recovery. */ }
}
export async function transferStaffFile({ file, purpose, orderId, signal, progress = () => {}, call, send, sendWhole }) {
  if (!file?.size || file.size > (purpose === 'cover' ? 25 : 500) * 1024 * 1024) throw new Error(`Choose a file up to ${purpose === 'cover' ? 25 : 500} MB.`);
  signal?.throwIfAborted(); progress({ stage: 'checking', percent: null });
  const fingerprint = await hashBytes(await new Blob([`${file.size}:${file.lastModified}:${file.name}`, file.slice(0, 65536), file.slice(-65536)]).arrayBuffer());
  const key = storageKey(purpose, orderId);
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch { /* Optional recovery. */ }
  const clientId = saved?.fingerprint === fingerprint ? saved.clientId : crypto.randomUUID();
  try { localStorage.setItem(key, JSON.stringify({ clientId, fingerprint })); } catch { /* Upload still works. */ }
  const body = { clientId, fingerprint, purpose, orderId, name: file.name, size: file.size, chunkBytes: file.size <= 4 * 1024 * 1024 ? 512 * 1024 : 1024 * 1024, contentType: file.type || (purpose === 'print' ? 'application/pdf' : 'application/octet-stream') };
  if (sendWhole && saved?.fingerprint !== fingerprint && file.size <= 3 * 1024 * 1024) {
    try {
      const result = await withUploadSlot(async () => {
        const encoded = await encodeUploadPart(file, { signal });
        if (encoded.body.size > body.chunkBytes) return null;
        const sha256 = await hashBytes(await file.arrayBuffer());
        return sendWhole({ body: encoded.body, signal,
          headers: { ...encoded.headers, 'X-Chunk-SHA256': sha256, 'X-Upload-Metadata': encodeURIComponent(JSON.stringify(body)) },
          progress: loaded => progress({ stage: 'uploading', bytes: Math.min(file.size, loaded / encoded.body.size * file.size), total: file.size, percent: Math.min(99, loaded / encoded.body.size * 100) }),
        });
      }, signal);
      if (result) return result;
    } catch (error) {
      // A lost response may have saved the file. Reuse its identity and resume,
      // rather than sending the whole file repeatedly on an unstable connection.
      if (signal?.aborted || error.name === 'AbortError' || error.status && ![404, 408, 413, 429, 500, 502, 503, 504].includes(error.status)) throw error;
      progress({ stage: 'reconnecting', percent: null });
    }
  }
  let session;
  try { session = await call('', body, signal); }
  catch (error) {
    if (error.status !== 410) throw error;
    body.clientId = crypto.randomUUID();
    try { localStorage.setItem(key, JSON.stringify({ clientId: body.clientId, fingerprint })); } catch { /* Optional recovery. */ }
    session = await call('', body, signal);
  }
  {
    // Verify every saved part, including a completed upload whose response was lost.
    await transferChunks({ file, chunkBytes: session.chunkBytes, received: session.chunks, concurrency: 4, batchParts: session.batchParts || 1,
      compression: session.compression === 'gzip', signal,
      onProgress: ({ bytes, total }) => progress({ stage: 'uploading', bytes, total, percent: Math.min(99, bytes / total * 100) }),
      onRetry: () => progress({ stage: 'reconnecting', percent: null }),
      send: part => send(`/${session.id}/${part.count > 1 ? 'batches' : 'chunks'}/${part.n}`, part),
    });
  }
  progress({ stage: 'finalizing', percent: null });
  return call(`/${session.id}/complete`, {}, signal);
}
