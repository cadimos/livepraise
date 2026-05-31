/** Estado visível nas vistas públicas (/live, /vocal, /stage, /player, projetor). */
export function setViewerStatus(el, text) {
  if (!el) return;
  const msg = String(text ?? '').trim();
  el.textContent = msg;
  document.body.dataset.showViewerStatus = msg ? 'true' : 'false';
}

export function clearViewerStatus(el) {
  setViewerStatus(el, '');
}
