/**
 * Tempos partilhados preview (operador) ↔ runtime (saídas).
 * Altera aqui para ajustar debounce em todos os consumidores.
 */

/** ResizeObserver / window.resize — preview e output. */
export const PROJECTION_TYPOGRAPHY_RESIZE_DEBOUNCE_MS = 120;

/**
 * Refresh agendado só nas prévias do operador (tiles).
 * Saídas reais usam `requestAnimationFrame` via `scheduleRefresh()`.
 */
export const PROJECTION_TYPOGRAPHY_PREVIEW_REFRESH_DEBOUNCE_MS = 32;
