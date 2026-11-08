import { useEffect, useRef, useState } from 'react';

export function useProofAttachments(reader) {
  const [items, setItems] = useState([]), [error, setError] = useState('');
  const current = useRef([]), generation = useRef(0);
  const update = values => { current.current = values; setItems(values); };
  const patch = (key, changes) => update(current.current.map(item => item.key === key ? { ...item, ...changes } : item));
  useEffect(() => {
    generation.current++;
    update([]);
    setError('');
    return () => {
      generation.current++;
      for (const item of current.current) { item.controller?.abort(); URL.revokeObjectURL(item.preview); }
      current.current = [];
    };
  }, [reader]);
  const transfer = async item => {
    const epoch = generation.current, controller = new AbortController();
    patch(item.key, { state: 'uploading', error: '', controller });
    const live = () => epoch === generation.current && current.current.some(i => i.key === item.key);
    try {
      const result = await reader.uploadAttachment(item.file, item.key, {
        signal: controller.signal,
        onReserve: id => { if (live()) patch(item.key, { id }); },
        onProgress: progress => { if (live()) patch(item.key, { progress }); },
      });
      if (live()) patch(item.key, { state: 'ready', id: result.id, attachment: result, progress: 100 });
    } catch (failure) {
      if (live() && !controller.signal.aborted) patch(item.key, { state: 'failed', error: failure.message });
    }
  };
  const add = (files, kind = 'image') => {
    const incoming = [...files];
    const audio = kind === 'audio';
    if (current.current.filter(item => item.kind === kind).length + incoming.length > (audio ? 1 : 5)) { setError(audio ? 'Choose one audio message per comment.' : 'Choose up to five images per comment.'); return; }
    if (audio && incoming.some(file => !file.size || file.size > 3 * 1024 * 1024 || !/\.(mp3|m4a|mp4|wav|ogg|oga|opus|webm|aac)$/i.test(file.name))) {
      setError('Choose an audio file up to 3 MB.'); return;
    }
    if (!audio && incoming.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024 || !file.size)) {
      setError('Choose JPG, PNG or WebP images up to 10 MiB each.'); return;
    }
    setError('');
    const additions = incoming.map(file => ({ key: crypto.randomUUID(), kind, file, preview: URL.createObjectURL(file), state: 'uploading', progress: 0 }));
    update([...current.current, ...additions]);
    // Sequential transfers bound memory and avoid flooding the shared reader rate limit.
    (async () => { for (const item of additions) if (current.current.some(i => i.key === item.key)) await transfer(item); })();
  };
  const remove = item => {
    item.controller?.abort();
    update(current.current.filter(i => i.key !== item.key));
    URL.revokeObjectURL(item.preview);
    if (item.id) reader.removeAttachment(item.id).catch(() => {}); // Expiry handles interrupted cancellation.
  };
  const clear = (discard = false) => {
    const old = current.current;
    update([]); setError('');
    for (const item of old) {
      item.controller?.abort(); URL.revokeObjectURL(item.preview);
      if (discard && item.id) reader.removeAttachment(item.id).catch(() => {});
    }
  };
  return { items, error, add, addAudio: file => add([file], 'audio'), remove, clear, retry: transfer,
    ready: items.every(item => item.state === 'ready'), busy: items.some(item => item.state === 'uploading'),
    ids: items.filter(item => item.state === 'ready').map(item => item.id) };
}
