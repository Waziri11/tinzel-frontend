let installed = false;
let internalChange = false;
let pendingNavigation = false;
let currentEntry;
let restoring;
let approvedHistoryIndex = null;
const locationPath = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

function permission(path) {
  const waits = [];
  const event = new CustomEvent('tinzel:before-navigate', {
    cancelable: true,
    detail: { path, waitUntil: result => waits.push(Promise.resolve(result).catch(() => false)) },
  });
  const allowed = window.dispatchEvent(event);
  if (!waits.length) return allowed;
  return Promise.all(waits).then(results => allowed && results.every(result => result !== false));
}
function announce() {
  internalChange = true;
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  internalChange = false;
}
function commit(path, replace) {
  const index = (currentEntry?.index || 0) + (replace ? 0 : 1);
  window.history[replace ? 'replaceState' : 'pushState']({ ...(replace ? window.history.state : {}), tinzelEntry: index }, '', path);
  currentEntry = { path: locationPath(), index };
  announce();
}
export function navigate(path, { replace = false, confirmed = false } = {}) {
  if (locationPath() === path) return true;
  if (pendingNavigation) return false;
  // confirmed is only for callers that already awaited their complete leave guard.
  const allowed = confirmed ? true : permission(path);
  if (typeof allowed === 'boolean') {
    if (allowed) commit(path, replace);
    return allowed;
  }
  pendingNavigation = true;
  allowed.then(ok => { if (ok) commit(path, replace); }).finally(() => { pendingNavigation = false; });
  return false;
}

// Capture native history changes before React sees them. Restore the existing
// entry while an asynchronous leave confirmation is open, then replay on approval.
export function installNavigationGuard() {
  if (installed) return;
  installed = true;
  const index = Number.isInteger(window.history.state?.tinzelEntry) ? window.history.state.tinzelEntry : 0;
  window.history.replaceState({ ...window.history.state, tinzelEntry: index }, '', window.location.href);
  currentEntry = { path: locationPath(), index };
  window.addEventListener('popstate', event => {
    if (internalChange) return;
    const target = { path: locationPath(), index: event.state?.tinzelEntry };
    if (restoring) {
      event.stopImmediatePropagation();
      const done = restoring;
      restoring = null;
      done();
      return;
    }
    if (approvedHistoryIndex !== null && target.index === approvedHistoryIndex) {
      approvedHistoryIndex = null;
      currentEntry = target;
      return;
    }
    const allowed = pendingNavigation ? false : permission(target.path);
    if (allowed === true) { currentEntry = target; return; }
    event.stopImmediatePropagation();
    const origin = currentEntry;
    pendingNavigation = true;
    const delta = Number.isInteger(target.index) ? target.index - origin.index : 0;
    if (delta) {
      const restored = new Promise(resolve => { restoring = resolve; });
      window.history.go(-delta);
      Promise.all([Promise.resolve(allowed), restored]).then(([ok]) => {
        pendingNavigation = false;
        if (ok) { approvedHistoryIndex = target.index; window.history.go(delta); }
      });
    } else {
      window.history.replaceState({ ...window.history.state, tinzelEntry: origin.index }, '', origin.path);
      Promise.resolve(allowed).then(ok => {
        pendingNavigation = false;
        if (ok) commit(target.path, true);
      });
    }
  }, true);
}
export function editionSlug(path = window.location.pathname) {
  const match = path.match(/^\/(?:catalogue|showcase)\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
