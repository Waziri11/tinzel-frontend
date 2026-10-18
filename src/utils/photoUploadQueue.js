// One queue owns every selection in a form, including background and submit work.
export class PhotoUploadQueue {
  constructor(transfer, { concurrency = 2, onChange = () => {} } = {}) {
    this.transfer = transfer; this.concurrency = concurrency; this.onChange = onChange;
    this.tasks = new Map(); this.active = 0; this.listeners = new Set(); this.closed = false;
  }
  snapshot() { return [...this.tasks.values()].map(({ file, controller, ...item }) => ({ ...item })); }
  emit() { this.onChange(this.snapshot()); for (const listener of this.listeners) listener(); }
  restore(items) {
    for (const item of items) this.tasks.set(item.id, { ...item, state: item.photo ? 'complete' : 'needs_file', progress: item.photo ? 100 : 0 });
    this.emit();
  }
  add(item, file) {
    const existing = this.tasks.get(item.id);
    if (existing && ['complete', 'uploading', 'queued'].includes(existing.state)) return;
    this.tasks.set(item.id, { ...existing, ...item, file, state: 'queued', error: '', progress: 0 });
    this.emit(); this.drain();
  }
  retry(id) {
    const item = this.tasks.get(id);
    if (!item || item.state !== 'failed') return;
    if (!item.file) { item.state = 'needs_file'; this.emit(); return; }
    item.state = 'queued'; item.error = ''; this.emit(); this.drain();
  }
  remove(id) { const item = this.tasks.get(id); item?.controller?.abort(); this.tasks.delete(id); this.emit(); }
  close() { this.closed = true; for (const item of this.tasks.values()) item.controller?.abort(); }
  drain() {
    if (this.closed) return;
    for (const item of this.tasks.values()) {
      if (this.active >= this.concurrency) break;
      if (item.state !== 'queued') continue;
      this.active++; item.state = 'uploading'; item.stage = 'connecting'; item.lastProgressAt = Date.now(); item.controller = new AbortController(); this.emit();
      Promise.resolve().then(() => this.transfer(item, item.controller.signal, (progress, patch = {}) => {
        if (this.tasks.get(item.id) !== item || this.closed) return;
        if (progress > item.progress) item.lastProgressAt = Date.now();
        Object.assign(item, patch, { progress }); this.emit();
      })).then((photo) => {
        if (this.tasks.get(item.id) !== item || this.closed) return;
        Object.assign(item, { photo, state: 'complete', progress: 100, file: undefined, error: '' });
      }).catch((error) => {
        if (this.tasks.get(item.id) !== item || this.closed) return;
        item.state = 'failed'; item.error = error.message || 'Photo upload failed';
      }).finally(() => { this.active--; item.controller = undefined; if (!this.closed) { this.emit(); this.drain(); } });
    }
  }
  async wait() {
    await new Promise((resolve) => {
      const check = () => {
        const items = [...this.tasks.values()];
        if (items.some((item) => ['failed', 'needs_file'].includes(item.state)) || !items.some((item) => ['queued', 'uploading'].includes(item.state))) {
          this.listeners.delete(check); resolve();
        }
      };
      this.listeners.add(check); check();
    });
    const items = this.snapshot();
    if (items.some((item) => item.state !== 'complete')) throw new Error('Some photos need attention. Retry or reselect them before submitting.');
    return items.map((item) => item.photo);
  }
}

export function checkSelection(items, field, files, limits) {
  const fieldId = field?.fieldId || '';
  const max = field?.type === 'photo_upload' ? 1 : (field?.validationRules?.maxPhotos || limits.maxFiles);
  if (items.filter((i) => i.fieldId === fieldId).length + files.length > max) throw new Error(`This question allows at most ${max} photos.`);
  if (items.length + files.length > limits.maxFiles) throw new Error(`Choose at most ${limits.maxFiles} photos for this submission.`);
  if (items.reduce((n, i) => n + i.size, 0) + files.reduce((n, f) => n + f.size, 0) > limits.maxTotalBytes) throw new Error('These photos exceed the total upload capacity.');
  if (files.some((f) => f.size > limits.maxFileBytes)) throw new Error(`Each photo must be at most ${Math.floor(limits.maxFileBytes / 1024 / 1024)} MB.`);
}
