/** Preferência do operador — lida pelas vistas /live, /projector, /vocal, /stage, /player (CAD-179). */
export const OPERATOR_PREFS_KEY = 'livepraise.operator.prefs';

export function isDisplayDebugOverlayEnabled() {
  try {
    const raw = localStorage.getItem(OPERATOR_PREFS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed.displayDebugOverlay);
  } catch {
    return false;
  }
}

export function syncDisplayDebugOverlayState(doc = document) {
  doc.body.dataset.displayDebug = isDisplayDebugOverlayEnabled() ? 'true' : 'false';
}

export function updateLastActionBadge(el, text) {
  syncDisplayDebugOverlayState();
  if (!isDisplayDebugOverlayEnabled()) {
    return;
  }
  el.textContent = text;
  document.body.dataset.showViewerStatus = 'true';
}

export function attachDisplayDebugOverlayListener() {
  syncDisplayDebugOverlayState();
  window.addEventListener('storage', (event) => {
    if (event.key === OPERATOR_PREFS_KEY) syncDisplayDebugOverlayState();
  });
}
