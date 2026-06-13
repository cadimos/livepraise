/** Estado visível nas vistas públicas (/live, /vocal, /stage, /player, projetor). */
export function setViewerStatus(el: HTMLElement | null, text: string): void {
  if (!el) return;
  const msg = String(text ?? '').trim();
  el.textContent = msg;
  document.body.dataset.showViewerStatus = msg ? 'true' : 'false';
}

export function clearViewerStatus(el: HTMLElement | null): void {
  setViewerStatus(el, '');
}
