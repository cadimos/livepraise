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

interface TextfillFitMetrics {
  fits: boolean;
  maxH: number;
  heightOverflow: number;
  widthOverflow: number;
  spanOffsetH: number;
  spanOffsetW: number;
  spanClientH: number;
  visualOverflowPx: number;
  computedFontPx: number;
}

const SPAN_LINE_HEIGHT = 1.35;
const TEXTFILL_PROBE_ID = 'lp-textfill-probe';
/** Prévia do operador — pode ir abaixo de minFontPx para caber no tile (CAD-313 §3.1). */
export const PREVIEW_TEXTFILL_MIN_PX = 8;
const PREVIEW_FIT_SLACK_PX = 2;
const OUTPUT_FIT_SLACK_PX = 2;
/** scrollWidth ≈ clientWidth em blocos width:100% com wrap — tolerância subpixel. */
const WIDTH_FIT_TOLERANCE_PX = 2;
/** line-height / subpixel — evita rejeitar tamanho que já passou na busca binária. */
const HEIGHT_FIT_TOLERANCE_PX = 3;
let lastMeasureUsedProbe = false;

function applySpanFontPx(span: HTMLElement, px: number): void {
  span.style.setProperty('font-size', `${px}px`, 'important');
  void span.offsetHeight;
}

function readComputedFontPx(span: HTMLElement): number {
  return Number.parseFloat(window.getComputedStyle(span).fontSize) || 0;
}

function readStyleFontPx(span: HTMLElement): number {
  return Number.parseFloat(span.style.fontSize) || 0;
}

/** Inline font-size não aplicou (ex.: inherit no #conteudo / Electron). */
function spanFontSizeMismatchPx(span: HTMLElement): number {
  const stylePx = readStyleFontPx(span);
  if (stylePx <= 0) return 0;
  return Math.abs(stylePx - readComputedFontPx(span));
}

function canMeasureFontInPlace(
  span: HTMLElement,
  fontStyles: TextfillFontStyles,
  testPx: number,
): boolean {
  prepareSpan(span);
  applySpanFontStyles(span, fontStyles);
  applySpanFontPx(span, testPx);
  return spanFontSizeMismatchPx(span) <= 1.5;
}

function ensureTextfillProbe(width: number, height: number): HTMLElement {
  let probe = document.getElementById(TEXTFILL_PROBE_ID);
  if (!probe) {
    probe = document.createElement('div');
    probe.id = TEXTFILL_PROBE_ID;
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;overflow:hidden;display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:0;text-align:center;';
    document.body.appendChild(probe);
  }
  probe.style.width = `${width}px`;
  probe.style.height = `${height}px`;
  return probe;
}

/** Probe isolado — paridade com `.content` (flex, altura fixa, overflow hidden). */
function syncProbeSpan(
  sourceSpan: HTMLElement,
  width: number,
  height: number,
  fontStyles: TextfillFontStyles,
): HTMLElement {
  const probe = ensureTextfillProbe(width, height);
  let span = probe.querySelector<HTMLElement>(':scope > span');
  if (!span) {
    span = document.createElement('span');
    probe.replaceChildren(span);
  }
  prepareSpan(span);
  applySpanFontStyles(span, fontStyles);
  span.innerHTML = sourceSpan.innerHTML;
  return span;
}

function applySpanFontStyles(span: HTMLElement, fontStyles: TextfillFontStyles): void {
  span.style.fontFamily = fontStyles.fontFamily;
  span.style.fontWeight = fontStyles.fontWeight;
  span.style.fontStyle = fontStyles.fontStyle;
}

function spanVerticalOverflowPx(
  span: HTMLElement,
  box: HTMLElement | null,
  bounds: Pick<ProjectionContentAreaBounds, 'height'>,
  slackPx: number,
): number {
  void span.offsetHeight;
  const limit = bounds.height - slackPx + HEIGHT_FIT_TOLERANCE_PX;
  const scrollOverflow = Math.ceil(span.scrollHeight) - limit;
  if (!box?.isConnected) return scrollOverflow;

  const spanRect = span.getBoundingClientRect();
  const boxRect = box.getBoundingClientRect();
  if (spanRect.height <= 0 || boxRect.height <= 0) return scrollOverflow;

  const visualOverflow = Math.max(
    0,
    Math.ceil(boxRect.top - spanRect.top + slackPx),
    Math.ceil(spanRect.bottom - boxRect.bottom + slackPx),
  );
  return Math.max(scrollOverflow, visualOverflow);
}

/** Ajuste por scrollHeight — fiável no probe; evita falso overflow visual no #conteudo. */
function verifyAndShrinkFontScrollOnly(
  span: HTMLElement,
  bounds: Pick<ProjectionContentAreaBounds, 'height'>,
  fontPx: number,
  loBound: number,
  slackPx: number,
): number {
  let px = fontPx;
  applySpanFontPx(span, px);
  const limit = bounds.height - slackPx + HEIGHT_FIT_TOLERANCE_PX;
  while (px > loBound && Math.ceil(span.scrollHeight) > limit) {
    px -= 1;
    applySpanFontPx(span, px);
  }
  return px;
}

