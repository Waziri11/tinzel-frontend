/** XHR is used only for file bodies because it exposes real upload byte events. */
export function uploadMultipart(url, body, { headers = {}, method = 'POST', signal, progress = () => {}, timeout = 300000, xhrFactory = () => new XMLHttpRequest() } = {}) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const xhr = xhrFactory();
    xhr.open(method, url);
    xhr.withCredentials = true;
    xhr.timeout = timeout;
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    const abort = () => xhr.abort();
    signal?.addEventListener('abort', abort, { once: true });
    xhr.onloadend = () => signal?.removeEventListener('abort', abort);
    xhr.upload.onprogress = event => progress({
      stage: 'uploading', bytes: event.loaded, total: event.lengthComputable ? event.total : null,
      percent: event.lengthComputable && event.total > 0 ? Math.min(99, event.loaded / event.total * 100) : null,
    });
    xhr.upload.onload = () => progress({ stage: 'finalizing', percent: null });
    xhr.onload = () => {
      try {
        const response = new Response(xhr.status === 204 ? null : xhr.responseText, { status: xhr.status, headers: { 'Content-Type': xhr.getResponseHeader('Content-Type') || 'application/json' } });
        Object.defineProperty(response, 'url', { value: url });
        resolve(response);
      } catch (error) { reject(error); }
    };
    xhr.onerror = () => reject(new Error('Connection interrupted. Check the saved result before retrying.'));
    xhr.ontimeout = () => reject(Object.assign(new Error('Upload timed out. Check the saved result before retrying.'), { status: 504 }));
    xhr.onabort = () => reject(new DOMException('Transfer cancelled', 'AbortError'));
    progress({ stage: 'uploading', bytes: 0, total: null, percent: null });
    if (signal?.aborted) { reject(signal.reason); return; }
    xhr.send(body);
  });
}
