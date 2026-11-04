import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { InlineLoading } from './SoftFlutter';
let scriptPromise;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => { script.remove(); reject(new Error('timeout')); }, 15000);
    window.tinzelTurnstileReady = () => { clearTimeout(timeout); resolve(window.turnstile); };
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=tinzelTurnstileReady&render=explicit';
    script.async = true;
    script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('unavailable')); };
    document.head.appendChild(script);
  }).catch(error => { scriptPromise = null; throw error; });
  return scriptPromise;
}
export default function TurnstileCheck({ action, onToken, resetKey = 0 }) {
  const { lang } = useLanguage(), container = useRef(null), callback = useRef(onToken);
  callback.current = onToken;
  const [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState(null);
  useEffect(() => {
    const measure = () => {
      const width = container.current?.getBoundingClientRect().width || 0;
      if (width > 0) setSize(width < 300 ? 'compact' : 'flexible');
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false, widget, client;
    callback.current(''); setFailed(false); setLoading(true);
    if (!size) return;
    (async () => {
      const { captcha } = await api.staffAuth.config();
      if (cancelled) return;
      if (!captcha.enabled) { setLoading(false); callback.current('development'); return; }
      if (!captcha.siteKey) throw new Error('unavailable');
      client = await loadTurnstile();
      if (cancelled) return;
      widget = client.render(container.current, {
        sitekey: captcha.siteKey, action, size, language: lang === 'sw' ? 'auto' : 'en',
        callback: token => { if (!cancelled) { setLoading(false); setFailed(false); callback.current(token); } },
        'before-interactive-callback': () => { if (!cancelled) { setLoading(false); setFailed(false); } },
        'expired-callback': () => { if (!cancelled) { callback.current(''); setLoading(true); } },
        'timeout-callback': () => { if (!cancelled) { callback.current(''); setLoading(false); setFailed(true); } },
        'error-callback': () => { if (!cancelled) { callback.current(''); setLoading(false); setFailed(true); } },
      });
    })().catch(() => { if (!cancelled) { setLoading(false); setFailed(true); callback.current(''); } });
    return () => { cancelled = true; if (widget !== undefined) client?.remove(widget); };
  }, [action, resetKey, retry, lang, size]);
  return <div style={{ minWidth: 0 }}>
    {loading && !failed && <InlineLoading>{lang === 'sw' ? 'Ukaguzi wa usalama unapakia…' : 'Loading security check…'}</InlineLoading>}
    <div ref={container} style={{ width: '100%', minWidth: 0 }} />
    {failed && <p role="alert">{lang === 'sw' ? 'Ukaguzi wa usalama haupatikani.' : 'Security check is unavailable.'} <button type="button" onClick={() => setRetry(x => x + 1)}>{lang === 'sw' ? 'Jaribu tena' : 'Retry'}</button></p>}
  </div>;
}
