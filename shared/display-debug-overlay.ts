/** Preferência do operador — lida pelas vistas /live, /projector, /vocal, /stage, /player (CAD-179). */
export const OPERATOR_PREFS_KEY = 'livepraise.operator.prefs';

export function isDisplayDebugOverlayEnabled(): boolean {
  try {
    const raw = localStorage.getItem(OPERATOR_PREFS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { displayDebugOverlay?: boolean };
    return Boolean(parsed.displayDebugOverlay);
  } catch {
    return false;
  }
}

export function syncDisplayDebugOverlayState(doc: Document = document): void {
  doc.body.dataset.displayDebug = isDisplayDebugOverlayEnabled() ? 'true' : 'false';
}

export function updateLastActionBadge(el: HTMLElement, text: string): void {
  syncDisplayDebugOverlayState();
  if (!isDisplayDebugOverlayEnabled()) return;
  el.textContent = text;
  document.body.dataset.showViewerStatus = 'true';
}

export function attachDisplayDebugOverlayListener(): void {
  syncDisplayDebugOverlayState();
  window.addEventListener('storage', (event) => {
    if (event.key === OPERATOR_PREFS_KEY) syncDisplayDebugOverlayState();
  });
}
