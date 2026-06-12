import {
  collectTextfillLayoutContext,
  isTextfillDiagnosticsEnabled,
  logTextfillDiagnostic,
} from './projection-textfill-diagnostics.js';

export interface ProjectionTextfillOptions {
  spanSelector?: string;
  measureSelector?: string | null;
  /** Caixa de medição explícita (retorno de palco). */
  measureElement?: HTMLElement;
  /** Escala de maxFontPx (p.ex. `.proximo` menor que `.atual`). */
  maxFontPxScale?: number;
  /** Medição em lote — não alternar visibility por nó (evita piscar). */
  suppressVisibilityToggle?: boolean;
  /** Margem extra (px) — p.ex. extensão da sombra de texto. */
  fitSlackPx?: number;
  /** Superfície para diagnóstico (ex.: projector, operator-preview). */
  diagnosticSurface?: string;
  /** Passagem do refresh (1 ou 2). */
  diagnosticPass?: number;
}

/** `.proximo` usa teto de fonte menor que `.atual` (paridade stage-return.css). */
const STAGE_RETURN_PROXIMO_MAX_SCALE = 0.72;
/** Piso em saídas reais quando o perfil min não cabe (mobile / muito texto). */
const STAGE_RETURN_OUTPUT_FLOOR_PX = 10;

/** Prévia do operador — pode ir abaixo de minFontPx para caber no tile (CAD-313 §3.1). */
export const PREVIEW_TEXTFILL_MIN_PX = 8;

const PREVIEW_FIT_SLACK_PX = 2;
const OUTPUT_FIT_SLACK_PX = 2;
/** scrollWidth ≈ clientWidth em blocos width:100% com wrap — tolerância subpixel. */
const WIDTH_FIT_TOLERANCE_PX = 2;
/** line-height / subpixel — evita rejeitar tamanho que já passou na busca binária. */
const HEIGHT_FIT_TOLERANCE_PX = 3;

type TextfillMode = 'preview' | 'output';

function textTarget(
  contentEl: HTMLElement,
  spanSelector?: string,
): HTMLElement | null {
  if (spanSelector === ':scope') return contentEl;
  if (spanSelector) {
    return contentEl.querySelector<HTMLElement>(spanSelector);
  }
  return (
    contentEl.querySelector<HTMLElement>('.content > span') ??
    contentEl.querySelector<HTMLElement>('.content span') ??
    contentEl.querySelector<HTMLElement>('.texto') ??
    null
  );
}

function measureBox(
  contentEl: HTMLElement,
  measureSelector?: string | null,
  measureElement?: HTMLElement,
): HTMLElement {
  if (measureElement) return measureElement;
  if (measureSelector === null) return contentEl;
  if (measureSelector) {
    return contentEl.querySelector<HTMLElement>(measureSelector) ?? contentEl;
  }
  return (
    contentEl.querySelector<HTMLElement>('.content') ??
    contentEl.querySelector<HTMLElement>('.texto') ??
    contentEl
  );
}

function stageReturnTextfillMeasureBox(textoEl: HTMLElement): HTMLElement {
  return textoEl;
}

function ensureTextoFillSpan(textoEl: HTMLElement): HTMLElement {
  let span = textoEl.querySelector<HTMLElement>(':scope > .texto-fill');
  if (span) return span;

  span = document.createElement('span');
  span.className = 'texto-fill';
  while (textoEl.firstChild) {
    span.appendChild(textoEl.firstChild);
  }
  textoEl.appendChild(span);
  return span;
}

function stageReturnMaxFontPxScale(textoEl: HTMLElement): number {
  return textoEl.closest('.proximo') ? STAGE_RETURN_PROXIMO_MAX_SCALE : 1;
}

