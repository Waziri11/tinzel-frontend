// Run before React so the first public page can mount behind the opening.
(() => {
  const overlay = document.getElementById('tinzel-intro');
  const root = document.getElementById('root');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Direct links should open their page immediately, including recovery controls.
  if (location.pathname !== '/' || motion.matches || window.tinzelReady) return;

  const seenKey = 'tinzel-intro-seen';
  let language = navigator.language;
  try {
    if (sessionStorage.getItem(seenKey)) return;
    language = localStorage.getItem('tinzel_language') || sessionStorage.getItem('tinzel_language') || language;
  } catch {
    // Visitors with storage disabled can still play and skip the opening.
  }
  const skip = overlay.querySelector('button');
  if (/^sw\b/i.test(language)) {
    skip.textContent = 'Ruka utangulizi';
    skip.lang = 'sw';
  }

  const events = new AbortController();
  const options = { signal: events.signal };
  const watchdog = setTimeout(finish, 6500);

  function finish(fade = false) {
    if (events.signal.aborted) return;
    events.abort();
    clearTimeout(watchdog);
    const restoreFocus = overlay.contains(document.activeElement);
    root.inert = false;
    document.documentElement.classList.remove('tinzel-intro-active');
    if (fade) {
      overlay.inert = true;
      overlay.classList.add('is-leaving');
      setTimeout(() => { overlay.hidden = true; }, 300);
    } else {
      overlay.hidden = true;
    }
    if (restoreFocus) root.querySelector('a[href], button, [tabindex="0"]')?.focus();
    try { sessionStorage.setItem(seenKey, '1'); } catch { /* Storage is optional. */ }
  }

  skip.addEventListener('click', () => finish(), options);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') finish();
  }, options);
  motion.addEventListener('change', event => { if (event.matches) finish(); }, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); }, options);
  window.addEventListener('pagehide', () => finish(), options);
  window.addEventListener('tinzel:ready', () => finish(true), options);

  root.inert = true;
  document.documentElement.classList.add('tinzel-intro-active');
  overlay.hidden = false;
  overlay.classList.add('is-playing');
})();
