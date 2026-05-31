/**
 * Auto-ajuste de font-size para caber no contentor (CAD-313).
 * Modo preview: cabe no tile; output: maximiza área útil com min/max do perfil.
 */

/** Prévia do operador — pode ir abaixo de minFontPx para caber no tile (CAD-313 §3.1). */
export const PREVIEW_TEXTFILL_MIN_PX = 8;

const PREVIEW_FIT_SLACK_PX = 2;
const OUTPUT_FIT_SLACK_PX = 2;
/** `.proximo` usa teto de fonte menor que `.atual` (paridade stage-return.css). */
const STAGE_RETURN_PROXIMO_MAX_SCALE = 0.72;
const STAGE_RETURN_OUTPUT_FLOOR_PX = 10;

function textTarget(contentEl, spanSelector) {
  if (spanSelector === ':scope') return contentEl;
  if (spanSelector) {
    return contentEl.querySelector(spanSelector);
  }
  return (
    contentEl.querySelector('.content > span') ??
    contentEl.querySelector('.content span') ??
    contentEl.querySelector('.texto') ??
    null
  );
}

function measureBox(contentEl, measureSelector, measureElement) {
  if (measureElement) return measureElement;
  if (measureSelector === null) return contentEl;
  if (measureSelector) {
    return contentEl.querySelector(measureSelector) ?? contentEl;
  }
  return (
    contentEl.querySelector('.content') ??
    contentEl.querySelector('.texto') ??
    contentEl
  );
}

function stageReturnTextfillMeasureBox(textoEl) {
  return textoEl;
}

function ensureTextoFillSpan(textoEl) {
  let span = textoEl.querySelector(':scope > .texto-fill');
  if (span) return span;

  span = document.createElement('span');
  span.className = 'texto-fill';
  while (textoEl.firstChild) {
    span.appendChild(textoEl.firstChild);
  }
  textoEl.appendChild(span);
  return span;
}

function stageReturnMaxFontPxScale(textoEl) {
  return textoEl.closest('.proximo') ? STAGE_RETURN_PROXIMO_MAX_SCALE : 1;
}

function scaledFontBounds(minPx, maxPx, scale, mode) {
  const profileLo = Math.min(minPx, maxPx);
  const profileHi = Math.max(minPx, maxPx);
  const hi = Math.max(profileLo, Math.round(profileHi * scale));
  const lo = mode === 'preview' ? PREVIEW_TEXTFILL_MIN_PX : Math.min(profileLo, hi);
  return { lo, hi };
}

function prepareSpan(span) {
  if (!span.classList.contains('texto')) {
    span.style.display = 'block';
  }
  span.style.width = '100%';
  span.style.maxWidth = '100%';
  span.style.lineHeight = '1.35';
  span.style.overflowWrap = 'break-word';
  span.style.wordBreak = 'break-word';
}

function textFitsBox(span, box, slackPx) {
  void span.offsetHeight;
  const maxH = box.clientHeight - slackPx;
  if (maxH <= 0) return false;
  return Math.ceil(span.scrollHeight) <= maxH;
}

