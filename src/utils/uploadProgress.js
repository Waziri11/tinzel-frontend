export function uploadSummary(items) {
  const totalBytes = items.reduce((sum, item) => sum + (item.size || 0), 0);
  const sentBytes = items.reduce((sum, item) => sum + (item.size || 0) *
    (item.state === 'complete' ? 1 : Math.min(99, Math.max(0, item.progress || 0)) / 100), 0);
  const done = items.filter((item) => item.state === 'complete').length;
  const active = items.filter((item) => item.state === 'uploading');
  return { total: items.length, done, totalBytes, sentBytes, active,
    attention: items.filter((item) => ['failed', 'needs_file'].includes(item.state)),
    ready: items.length > 0 && done === items.length,
    percent: done === items.length && items.length ? 100 : Math.min(99, totalBytes ? Math.floor(sentBytes / totalBytes * 100) : 0) };
}

export const formatUploadBytes = (bytes) => bytes < 1024 * 1024
  ? `${Math.round(bytes / 1024)} KiB` : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;

export function uploadIsStalled(active, now = Date.now()) {
  return active.length > 0 && active.every((item) => now - (item.lastProgressAt || now) >= 20000);
}
