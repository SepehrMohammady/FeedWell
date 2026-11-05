// Opens a Settings page from elsewhere, scrolled to a part of it: a sale
// card's See our other apps opens About at More from SeMo Lab. SettingsScreen
// listens; a request made before it has mounted waits for it.

let listener = null;
let pending = null;

/** page: a Settings page ('about'); anchor: where on it ('moreApps') */
export function openSettingsAt(page, anchor) {
  const request = { page, anchor };
  if (listener) listener(request);
  else pending = request;
}

/** SettingsScreen's subscription; returns its removal */
export function onOpenSettingsAt(callback) {
  listener = callback;
  if (pending) {
    const request = pending;
    pending = null;
    callback(request);
  }
  return () => {
    if (listener === callback) listener = null;
  };
}