function spanFitMetrics(
  span: HTMLElement,
  box: HTMLElement | null,
  bounds: Pick<ProjectionContentAreaBounds, 'width' | 'height'>,
  slackPx: number,
): TextfillFitMetrics {
  void span.offsetHeight;
  const maxH = bounds.height - slackPx;
  const heightOverflow = spanVerticalOverflowPx(span, box, bounds, slackPx);
  const widthOverflow = Math.ceil(span.scrollWidth) - bounds.width;
  const computedFontPx = readComputedFontPx(span);
  const fits =
    maxH > 0 &&
    bounds.width > 0 &&
    spanFontSizeMismatchPx(span) <= 1.5 &&
    heightOverflow <= HEIGHT_FIT_TOLERANCE_PX &&
    widthOverflow <= WIDTH_FIT_TOLERANCE_PX;
  const visualOverflowPx =
    box?.isConnected &&
    span.getBoundingClientRect().height > 0 &&
    box.getBoundingClientRect().height > 0
      ? Math.max(
          0,
          Math.ceil(box.getBoundingClientRect().top - span.getBoundingClientRect().top + slackPx),
          Math.ceil(
            span.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom + slackPx,
          ),
        )
      : 0;
  return {
    fits,
    maxH,
    heightOverflow,
    widthOverflow,
    spanOffsetH: span.scrollHeight,
    spanOffsetW: span.scrollWidth,
    spanClientH: span.clientHeight,
    visualOverflowPx,
    computedFontPx,
  };
}

/** Busca binária numa dimensão (altura ou largura) — paridade jquery-textfill. */
function searchFontOnSpan(
  span: HTMLElement,
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
    applySpanFontPx(span, mid);
    const dim = measureDim(span);
    if (dim <= maxDim - slack + tolerance) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  applySpanFontPx(span, best);
  return best;
}

/**
 * Busca binária no span de medição (in-place ou probe off-screen).
 * O resultado aplica-se no span real com !important.
 */
function measureFontSizeOnSpan(
  sourceSpan: HTMLElement,
  bounds: Pick<ProjectionContentAreaBounds, 'width' | 'height'>,
  loBound: number,
  hiBound: number,
  slackPx: number,
  fontStyles: TextfillFontStyles,
): number {
  const inPlace = canMeasureFontInPlace(sourceSpan, fontStyles, loBound);
  lastMeasureUsedProbe = !inPlace;
  const measureSpan = inPlace
    ? sourceSpan
    : syncProbeSpan(sourceSpan, bounds.width, bounds.height, fontStyles);
  prepareSpan(measureSpan);
  applySpanFontStyles(measureSpan, fontStyles);
  measureSpan.style.lineHeight = String(SPAN_LINE_HEIGHT);

  const forHeight = searchFontOnSpan(
    measureSpan,
    (el) => el.scrollHeight,
    bounds.height,
    loBound,
    hiBound,
    slackPx,
    true,
    true,
  );
  applySpanFontPx(measureSpan, forHeight);

  const forWidth = searchFontOnSpan(
    measureSpan,
    (el) => el.scrollWidth,
    bounds.width,
    loBound,
    hiBound,
    slackPx,
    false,
    false,
  );

  const candidate = Math.min(forHeight, forWidth);
  if (lastMeasureUsedProbe) {
    return verifyAndShrinkFontScrollOnly(
      measureSpan,
      bounds,
      candidate,
      loBound,
      slackPx,
    );
  }
  return verifyAndShrinkFontOnSpan(
    measureSpan,
    measureSpan.parentElement ?? measureSpan,
    bounds,
    candidate,
    loBound,
    slackPx,
  );
}

/** Ajuste final no DOM real — corrige tolerância da busca binária e overflow visual. */
function verifyAndShrinkFontOnSpan(
  span: HTMLElement,
  box: HTMLElement,
  bounds: Pick<ProjectionContentAreaBounds, 'height'>,
  fontPx: number,
  loBound: number,
  slackPx: number,
): number {
  let px = fontPx;
  applySpanFontPx(span, px);
  while (px > loBound && spanVerticalOverflowPx(span, box, bounds, slackPx) > 0) {
    px -= 1;
    applySpanFontPx(span, px);
  }
  return px;
}

function spanFitsAtFontPx(
  span: HTMLElement,
  bounds: ProjectionContentAreaBounds,
  fontPx: number,
  slackPx: number,
  fontStyles: TextfillFontStyles,
): boolean {
  prepareSpan(span);
  applySpanFontStyles(span, fontStyles);
  span.style.lineHeight = String(SPAN_LINE_HEIGHT);
  applySpanFontPx(span, fontPx);
  return spanFitMetrics(span, null, bounds, slackPx).fits;
}
const STAGE_RETURN_PROXIMO_MAX_SCALE = 0.72;
/** Piso em saídas reais quando o perfil min não cabe (mobile / muito texto). */
const STAGE_RETURN_OUTPUT_FLOOR_PX = 10;

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
  span.style.flexShrink = '0';
  span.style.lineHeight = '1.35';
  span.style.overflowWrap = 'break-word';
  span.style.wordBreak = 'break-word';
}

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

