// Transfers belong to the browser session, never to an individual order page.
export function createDraftQueue({ transfer, cancelSaved, onSubmitted = () => {} }) {
  let jobs = [], owner = null, sequence = 0;
  const tasks = new Map(), listeners = new Set();
  const emit = () => listeners.forEach(listener => listener());
  const update = (id, patch) => {
    jobs = jobs.map(job => job.id === id ? { ...job, ...patch } : job);
    emit();
  };
  const busy = job => ['queued', 'uploading', 'canceling'].includes(job.status);
  const pump = () => {
    if (jobs.some(job => ['uploading', 'canceling'].includes(job.status))) return;
    const job = jobs.find(job => job.status === 'queued');
    if (!job) return;
    const task = tasks.get(job.id);
    task.controller = new AbortController();
    update(job.id, { status: 'uploading', error: '' });
    task.running = (async () => {
      try {
        const result = await transfer({ ...task.input, signal: task.controller.signal,
          onProgress: progress => update(job.id, { progress }) });
        if (!tasks.has(job.id) || task.controller.signal.aborted) return;
        update(job.id, { status: task.input.deferSubmission ? 'ready' : 'complete', result });
        task.input.file = null;
        if (!task.input.deferSubmission) onSubmitted(job.orderId);
      } catch (error) {
        if (!tasks.has(job.id) || task.controller.signal.aborted) return;
        update(job.id, { status: 'error', error: error.message || 'Upload failed. Please retry.' });
      } finally {
        pump();
      }
    })();
  };
  const queue = {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => jobs,
    hasActive: () => jobs.some(busy),
    setOwner(staffId) {
      if (owner !== staffId) { queue.reset(); owner = staffId; }
    },
    reset() {
      tasks.forEach(task => task.controller?.abort());
      tasks.clear(); jobs = []; owner = null; emit();
    },
    enqueue(input) {
      queue.setOwner(input.staffId);
      const existing = jobs.find(job => job.orderId === input.orderId && job.status !== 'complete');
      if (existing) throw new Error('This order already has an upload in the upload panel.');
      jobs.filter(job => job.orderId === input.orderId).forEach(job => tasks.delete(job.id));
      const id = `draft-${++sequence}`;
      tasks.set(id, { input: { ...input } });
      jobs = [...jobs.filter(job => job.orderId !== input.orderId), {
        id, orderId: input.orderId, name: input.file.name, label: input.label,
        status: 'queued', progress: null, error: '',
      }];
      emit(); pump(); return id;
    },
    retry(id) {
      const job = jobs.find(job => job.id === id);
      if (job?.status !== 'error' || !tasks.get(id)?.input.file) return;
      update(id, { status: 'queued', error: '' }); pump();
    },
    async cancel(id) {
      const job = jobs.find(job => job.id === id), task = tasks.get(id);
      if (!job || !task || ['complete', 'canceling'].includes(job.status) || job.progress?.stage === 'finalizing' && job.status === 'uploading') return;
      update(id, { status: 'canceling' });
      task.controller?.abort();
      await task.running;
      if (!tasks.has(id)) return;
      try {
        await cancelSaved(task.input.token, task.input.staffId, task.input.orderId);
        tasks.delete(id); jobs = jobs.filter(item => item.id !== id); emit();
      } catch (error) {
        update(id, { status: 'error', error: error.message });
      }
      pump();
    },
    dismiss(id) {
      if (jobs.some(job => job.id === id && busy(job))) return;
      tasks.delete(id); jobs = jobs.filter(job => job.id !== id); emit();
    },
    finishReview(orderId) {
      const job = jobs.find(job => job.orderId === orderId && job.status === 'ready');
      if (job) update(job.id, { status: 'complete' });
      onSubmitted(orderId);
    },
  };
  return queue;
}
