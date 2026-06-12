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
  fontFamily?: string;
  fontWeight?: number | string;
  fontStyle?: string;
}

/** Área útil do corpo — root menos topo, rodapé e padding. */
export interface ProjectionContentAreaBounds {
  width: number;
  height: number;
  tituloH: number;
  rodapeH: number;
  rootClientW: number;
  rootClientH: number;
}

interface TextfillFontStyles {
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
}

interface TextfillProbe {
  box: HTMLDivElement;
  span: HTMLSpanElement;
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

interface TextfillFitMetrics {
  fits: boolean;
  maxH: number;
  heightOverflow: number;
  widthOverflow: number;
  spanOffsetH: number;
  spanOffsetW: number;
}

const PROBE_LINE_HEIGHT = 1.35;
let textfillProbeRoot: HTMLDivElement | null = null;

/**
 * Área do corpo = largura/altura do root menos padding, título e rodapé.
 * Paridade com o modelo mental do operador (800×600 → caixa fixa).
 */
export function computeProjectionContentArea(
  contentEl: HTMLElement,
  fallbackBox?: HTMLElement,
): ProjectionContentAreaBounds {
  const root = contentEl.closest<HTMLElement>('#conteudo, .conteudo') ?? contentEl;
  const titulo = contentEl.querySelector<HTMLElement>('.titulo');
  const rodape = contentEl.querySelector<HTMLElement>('.rodape');
  const rootStyle = window.getComputedStyle(root);

  const padT = parseFloat(rootStyle.paddingTop) || 0;
  const padB = parseFloat(rootStyle.paddingBottom) || 0;
  const padL = parseFloat(rootStyle.paddingLeft) || 0;
  const padR = parseFloat(rootStyle.paddingRight) || 0;

  const tituloH =
    titulo && titulo.textContent?.trim() ? titulo.offsetHeight : 0;
  const rodapeH =
    rodape && rodape.textContent?.trim() ? rodape.offsetHeight : 0;
  const zoneGap =
    rodape && rodapeH > 0
      ? parseFloat(window.getComputedStyle(rodape).marginTop) || 0
      : 0;

  let width = Math.max(0, Math.round(root.clientWidth - padL - padR));
  let height = Math.max(
    0,
    Math.round(root.clientHeight - padT - padB - tituloH - rodapeH - zoneGap),
  );

  if (fallbackBox) {
    if (fallbackBox.clientWidth > 0) width = fallbackBox.clientWidth;
    if (fallbackBox.clientHeight > 0) height = fallbackBox.clientHeight;
  }

  return {
    width,
    height,
    tituloH,
    rodapeH,
    rootClientW: root.clientWidth,
    rootClientH: root.clientHeight,
  };
}

function resolveContentAreaBounds(
  contentEl: HTMLElement,
  box: HTMLElement,
  options: ProjectionTextfillOptions,
): ProjectionContentAreaBounds {
  if (options.measureElement) {
    return {
      width: options.measureElement.clientWidth,
      height: options.measureElement.clientHeight,
      tituloH: 0,
      rodapeH: 0,
      rootClientW: contentEl.clientWidth,
      rootClientH: contentEl.clientHeight,
    };
  }
  return computeProjectionContentArea(contentEl, box);
}

function getTextfillProbe(): TextfillProbe {
  if (!textfillProbeRoot) {
    textfillProbeRoot = document.createElement('div');
    textfillProbeRoot.setAttribute('aria-hidden', 'true');
    textfillProbeRoot.dataset.textfillProbe = '1';
    textfillProbeRoot.style.cssText =
      'position:fixed;left:-20000px;top:0;visibility:visible;opacity:1;overflow:visible;pointer-events:none;z-index:-1;';
    const box = document.createElement('div');
    box.className = 'content';
    box.style.overflow = 'hidden';
    box.style.display = 'block';
    box.style.boxSizing = 'border-box';
    const span = document.createElement('span');
    box.appendChild(span);
    textfillProbeRoot.appendChild(box);
    document.body.appendChild(textfillProbeRoot);
  }
  return {
    box: textfillProbeRoot.querySelector('.content') as HTMLDivElement,
    span: textfillProbeRoot.querySelector('span') as HTMLSpanElement,
  };
}

function readFontStyles(
  span: HTMLElement,
  options: ProjectionTextfillOptions,
): TextfillFontStyles {
  if (options.fontFamily) {
    return {
      fontFamily: options.fontFamily,
      fontWeight: String(options.fontWeight ?? 400),
      fontStyle: options.fontStyle ?? 'normal',
    };
  }
  const cs = window.getComputedStyle(span);
  return {
    fontFamily: cs.fontFamily,
    fontWeight: cs.fontWeight,
    fontStyle: cs.fontStyle,
  };
}

function configureTextfillProbe(
  probe: TextfillProbe,
  html: string,
  bounds: Pick<ProjectionContentAreaBounds, 'width' | 'height'>,
  fontStyles: TextfillFontStyles,
): void {
  probe.box.style.width = `${bounds.width}px`;
  probe.box.style.height = `${bounds.height}px`;
  probe.span.innerHTML = html;
  probe.span.style.display = 'block';
  probe.span.style.width = '100%';
  probe.span.style.maxWidth = '100%';
  probe.span.style.lineHeight = String(PROBE_LINE_HEIGHT);
  probe.span.style.overflowWrap = 'break-word';
  probe.span.style.wordBreak = 'break-word';
  probe.span.style.visibility = 'visible';
  probe.span.style.fontFamily = fontStyles.fontFamily;
  probe.span.style.fontWeight = fontStyles.fontWeight;
  probe.span.style.fontStyle = fontStyles.fontStyle;
}

function probeFitMetrics(
  probe: TextfillProbe,
  bounds: Pick<ProjectionContentAreaBounds, 'width' | 'height'>,
  slackPx: number,
): TextfillFitMetrics {
  void probe.span.offsetHeight;
  const maxH = bounds.height - slackPx;
  const heightOverflow = Math.ceil(probe.span.offsetHeight) - maxH;
  const widthOverflow = Math.ceil(probe.span.scrollWidth) - bounds.width;
  const fits =
    maxH > 0 &&
    bounds.width > 0 &&
    heightOverflow <= HEIGHT_FIT_TOLERANCE_PX &&
    widthOverflow <= WIDTH_FIT_TOLERANCE_PX;
  return {
    fits,
    maxH,
    heightOverflow,
    widthOverflow,
    spanOffsetH: probe.span.offsetHeight,
    spanOffsetW: probe.span.offsetWidth,
  };
}

/** Busca binária numa dimensão (altura ou largura) — paridade jquery-textfill. */
function searchFontForDimension(
  probe: TextfillProbe,
  measureDim: (el: HTMLElement) => number,
  maxDim: number,
  loBound: number,
  hiBound: number,
  slackPx: number,
  heightTolerance: boolean,
  applySlack: boolean,
): number {
  let lo = loBound;
  let hi = hiBound;
  let best = loBound;
  const tolerance = heightTolerance ? HEIGHT_FIT_TOLERANCE_PX : WIDTH_FIT_TOLERANCE_PX;
  const slack = applySlack ? slackPx : 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    probe.span.style.fontSize = `${mid}px`;
    void probe.span.offsetHeight;
    const dim = measureDim(probe.span);
    if (dim <= maxDim - slack + tolerance) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  probe.span.style.fontSize = `${best}px`;
  return best;
}

/**
 * Mede no probe visível fora do ecrã — evita scrollHeight errado com span hidden no DOM real.
 * Retorna min(fonte-altura, fonte-largura) como jquery-textfill.
 */
function measureFontSizeInProbe(
  html: string,
  bounds: Pick<ProjectionContentAreaBounds, 'width' | 'height'>,
  loBound: number,
  hiBound: number,
  slackPx: number,
  fontStyles: TextfillFontStyles,
): number {
  const probe = getTextfillProbe();
  configureTextfillProbe(probe, html, bounds, fontStyles);

  const forHeight = searchFontForDimension(
    probe,
    (el) => el.offsetHeight,
    bounds.height,
    loBound,
    hiBound,
    slackPx,
    true,
    true,
  );
  probe.span.style.fontSize = `${forHeight}px`;
  void probe.span.offsetHeight;

  const forWidth = searchFontForDimension(
    probe,
    (el) => el.scrollWidth,
    bounds.width,
    loBound,
    hiBound,
    slackPx,
    false,
    false,
  );

  return Math.min(forHeight, forWidth);
}

function probeMetricsForFontPx(
  html: string,
  bounds: ProjectionContentAreaBounds,
  fontPx: number,
  slackPx: number,
  fontStyles: TextfillFontStyles,
): TextfillFitMetrics {
  const probe = getTextfillProbe();
  configureTextfillProbe(probe, html, bounds, fontStyles);
  probe.span.style.fontSize = `${fontPx}px`;
  return probeFitMetrics(probe, bounds, slackPx);
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
  const area = resolveContentAreaBounds(contentEl, box, options);
  const fontStyles = readFontStyles(span, options);

  if (area.width <= 0 || area.height <= 0) {
    span.style.fontSize = `${fallbackPx}px`;
    span.style.visibility = '';
    recordTextfillDiagnostic(contentEl, span, box, area, {
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

  let targetPx = hiBound;
  if (enabled) {
    targetPx = measureFontSizeInProbe(
      span.innerHTML,
      area,
      loBound,
      hiBound,
      slackPx,
      fontStyles,
    );

    if (
      mode === 'output' &&
      span.closest('.retorno-musica, .retorno-biblia') &&
      !probeMetricsForFontPx(span.innerHTML, area, targetPx, slackPx, fontStyles).fits
    ) {
      const floorPx = STAGE_RETURN_OUTPUT_FLOOR_PX;
      targetPx = measureFontSizeInProbe(
        span.innerHTML,
        area,
        floorPx,
        Math.max(floorPx, loBound - 1),
        slackPx,
        fontStyles,
      );
      targetPx = Math.max(floorPx, targetPx);
    }
  }

  span.style.fontSize = `${targetPx}px`;
  span.style.visibility = '';
  recordTextfillDiagnostic(contentEl, span, box, area, {
    mode,
    minPx,
    maxPx,
    enabled,
    loBound,
    hiBound,
    slackPx,
    resultFontPx: targetPx,
    options,
    measurePhase: 'probe',
  });
}

function recordTextfillDiagnostic(
  contentEl: HTMLElement,
  span: HTMLElement,
  box: HTMLElement,
  area: ProjectionContentAreaBounds,
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
    measurePhase?: string;
  },
): void {
  if (!isTextfillDiagnosticsEnabled()) return;
  const layout = collectTextfillLayoutContext(contentEl, span, box);
  const fontStyles = readFontStyles(span, data.options);
  const metrics = probeMetricsForFontPx(
    span.innerHTML,
    area,
    data.resultFontPx,
    data.slackPx,
    fontStyles,
  );
  const pass = data.options.diagnosticPass ?? 1;
  logTextfillDiagnostic({
    surface: data.options.diagnosticSurface ?? data.mode,
    mode: data.mode,
    pass,
    measurePhase: data.measurePhase ?? `pass-${pass}`,
    minFontPx: data.minPx,
    maxFontPx: data.maxPx,
    textfillEnabled: data.enabled,
    loBound: data.loBound,
    hiBound: data.hiBound,
    slackPx: data.slackPx,
    resultFontPx: data.resultFontPx,
    fits: metrics.fits,
    spanOffsetH: metrics.spanOffsetH,
    spanOffsetW: metrics.spanOffsetW,
    maxH: metrics.maxH,
    heightOverflow: metrics.heightOverflow,
    widthOverflow: metrics.widthOverflow,
    computedAreaW: area.width,
    computedAreaH: area.height,
    rootConcealed: false,
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

  const fontStyles = readFontStyles(entries[0].span, options);

  const fitsAtBase = (basePx: number): boolean => {
    for (const entry of entries) {
      const size = Math.max(floorPx, Math.round(basePx * entry.scale));
      const area: ProjectionContentAreaBounds = {
        width: entry.box.clientWidth,
        height: entry.box.clientHeight,
        tituloH: 0,
        rodapeH: 0,
        rootClientW: entry.box.clientWidth,
        rootClientH: entry.box.clientHeight,
      };
      if (!probeMetricsForFontPx(entry.span.innerHTML, area, size, slackPx, fontStyles).fits) {
        return false;
      }
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
  applyFn(contentEl, minPx, maxPx, enabled, {
    ...textfillOptions,
    fontFamily,
    fontWeight,
    fontStyle,
    diagnosticPass: 1,
  });
  contentEl.style.visibility = '';
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

  applyOutputTextfillAll(rootEl, minPx, maxPx, enabled, {
    fitSlackPx,
    fontFamily,
    fontWeight,
    fontStyle,
  });
  rootEl.style.visibility = '';
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
      fontFamily: options?.fontFamily,
      fontWeight: options?.fontWeight,
      fontStyle: options?.fontStyle,
    });
  }
}
