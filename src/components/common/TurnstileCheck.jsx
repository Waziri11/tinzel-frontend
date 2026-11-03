import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
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
  useEffect(() => {
    let cancelled = false, widget, client;
    callback.current(''); setFailed(false);
    (async () => {
      const { captcha } = await api.staffAuth.config();
      if (cancelled) return;
      if (!captcha.enabled) { callback.current('development'); return; }
      if (!captcha.siteKey) throw new Error('unavailable');
      client = await loadTurnstile();
      if (cancelled) return;
      widget = client.render(container.current, {
        sitekey: captcha.siteKey, action, size: 'flexible', language: lang === 'sw' ? 'auto' : 'en',
        callback: token => { if (!cancelled) { setFailed(false); callback.current(token); } },
        'expired-callback': () => { if (!cancelled) callback.current(''); },
        'error-callback': () => { if (!cancelled) { callback.current(''); setFailed(true); } },
      });
    })().catch(() => { if (!cancelled) { setFailed(true); callback.current(''); } });
    return () => { cancelled = true; if (widget !== undefined) client?.remove(widget); };
  }, [action, resetKey, retry, lang]);
  return <div><div ref={container} />{failed && <p role="alert">{lang === 'sw' ? 'Ukaguzi wa usalama haupatikani.' : 'Security check is unavailable.'} <button type="button" onClick={() => setRetry(x => x + 1)}>{lang === 'sw' ? 'Jaribu tena' : 'Retry'}</button></p>}</div>;
}
