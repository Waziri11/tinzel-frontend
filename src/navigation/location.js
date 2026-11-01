export function navigate(path, {replace=false}={}) {
  if (`${window.location.pathname}${window.location.search}` === path) return;
  window.history[replace?'replaceState':'pushState']({},'',path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
export function editionSlug(path=window.location.pathname) {
  const match=path.match(/^\/(?:catalogue|showcase)\/([^/]+)\/?$/);
  if(!match)return null;
  try{return decodeURIComponent(match[1]);}catch{return null;}
}