function scaledFontBounds(
  minPx: number,
  maxPx: number,
  scale: number,
  mode: TextfillMode,
): { lo: number; hi: number } {
  const profileLo = Math.min(minPx, maxPx);
  const profileHi = Math.max(minPx, maxPx);
  const hi = Math.max(profileLo, Math.round(profileHi * scale));
  const lo =
    mode === 'preview'
      ? PREVIEW_TEXTFILL_MIN_PX
      : Math.min(profileLo, hi);
  return { lo, hi };
}

function prepareSpan(span: HTMLElement): void {
  if (!span.classList.contains('texto')) {
    span.style.display = 'block';
  }
  span.style.width = '100%';
  span.style.maxWidth = '100%';
  span.style.lineHeight = '1.35';
  span.style.overflowWrap = 'break-word';
  span.style.wordBreak = 'break-word';
}

/** Texto cabe na área útil de `.content` (só o corpo central). */
function textFitsBox(span: HTMLElement, box: HTMLElement, slackPx: number): boolean {
  void span.offsetHeight;
  const maxH = box.clientHeight - slackPx;
  if (maxH <= 0 || box.clientWidth <= 0) return false;
  const heightOverflow = Math.ceil(span.scrollHeight) - maxH;
  if (heightOverflow > HEIGHT_FIT_TOLERANCE_PX) return false;

  // Largura: em blocos com width:100% o scrollWidth iguala o clientWidth mesmo com
  // quebra de linha válida. Só falha com overflow horizontal real.
  const widthOverflow = Math.ceil(span.scrollWidth) - box.clientWidth;
  return widthOverflow <= WIDTH_FIT_TOLERANCE_PX;
}

function applyTextfill(
  contentEl: HTMLElement,
  minPx: number,
  maxPx: number,
  enabled: boolean,
  options: ProjectionTextfillOptions = {},
  mode: TextfillMode = 'output',
): void {
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
    recordTextfillDiagnostic(contentEl, span, box, {
      mode,
      minPx,
      maxPx,
      enabled,
      loBound,
      hiBound,
      slackPx,
      resultFontPx: fallbackPx,
      options,
      reason: 'zero-box',
    });
    return;
  }

  prepareSpan(span);

  const measure = (): void => {
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
      const floorPx = STAGE_RETURN_OUTPUT_FLOOR_PX;
      targetPx = runBinarySearch(span, box, floorPx, loBound - 1, slackPx);
      targetPx = Math.max(floorPx, targetPx);
    }

    span.style.fontSize = `${targetPx}px`;
    recordTextfillDiagnostic(contentEl, span, box, {
      mode,
      minPx,
      maxPx,
      enabled,
      loBound,
      hiBound,
      slackPx,
      resultFontPx: targetPx,
      options,
    });
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

function runBinarySearch(
  span: HTMLElement,
  box: HTMLElement,
  loBound: number,
  hiBound: number,
  slackPx: number,
): number {
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

  span.style.fontSize = `${best}px`;
  return best;
}

function recordTextfillDiagnostic(
  contentEl: HTMLElement,
  span: HTMLElement,
  box: HTMLElement,
  data: {
    mode: TextfillMode;
    minPx: number;
    maxPx: number;
    enabled: boolean;
    loBound: number;
    hiBound: number;
    slackPx: number;
    resultFontPx: number;
    options: ProjectionTextfillOptions;
    reason?: string;
  },
): void {
  if (!isTextfillDiagnosticsEnabled()) return;
  const layout = collectTextfillLayoutContext(contentEl, span, box);
  logTextfillDiagnostic({
    surface: data.options.diagnosticSurface ?? data.mode,
    mode: data.mode,
    pass: data.options.diagnosticPass ?? 1,
    minFontPx: data.minPx,
    maxFontPx: data.maxPx,
    textfillEnabled: data.enabled,
    loBound: data.loBound,
    hiBound: data.hiBound,
    slackPx: data.slackPx,
    resultFontPx: data.resultFontPx,
    fits: textFitsBox(span, box, data.slackPx),
    ...layout,
    textSnippet: data.reason
      ? `${layout.textSnippet} [${data.reason}]`
      : layout.textSnippet,
  });
}

