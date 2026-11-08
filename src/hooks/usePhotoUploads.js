import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PhotoUploadQueue, checkSelection } from '../utils/photoUploadQueue';
import { createUploadSession, readUploadSession, readUploadPreview, cancelUpload, transferPhoto, submitUploadSession } from '../services/mediaApi';

const defaults = { maxFileBytes: 25 * 1024 * 1024, maxFiles: 100, maxTotalBytes: 1024 * 1024 * 1024 };
const keyFor = (slug) => `tinzel:uploads:v2:${slug}`;
function load(slug) {
  try { const saved = JSON.parse(localStorage.getItem(keyFor(slug))); if (saved?.session && Date.now() - saved.created < 7 * 86400000) return saved; } catch { /* storage unavailable */ }
  return { created: Date.now(), session: { id: crypto.randomUUID(), token: [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('') }, items: [] };
}
export function usePhotoUploads(slug, form) {
  const [items, setItems] = useState([]);
  const [notice, setNotice] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState('saving');
  const [phase, setPhase] = useState('idle');
  const state = useMemo(() => ({ ...load(slug), limits: defaults, init: null, files: new Map() }), [slug]);
  const preview = useCallback((item, signal, { remote = false } = {}) => {
    const file = !remote && state.files.get(item.id);
    return file ? Promise.resolve(file) : readUploadPreview(state.session, item.photo.assetId, signal);
  }, [state]);
  const alive = useRef(true);
  const queue = useMemo(() => new PhotoUploadQueue(async (item, signal, progress) => {
    await initialize();
    return transferPhoto(state.session, item, signal, progress);
  }), [state]);
  const initialize = () => {
    if (!state.init) state.init = createUploadSession(state.session, slug).then((result) => { state.limits = result.limits; return result; }).catch((error) => { state.init = null; throw error; });
    return state.init;
  };
  useEffect(() => {
    alive.current = true; queue.closed = false;
    setPhase('idle'); setNotice(''); setRecoveryStatus('saving');
    const persist = (snapshot) => {
      if (!alive.current || state.finished) return;
      setItems(snapshot);
      try { localStorage.setItem(keyFor(slug), JSON.stringify({ created: state.created, session: state.session, items: snapshot })); setRecoveryStatus('saved'); }
      catch { setRecoveryStatus('unavailable'); setNotice('This browser cannot save upload recovery. Keep this page open until you submit.'); }
    };
    let timer;
    queue.onChange = (snapshot) => {
      setRecoveryStatus((previous) => previous === 'unavailable' ? previous : 'saving');
      setItems(snapshot); clearTimeout(timer); timer = setTimeout(() => persist(queue.snapshot()), 300);
    };
    queue.restore(state.items);
    if (state.items.length) state.recovery = initialize().then(() => readUploadSession(state.session)).then((remote) => {
      if (!alive.current) return;
      const entries = remote.entries.map((entry) => {
        const local = state.items.find((i) => i.id === entry.clientId);
        return { ...local, id: entry.clientId, assetId: entry._id, name: entry.name, size: entry.size,
          fieldId: entry.fieldId, folderName: entry.folderName, photo: remote.completed.find((p) => p.assetId === entry._id) };
      });
      // Keep selections which hadn't reached reservation before refresh.
      for (const item of state.items) if (!entries.some((e) => e.id === item.id) && !item.assetId) entries.push(item);
      if (!queue.active) queue.restore(entries);
    }).catch((e) => { if (alive.current) setNotice(e.message); });
    return () => { persist(queue.snapshot()); alive.current = false; clearTimeout(timer); queue.close(); };
  }, [queue]);

  async function add(fieldId, files) {
    await state.recovery;
    await initialize();
    const field = form?.fields.find((f) => f.fieldId === fieldId);
    const snapshot = queue.snapshot();
    const fresh = files.filter((file) => !snapshot.some((i) => i.fieldId === fieldId && i.name === file.name && i.size === file.size && i.state === 'needs_file'));
    checkSelection(snapshot, field, fresh, state.limits);
    for (const file of files) {
      const resumed = queue.snapshot().find((i) => i.fieldId === fieldId && i.name === file.name && i.size === file.size && i.state === 'needs_file');
      const id = resumed?.id || crypto.randomUUID();
      state.files.set(id, file);
      queue.add({ id, assetId: resumed?.assetId, name: file.name,
        size: file.size, lastModified: file.lastModified, fieldId, folderName: field?.label || 'General Photos' }, file);
    }
  }
  async function remove(id) {
    await state.recovery;
    const item = queue.tasks.get(id);
    if (!item) return;
    item.controller?.abort();
    // A reservation response can be lost during cancellation: resolve by stable clientId.
    await initialize();
    await cancelUpload(state.session, id);
    queue.remove(id);
    state.files.delete(id);
  }
  async function submit(body) {
    setPhase('waiting');
    let saving = false;
    try {
      await state.recovery;
      await initialize();
      const photos = await queue.wait();
      setPhase('saving');
      saving = true;
      const result = await submitUploadSession(state.session, { ...body, assetIds: photos.map((p) => p.assetId) });
      queue.onChange = () => {};
      try { localStorage.removeItem(keyFor(slug)); } catch { /* no persistent storage */ }
      state.finished = true;
      setPhase('submitted');
      return result;
    } catch (error) { error.submissionUncertain = saving && (!error.status || error.status >= 500 || error.status === 408); setPhase('idle'); throw error; }
  }
  async function checkSubmission() {
    await state.recovery;
    await initialize();
    const remote = await readUploadSession(state.session);
    if (remote.result) {
      queue.onChange = () => {};
      try { localStorage.removeItem(keyFor(slug)); } catch { /* no persistent storage */ }
      state.finished = true;
      setPhase('submitted');
    }
    return remote;
  }
  return { items, notice, recoveryStatus, phase, preview, add, remove, retry: (id) => queue.retry(id), submit, checkSubmission };
}