function runBinarySearch(span, box, loBound, hiBound, slackPx) {
  let lo = loBound;
  let hi = hiBound;
  let best = loBound;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    span.style.fontSize = `${mid}px`;
    if (textFitsBox(span, box, slackPx)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

function resolveSlackPx(options, mode, extraPx = 0) {
  const baseSlack = mode === 'preview' ? PREVIEW_FIT_SLACK_PX : OUTPUT_FIT_SLACK_PX;
  return baseSlack + (options.fitSlackPx ?? 0) + extraPx;
}

function applyStageReturnCoupledTextfill(
  rootEl,
  minPx,
  maxPx,
  enabled,
  options = {},
  mode = 'output',
) {
  const musicRoot = rootEl.querySelector('.retorno-musica');
  if (!musicRoot) return false;

  const textos = Array.from(musicRoot.querySelectorAll('.texto'));
  if (textos.length < 2) return false;

  const slackPx = resolveSlackPx(options, mode, 1);
  const profileLo = Math.min(minPx, maxPx);
  const hiBound = Math.max(minPx, maxPx);
  const floorPx = mode === 'preview' ? PREVIEW_TEXTFILL_MIN_PX : STAGE_RETURN_OUTPUT_FLOOR_PX;

  const entries = textos.map((node) => {
    const span = ensureTextoFillSpan(node);
    prepareSpan(span);
    return {
      span,
      box: stageReturnTextfillMeasureBox(node),
      scale: stageReturnMaxFontPxScale(node),
    };
  });

  const allReady = entries.every(
    (entry) => entry.box.clientHeight > 0 && entry.box.clientWidth > 0,
  );
  if (!allReady) {
    for (const entry of entries) {
      entry.span.style.fontSize = `${Math.max(floorPx, Math.round(profileLo * entry.scale))}px`;
    }
    return true;
  }

  const fitsAtBase = (basePx) => {
    for (const entry of entries) {
      const size = Math.max(floorPx, Math.round(basePx * entry.scale));
      entry.span.style.fontSize = `${size}px`;
      if (!textFitsBox(entry.span, entry.box, slackPx)) return false;
    }
    return true;
  };

  if (!enabled) {
    for (const entry of entries) {
      entry.span.style.fontSize = `${Math.max(floorPx, Math.round(hiBound * entry.scale))}px`;
    }
    return true;
  }

  let lo = profileLo;
  let hi = hiBound;
  let best = profileLo;

  if (!fitsAtBase(lo)) {
    lo = floorPx;
    best = floorPx;
  }

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fitsAtBase(mid)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  for (const entry of entries) {
    entry.span.style.fontSize = `${Math.max(floorPx, Math.round(best * entry.scale))}px`;
  }
  return true;
}

function applyTextfill(contentEl, minPx, maxPx, enabled, options = {}, mode = 'output') {
  const span = textTarget(contentEl, options.spanSelector);
  const box = measureBox(contentEl, options.measureSelector, options.measureElement);
  if (!span || !box) return;

  const scale = options.maxFontPxScale ?? 1;
  const { lo: loBound, hi: hiBound } = scaledFontBounds(minPx, maxPx, scale, mode);
  const slackPx = resolveSlackPx(options, mode);
  const fallbackPx = enabled ? loBound : hiBound;

  if (box.clientHeight <= 0 || box.clientWidth <= 0) {
    span.style.fontSize = `${fallbackPx}px`;
    span.style.visibility = '';
    return;
  }

  prepareSpan(span);

  const measure = () => {
    span.style.fontSize = `${loBound}px`;
    let targetPx = enabled
      ? runBinarySearch(span, box, loBound, hiBound, slackPx)
      : hiBound;

    if (
      enabled &&
      mode === 'output' &&
      span.closest('.retorno-musica, .retorno-biblia') &&
      !textFitsBox(span, box, slackPx)
    ) {
      targetPx = runBinarySearch(span, box, STAGE_RETURN_OUTPUT_FLOOR_PX, loBound - 1, slackPx);
      targetPx = Math.max(STAGE_RETURN_OUTPUT_FLOOR_PX, targetPx);
    }

    span.style.fontSize = `${targetPx}px`;
  };

  if (options.suppressVisibilityToggle) {
    measure();
    return;
  }

  span.style.visibility = 'hidden';
  try {
    measure();
  } finally {
    span.style.visibility = '';
  }
}

export function applyPreviewTextfill(contentEl, minPx, maxPx, enabled, options) {
  applyTextfill(contentEl, minPx, maxPx, enabled, options, 'preview');
}

async function waitForLayoutFrames() {
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Aguarda @font-face no tamanho de medição e reflow antes de medir texto (CAD-313). */
export async function waitForProjectionTypographyLayout(options = {}) {
  const { fontFamily, fontWeight, fontStyle, measureFontPx = 16 } = options;
  if (fontFamily && typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.load(
        `${fontWeight ?? 400} ${fontStyle ?? 'normal'} ${measureFontPx}px ${fontFamily}`,
      );
    } catch {
      /* @font-face pode ainda aplicar */
    }
    await document.fonts.ready;
  }
  await waitForLayoutFrames();
}

async function ensureStageReturnTextfillBoxes(rootEl) {
  const boxes = rootEl.querySelectorAll('.retorno-musica .texto, .retorno-biblia .texto');
  if (!boxes.length) return;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const ready = Array.from(boxes).every(
      (box) => box.clientHeight >= 24 && box.clientWidth >= 24,
    );
    if (ready) return;
    await waitForLayoutFrames();
  }
}

async function ensureMeasurableBox(contentEl, mode = 'output') {
  const box =
    contentEl.querySelector('.content') ??
    contentEl.querySelector('.texto') ??
    contentEl;

  const minHeight = mode === 'preview' ? 8 : 24;
  const minWidth = mode === 'preview' ? 8 : 24;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    if (box.clientHeight >= minHeight && box.clientWidth >= minWidth) return;
    await new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
}

async function runRefreshTextfill(contentEl, minPx, maxPx, enabled, options, mode) {
  const { fontFamily, fontWeight, fontStyle, ...textfillOptions } = options;
  const measureFontPx = Math.max(minPx, maxPx);

  await waitForProjectionTypographyLayout({
    fontFamily,
    fontWeight,
    fontStyle,
    measureFontPx,
  });
  await ensureMeasurableBox(contentEl, mode);

  const applyFn = mode === 'preview' ? applyPreviewTextfill : applyOutputTextfill;
  applyFn(contentEl, minPx, maxPx, enabled, textfillOptions);
  await waitForLayoutFrames();
  applyFn(contentEl, minPx, maxPx, enabled, textfillOptions);
}

/** Aguarda fontes/layout e aplica textfill — prévias do operador (CAD-313). */
export async function refreshPreviewTextfill(
  contentEl,
  minPx,
  maxPx,
  enabled,
  options = {},
) {
  await runRefreshTextfill(contentEl, minPx, maxPx, enabled, options, 'preview');
}

export function applyOutputTextfill(contentEl, minPx, maxPx, enabled, options) {
  applyTextfill(contentEl, minPx, maxPx, enabled, options, 'output');
}

/** Aguarda fontes/layout e aplica textfill — saídas reais (CAD-313). */
export async function refreshOutputTextfill(
  contentEl,
  minPx,
  maxPx,
  enabled,
  options = {},
) {
  await runRefreshTextfill(contentEl, minPx, maxPx, enabled, options, 'output');
}

/** Aplica textfill em todos os `.texto` (retorno de palco). */
export function applyOutputTextfillAll(rootEl, minPx, maxPx, enabled, options) {
  if (applyStageReturnCoupledTextfill(rootEl, minPx, maxPx, enabled, options, 'output')) {
    return;
  }

  const nodes = rootEl.querySelectorAll('.texto');
  if (!nodes.length) {
    applyOutputTextfill(rootEl, minPx, maxPx, enabled, options);
    return;
  }
  for (const node of nodes) {
    ensureTextoFillSpan(node);
    applyOutputTextfill(node, minPx, maxPx, enabled, {
      ...options,
      spanSelector: ':scope > .texto-fill',
      measureSelector: null,
      measureElement: stageReturnTextfillMeasureBox(node),
      maxFontPxScale: stageReturnMaxFontPxScale(node),
      suppressVisibilityToggle: true,
    });
  }
}

/** Aguarda fontes/layout e aplica textfill em cada `.texto` (retorno de palco). */
export async function refreshOutputTextfillAll(
  rootEl,
  minPx,
  maxPx,
  enabled,
  options = {},
) {
  const { fontFamily, fontWeight, fontStyle, fitSlackPx } = options;
  const measureFontPx = Math.max(minPx, maxPx);
  await waitForProjectionTypographyLayout({
    fontFamily,
    fontWeight,
    fontStyle,
    measureFontPx,
  });
  await ensureMeasurableBox(rootEl, 'output');
  await ensureStageReturnTextfillBoxes(rootEl);

  rootEl.style.visibility = 'hidden';
  try {
    applyOutputTextfillAll(rootEl, minPx, maxPx, enabled, { fitSlackPx });
    await waitForLayoutFrames();
    applyOutputTextfillAll(rootEl, minPx, maxPx, enabled, { fitSlackPx });
  } finally {
    rootEl.style.visibility = '';
  }
}
