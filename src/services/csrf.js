const unsafe = method => !['GET', 'HEAD', 'OPTIONS'].includes((method || 'GET').toUpperCase());
const entry = path => /^\/api\/staff\/(login|otp(?:\/|$)|recovery(?:\/|$))/.test(path) ||
  /^\/api\/client\/(request-otp|verify-otp)$/.test(path) || /^\/api\/printer\/invitations\/[^/]+\/(otp|verify)$/.test(path);

export function createCsrfTransport({ apiBase = '', origin = globalThis.location?.origin || 'http://localhost', fetcher = (...args) => fetch(...args) } = {}) {
  const base = new URL(apiBase || '/', origin);
  const tokens = new Map();
  const pending = new Map();
  function context(url) {
    const target = new URL(url, origin);
    if (target.origin !== base.origin) return {};
    const path = target.pathname;
    const kind = /^\/api\/(client|proofs\/client)(\/|$)/.test(path) ? 'client' :
      /^\/api\/printer\/invitations(\/|$)/.test(path) ? 'printer' :
      /^\/api\/(staff|admin|manager|designer|notifications|system|security|printer\/orders|proofs\/staff)(\/|$)/.test(path) ? 'staff' : null;
    return { kind, path, trustedApi: true, protectedRequest: kind && !entry(path) };
  }
  const headers = (kind = 'staff') => tokens.has(kind) ? { 'X-CSRF-Token': tokens.get(kind) } : {};
  async function ensureToken(kind = 'staff', { force = false, signal } = {}) {
    signal?.throwIfAborted();
    if (!force && tokens.has(kind)) return tokens.get(kind);
    if (!pending.has(kind)) {
      const request = (async () => {
        const response = await fetcher(`${apiBase}/api/csrf/${kind}`, { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(25000) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !/^[a-f0-9]{48}$/.test(data.csrf || '')) {
          tokens.delete(kind);
          throw Object.assign(new Error(data.message || 'Unable to verify this request. Please sign in again.'), { status: response.status || 503, code: data.errorCode });
        }
        tokens.set(kind, data.csrf);
        return data.csrf;
      })().finally(() => pending.delete(kind));
      pending.set(kind, request);
    }
    // Each caller can cancel without cancelling other requests sharing the lookup.
    const shared = pending.get(kind);
    if (!signal) return shared;
    return new Promise((resolve, reject) => {
      const abort = () => reject(signal.reason);
      signal.addEventListener('abort', abort, { once: true });
      shared.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
  }
  async function send(url, options = {}, retried = false) {
    const { kind, path, trustedApi, protectedRequest } = context(url);
    const requestHeaders = new Headers(options.headers);
    // Never send session tokens to public upload services or another origin.
    requestHeaders.delete('X-CSRF-Token');
    if (protectedRequest && unsafe(options.method)) {
      if (!tokens.has(kind) && !requestHeaders.has('Authorization')) await ensureToken(kind, { signal: options.signal });
      for (const [name, value] of Object.entries(headers(kind))) requestHeaders.set(name, value);
    }
    const response = await fetcher(url, { ...options, credentials: trustedApi ? 'include' : options.credentials, headers: requestHeaders });
    const data = kind && response.headers.get('content-type')?.includes('application/json') ? await response.clone().json().catch(() => ({})) : {};
    if (kind && response.ok && /^[a-f0-9]{48}$/.test(data.csrf || '')) tokens.set(kind, data.csrf);
    if (protectedRequest && response.status === 403 && data.errorCode === 'CSRF_TOKEN_INVALID' && !retried) {
      await ensureToken(kind, { force: true, signal: options.signal });
      return send(url, options, true);
    }
    if (kind && ((protectedRequest && response.status === 401) || (response.ok && /\/logout$/.test(path)))) tokens.delete(kind);
    return response;
  }
  return { send, headers, ensureToken };
}
