import { hashBytes, transferChunks } from './chunkTransfer';

const storageKey = (purpose, orderId) => `tinzel:file-upload:${purpose}:${orderId || 'cover'}`;
export function forgetStaffFile(purpose, orderId) {
  try { localStorage.removeItem(storageKey(purpose, orderId)); } catch { /* Optional recovery. */ }
}
export async function transferStaffFile({ file, purpose, orderId, signal, progress = () => {}, call, send }) {
  if (!file?.size || file.size > (purpose === 'cover' ? 25 : 500) * 1024 * 1024) throw new Error(`Choose a file up to ${purpose === 'cover' ? 25 : 500} MB.`);
  signal?.throwIfAborted(); progress({ stage: 'checking', percent: null });
  const fingerprint = await hashBytes(await new Blob([`${file.size}:${file.lastModified}:${file.name}`, file.slice(0, 65536), file.slice(-65536)]).arrayBuffer());
  const key = storageKey(purpose, orderId);
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch { /* Optional recovery. */ }
  const clientId = saved?.fingerprint === fingerprint ? saved.clientId : crypto.randomUUID();
  try { localStorage.setItem(key, JSON.stringify({ clientId, fingerprint })); } catch { /* Upload still works. */ }
  const body = { clientId, fingerprint, purpose, orderId, name: file.name, size: file.size, contentType: file.type || (purpose === 'print' ? 'application/pdf' : 'application/octet-stream') };
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
    await transferChunks({ file, chunkBytes: session.chunkBytes, received: session.chunks, concurrency: 3,
      compression: session.compression === 'gzip', signal,
      onProgress: ({ bytes, total }) => progress({ stage: 'uploading', bytes, total, percent: Math.min(99, bytes / total * 100) }),
      onRetry: () => progress({ stage: 'reconnecting', percent: null }),
      send: part => send(`/${session.id}/chunks/${part.n}`, part),
    });
  }
  progress({ stage: 'finalizing', percent: null });
  return call(`/${session.id}/complete`, {}, signal);
}