function reconcileSpanFontSize(
  span: HTMLElement,
  box: HTMLElement,
  area: ProjectionContentAreaBounds,
  targetPx: number,
  loBound: number,
  hiBound: number,
  slackPx: number,
  fontStyles: TextfillFontStyles,
): number {
  applySpanFontPx(span, targetPx);

  if (lastMeasureUsedProbe) {
    return targetPx;
  }

  const mismatchPx = spanFontSizeMismatchPx(span);
  const overflowPx = spanVerticalOverflowPx(span, box, area, slackPx);
  if (mismatchPx <= 1.5 && overflowPx <= HEIGHT_FIT_TOLERANCE_PX) {
    return verifyAndShrinkFontOnSpan(span, box, area, targetPx, loBound, slackPx);
  }

  prepareSpan(span);
  applySpanFontStyles(span, fontStyles);
  let px = measureFontSizeOnSpan(span, area, loBound, hiBound, slackPx, fontStyles);
  if (!lastMeasureUsedProbe) {
    px = verifyAndShrinkFontOnSpan(span, box, area, px, loBound, slackPx);
  }
  applySpanFontPx(span, px);
  return px;
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
    applySpanFontPx(span, fallbackPx);
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
    targetPx = measureFontSizeOnSpan(
      span,
      area,
      loBound,
      hiBound,
      slackPx,
      fontStyles,
    );
    if (!lastMeasureUsedProbe) {
      targetPx = verifyAndShrinkFontOnSpan(span, box, area, targetPx, loBound, slackPx);
    }

    if (
      mode === 'output' &&
      span.closest('.retorno-musica, .retorno-biblia') &&
      !spanFitsAtFontPx(span, area, targetPx, slackPx, fontStyles)
    ) {
      const floorPx = STAGE_RETURN_OUTPUT_FLOOR_PX;
      targetPx = measureFontSizeOnSpan(
        span,
        area,
        floorPx,
        Math.max(floorPx, loBound - 1),
        slackPx,
        fontStyles,
      );
      if (!lastMeasureUsedProbe) {
        targetPx = Math.max(
          floorPx,
          verifyAndShrinkFontOnSpan(span, box, area, targetPx, floorPx, slackPx),
        );
      } else {
        targetPx = Math.max(floorPx, targetPx);
      }
    }

    targetPx = reconcileSpanFontSize(
      span,
      box,
      area,
      targetPx,
      loBound,
      hiBound,
      slackPx,
      fontStyles,
    );
  }

  applySpanFontPx(span, targetPx);
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
    measurePhase:
      options.diagnosticPass === 2 ? 'reconcile-visible' : 'visible',
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
  const metrics = spanFitMetrics(span, box, area, data.slackPx);
  const pass = data.options.diagnosticPass ?? 1;
  const rootStyle = window.getComputedStyle(contentEl);
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
    styleFontPx: readStyleFontPx(span),
    fontSizeMismatchPx: spanFontSizeMismatchPx(span),
    usedProbe: lastMeasureUsedProbe,
    fits: metrics.fits,
    spanOffsetH: metrics.spanOffsetH,
    spanOffsetW: metrics.spanOffsetW,
    spanClientH: metrics.spanClientH,
    visualOverflowPx: metrics.visualOverflowPx,
    computedFontPx: metrics.computedFontPx,
    maxH: metrics.maxH,
    heightOverflow: metrics.heightOverflow,
    widthOverflow: metrics.widthOverflow,
    computedAreaW: area.width,
    computedAreaH: area.height,
    rootConcealed:
      contentEl.style.visibility === 'hidden' || rootStyle.visibility === 'hidden',
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
      applySpanFontPx(entry.span, Math.max(floorPx, Math.round(profileLo * entry.scale)));
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
      if (!spanFitsAtFontPx(entry.span, area, size, slackPx, fontStyles)) {
        return false;
      }
    }
    return true;
  };

  if (!enabled) {
    for (const entry of entries) {
      applySpanFontPx(entry.span, Math.max(floorPx, Math.round(hiBound * entry.scale)));
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
    applySpanFontPx(entry.span, Math.max(floorPx, Math.round(best * entry.scale)));
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

  // Medição com root visível — visibility:hidden no #conteudo impede font-size inline (Electron).
  contentEl.style.visibility = 'visible';
  await waitForLayoutFrames();

  const applyFn = mode === 'preview' ? applyPreviewTextfill : applyOutputTextfill;
  applyFn(contentEl, minPx, maxPx, enabled, {
    ...textfillOptions,
    fontFamily,
    fontWeight,
    fontStyle,
    diagnosticPass: 1,
  });

  if (enabled && !lastMeasureUsedProbe) {
    const span = textTarget(contentEl, textfillOptions.spanSelector);
    if (span && spanFontSizeMismatchPx(span) > 1.5) {
      applyFn(contentEl, minPx, maxPx, enabled, {
        ...textfillOptions,
        fontFamily,
        fontWeight,
        fontStyle,
        diagnosticPass: 2,
      });
    }
  }

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

  rootEl.style.visibility = 'visible';
  await waitForLayoutFrames();

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