function resolveSlackPx(
  options: ProjectionTextfillOptions,
  mode: TextfillMode,
  extraPx = 0,
): number {
  const baseSlack = mode === 'preview' ? PREVIEW_FIT_SLACK_PX : OUTPUT_FIT_SLACK_PX;
  return baseSlack + (options.fitSlackPx ?? 0) + extraPx;
}

/**
 * Louvor retorno — escala única para Agora + Próximo (evita uma faixa estourar no mobile).
 */
function applyStageReturnCoupledTextfill(
  rootEl: HTMLElement,
  minPx: number,
  maxPx: number,
  enabled: boolean,
  options: ProjectionTextfillOptions = {},
  mode: TextfillMode = 'output',
): boolean {
  const musicRoot = rootEl.querySelector<HTMLElement>('.retorno-musica');
  if (!musicRoot) return false;

  const textos = Array.from(musicRoot.querySelectorAll<HTMLElement>('.texto'));
  if (textos.length < 2) return false;

  const slackPx = resolveSlackPx(options, mode, 1);
  const profileLo = Math.min(minPx, maxPx);
  const hiBound = Math.max(minPx, maxPx);
  const floorPx =
    mode === 'preview' ? PREVIEW_TEXTFILL_MIN_PX : STAGE_RETURN_OUTPUT_FLOOR_PX;

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

  const fitsAtBase = (basePx: number): boolean => {
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

/** Modo prévia — cabe no tile; maximiza px até maxFontPx (CAD-313). */
export function applyPreviewTextfill(
  contentEl: HTMLElement,
  minPx: number,
  maxPx: number,
  enabled: boolean,
  options?: ProjectionTextfillOptions,
): void {
  applyTextfill(contentEl, minPx, maxPx, enabled, options, 'preview');
}

export interface RefreshPreviewTextfillOptions extends ProjectionTextfillOptions {
  fontFamily?: string;
  fontWeight?: number | string;
  fontStyle?: string;
}

export type RefreshOutputTextfillOptions = RefreshPreviewTextfillOptions;

async function waitForLayoutFrames(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Aguarda @font-face no tamanho de medição e reflow antes de medir texto (CAD-313). */
export async function waitForProjectionTypographyLayout(
  options: Pick<
    RefreshPreviewTextfillOptions,
    'fontFamily' | 'fontWeight' | 'fontStyle'
  > & { measureFontPx?: number } = {},
): Promise<void> {
  const { fontFamily, fontWeight, fontStyle, measureFontPx = 16 } = options;
  if (fontFamily && typeof document !== 'undefined' && 'fonts' in document) {
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

async function ensureStageReturnTextfillBoxes(rootEl: HTMLElement): Promise<void> {
  const boxes = rootEl.querySelectorAll<HTMLElement>(
    '.retorno-musica .texto, .retorno-biblia .texto',
  );
  if (!boxes.length) return;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const ready = Array.from(boxes).every(
      (box) => box.clientHeight >= 24 && box.clientWidth >= 24,
    );
    if (ready) return;
    await waitForLayoutFrames();
  }
}

function measureLayoutReady(
  contentEl: HTMLElement,
  box: HTMLElement,
  mode: TextfillMode,
): boolean {
  const minHeight = mode === 'preview' ? 16 : 24;
  const minWidth = mode === 'preview' ? 16 : 24;
  const height = box.clientHeight;
  const width = box.clientWidth;
  if (height < minHeight || width < minWidth) return false;

  const rodape = contentEl.querySelector<HTMLElement>('.rodape');
  if (rodape && rodape.textContent?.trim() && rodape.offsetHeight <= 0) {
    return false;
  }

  const titulo = contentEl.querySelector<HTMLElement>('.titulo');
  if (titulo && titulo.textContent?.trim() && titulo.offsetHeight <= 0) {
    return false;
  }

  return true;
}

async function ensureMeasurableBox(
  contentEl: HTMLElement,
  mode: TextfillMode = 'output',
): Promise<void> {
  const box =
    contentEl.querySelector<HTMLElement>('.content') ??
    contentEl.querySelector<HTMLElement>('.texto') ??
    contentEl;

  let stableHeight = -1;
  let stableWidth = -1;
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const height = box.clientHeight;
    const width = box.clientWidth;
    if (
      measureLayoutReady(contentEl, box, mode) &&
      height === stableHeight &&
      width === stableWidth
    ) {
      return;
    }
    stableHeight = height;
    stableWidth = width;
    await waitForLayoutFrames();
  }
}

async function runRefreshTextfill(
  contentEl: HTMLElement,
  minPx: number,
  maxPx: number,
  enabled: boolean,
  options: RefreshPreviewTextfillOptions,
  mode: TextfillMode,
): Promise<void> {
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
  const fillOptions: ProjectionTextfillOptions = {
    ...textfillOptions,
    suppressVisibilityToggle: true,
  };

  /* Ocultar o root durante ambas as passagens — evita flash entre frames e entre medições. */
  contentEl.style.visibility = 'hidden';
  try {
    applyFn(contentEl, minPx, maxPx, enabled, {
      ...fillOptions,
      diagnosticPass: 1,
    });

    /* Segunda passagem após o grid (topo/rodapé fixos) estabilizar a área de `.content`. */
    await waitForLayoutFrames();
    applyFn(contentEl, minPx, maxPx, enabled, {
      ...fillOptions,
      diagnosticPass: 2,
    });
  } finally {
    contentEl.style.visibility = '';
  }
}

/** Aguarda fontes/layout e aplica textfill — prévias do operador (CAD-313). */
export async function refreshPreviewTextfill(
  contentEl: HTMLElement,
  minPx: number,
  maxPx: number,
  enabled: boolean,
  options: RefreshPreviewTextfillOptions = {},
): Promise<void> {
  await runRefreshTextfill(contentEl, minPx, maxPx, enabled, options, 'preview');
}

/** Modo output — maximiza área útil em projeção real (CAD-313). */
export function applyOutputTextfill(
  contentEl: HTMLElement,
  minPx: number,
  maxPx: number,
  enabled: boolean,
  options?: ProjectionTextfillOptions,
): void {
  applyTextfill(contentEl, minPx, maxPx, enabled, options, 'output');
}

/** Aguarda fontes/layout e aplica textfill — saídas reais (CAD-313). */
export async function refreshOutputTextfill(
  contentEl: HTMLElement,
  minPx: number,
  maxPx: number,
  enabled: boolean,
  options: RefreshOutputTextfillOptions = {},
): Promise<void> {
  await runRefreshTextfill(contentEl, minPx, maxPx, enabled, options, 'output');
}

/** Aguarda fontes/layout e aplica textfill em cada `.texto` (retorno de palco). */
export async function refreshOutputTextfillAll(
  rootEl: HTMLElement,
  minPx: number,
  maxPx: number,
  enabled: boolean,
  options: RefreshOutputTextfillOptions = {},
): Promise<void> {
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

    /* Segunda passagem após faixas flex (.atual / .proximo) estabilizarem altura. */
    await waitForLayoutFrames();
    applyOutputTextfillAll(rootEl, minPx, maxPx, enabled, { fitSlackPx });
  } finally {
    rootEl.style.visibility = '';
  }
}

/** Retorno de palco — cada `.texto` com textfill independente. */
export function applyOutputTextfillAll(
  rootEl: HTMLElement,
  minPx: number,
  maxPx: number,
  enabled: boolean,
  options?: ProjectionTextfillOptions,
): void {
  if (applyStageReturnCoupledTextfill(rootEl, minPx, maxPx, enabled, options, 'output')) {
    return;
  }

  const nodes = rootEl.querySelectorAll<HTMLElement>('.texto');
  if (!nodes.length) {
    applyOutputTextfill(rootEl, minPx, maxPx, enabled, options);
    return;
  }
  for (const node of Array.from(nodes)) {
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
