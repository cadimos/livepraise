import { collectTextfillLayoutContext, isTextfillDiagnosticsEnabled, logTextfillDiagnostic, } from './projection-textfill-diagnostics.js';
const SPAN_LINE_HEIGHT = 1.35;
function applySpanFontStyles(span, fontStyles) {
    span.style.fontFamily = fontStyles.fontFamily;
    span.style.fontWeight = fontStyles.fontWeight;
    span.style.fontStyle = fontStyles.fontStyle;
}
function spanFitMetrics(span, bounds, slackPx) {
    void span.offsetHeight;
    const maxH = bounds.height - slackPx;
    const heightOverflow = Math.ceil(span.scrollHeight) - maxH;
    const widthOverflow = Math.ceil(span.scrollWidth) - bounds.width;
    const fits = maxH > 0 &&
        bounds.width > 0 &&
        heightOverflow <= HEIGHT_FIT_TOLERANCE_PX &&
        widthOverflow <= WIDTH_FIT_TOLERANCE_PX;
    return {
        fits,
        maxH,
        heightOverflow,
        widthOverflow,
        spanOffsetH: span.scrollHeight,
        spanOffsetW: span.scrollWidth,
    };
}
/** Busca binária numa dimensão (altura ou largura) — paridade jquery-textfill. */
function searchFontOnSpan(span, measureDim, maxDim, loBound, hiBound, slackPx, heightTolerance, applySlack) {
    let lo = loBound;
    let hi = hiBound;
    let best = loBound;
    const tolerance = heightTolerance ? HEIGHT_FIT_TOLERANCE_PX : WIDTH_FIT_TOLERANCE_PX;
    const slack = applySlack ? slackPx : 0;
    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        span.style.fontSize = `${mid}px`;
        void span.offsetHeight;
        const dim = measureDim(span);
        if (dim <= maxDim - slack + tolerance) {
            best = mid;
            lo = mid + 1;
        }
        else {
            hi = mid - 1;
        }
    }
    span.style.fontSize = `${best}px`;
    return best;
}
/**
 * Mede no span real dentro da caixa de projeção — fontes e layout idênticos ao ecrã.
 * `#conteudo` pode estar visibility:hidden; o layout continua válido.
 */
function measureFontSizeOnSpan(span, bounds, loBound, hiBound, slackPx, fontStyles) {
    prepareSpan(span);
    applySpanFontStyles(span, fontStyles);
    span.style.lineHeight = String(SPAN_LINE_HEIGHT);
    const forHeight = searchFontOnSpan(span, (el) => el.scrollHeight, bounds.height, loBound, hiBound, slackPx, true, true);
    span.style.fontSize = `${forHeight}px`;
    void span.offsetHeight;
    const forWidth = searchFontOnSpan(span, (el) => el.scrollWidth, bounds.width, loBound, hiBound, slackPx, false, false);
    return Math.min(forHeight, forWidth);
}
/** Ajuste final no DOM real — corrige tolerância da busca binária. */
function verifyAndShrinkFontOnSpan(span, bounds, fontPx, loBound, slackPx) {
    let px = fontPx;
    span.style.fontSize = `${px}px`;
    const limit = bounds.height - slackPx + HEIGHT_FIT_TOLERANCE_PX;
    while (px > loBound && span.scrollHeight > limit) {
        px -= 1;
        span.style.fontSize = `${px}px`;
        void span.offsetHeight;
    }
    return px;
}
function spanFitsAtFontPx(span, bounds, fontPx, slackPx, fontStyles) {
    prepareSpan(span);
    applySpanFontStyles(span, fontStyles);
    span.style.lineHeight = String(SPAN_LINE_HEIGHT);
    span.style.fontSize = `${fontPx}px`;
    return spanFitMetrics(span, bounds, slackPx).fits;
}
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
function textTarget(contentEl, spanSelector) {
    if (spanSelector === ':scope')
        return contentEl;
    if (spanSelector) {
        return contentEl.querySelector(spanSelector);
    }
    return (contentEl.querySelector('.content > span') ??
        contentEl.querySelector('.content span') ??
        contentEl.querySelector('.texto') ??
        null);
}
function measureBox(contentEl, measureSelector, measureElement) {
    if (measureElement)
        return measureElement;
    if (measureSelector === null)
        return contentEl;
    if (measureSelector) {
        return contentEl.querySelector(measureSelector) ?? contentEl;
    }
    return (contentEl.querySelector('.content') ??
        contentEl.querySelector('.texto') ??
        contentEl);
}
function stageReturnTextfillMeasureBox(textoEl) {
    return textoEl;
}
function ensureTextoFillSpan(textoEl) {
    let span = textoEl.querySelector(':scope > .texto-fill');
    if (span)
        return span;
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
    const lo = mode === 'preview'
        ? PREVIEW_TEXTFILL_MIN_PX
        : Math.min(profileLo, hi);
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
/**
 * Área do corpo = largura/altura do root menos padding, título e rodapé.
 * Paridade com o modelo mental do operador (800×600 → caixa fixa).
 */
export function computeProjectionContentArea(contentEl, fallbackBox) {
    const root = contentEl.closest('#conteudo, .conteudo') ?? contentEl;
    const titulo = contentEl.querySelector('.titulo');
    const rodape = contentEl.querySelector('.rodape');
    const rootStyle = window.getComputedStyle(root);
    const padT = parseFloat(rootStyle.paddingTop) || 0;
    const padB = parseFloat(rootStyle.paddingBottom) || 0;
    const padL = parseFloat(rootStyle.paddingLeft) || 0;
    const padR = parseFloat(rootStyle.paddingRight) || 0;
    const tituloH = titulo && titulo.textContent?.trim() ? titulo.offsetHeight : 0;
    const rodapeH = rodape && rodape.textContent?.trim() ? rodape.offsetHeight : 0;
    const zoneGap = rodape && rodapeH > 0
        ? parseFloat(window.getComputedStyle(rodape).marginTop) || 0
        : 0;
    let width = Math.max(0, Math.round(root.clientWidth - padL - padR));
    let height = Math.max(0, Math.round(root.clientHeight - padT - padB - tituloH - rodapeH - zoneGap));
    if (fallbackBox) {
        if (fallbackBox.clientWidth > 0)
            width = fallbackBox.clientWidth;
        if (fallbackBox.clientHeight > 0)
            height = fallbackBox.clientHeight;
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
function resolveContentAreaBounds(contentEl, box, options) {
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
function readFontStyles(span, options) {
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
function applyTextfill(contentEl, minPx, maxPx, enabled, options = {}, mode = 'output') {
    const span = textTarget(contentEl, options.spanSelector);
    const box = measureBox(contentEl, options.measureSelector, options.measureElement);
    if (!span || !box)
        return;
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
        targetPx = measureFontSizeOnSpan(span, area, loBound, hiBound, slackPx, fontStyles);
        targetPx = verifyAndShrinkFontOnSpan(span, area, targetPx, loBound, slackPx);
        if (mode === 'output' &&
            span.closest('.retorno-musica, .retorno-biblia') &&
            !spanFitsAtFontPx(span, area, targetPx, slackPx, fontStyles)) {
            const floorPx = STAGE_RETURN_OUTPUT_FLOOR_PX;
            targetPx = measureFontSizeOnSpan(span, area, floorPx, Math.max(floorPx, loBound - 1), slackPx, fontStyles);
            targetPx = Math.max(floorPx, verifyAndShrinkFontOnSpan(span, area, targetPx, floorPx, slackPx));
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
        measurePhase: 'in-place',
    });
}
function recordTextfillDiagnostic(contentEl, span, box, area, data) {
    if (!isTextfillDiagnosticsEnabled())
        return;
    const layout = collectTextfillLayoutContext(contentEl, span, box);
    const metrics = spanFitMetrics(span, area, data.slackPx);
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
function resolveSlackPx(options, mode, extraPx = 0) {
    const baseSlack = mode === 'preview' ? PREVIEW_FIT_SLACK_PX : OUTPUT_FIT_SLACK_PX;
    return baseSlack + (options.fitSlackPx ?? 0) + extraPx;
}
/**
 * Louvor retorno — escala única para Agora + Próximo (evita uma faixa estourar no mobile).
 */
function applyStageReturnCoupledTextfill(rootEl, minPx, maxPx, enabled, options = {}, mode = 'output') {
    const musicRoot = rootEl.querySelector('.retorno-musica');
    if (!musicRoot)
        return false;
    const textos = Array.from(musicRoot.querySelectorAll('.texto'));
    if (textos.length < 2)
        return false;
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
    const allReady = entries.every((entry) => entry.box.clientHeight > 0 && entry.box.clientWidth > 0);
    if (!allReady) {
        for (const entry of entries) {
            entry.span.style.fontSize = `${Math.max(floorPx, Math.round(profileLo * entry.scale))}px`;
        }
        return true;
    }
    const fontStyles = readFontStyles(entries[0].span, options);
    const fitsAtBase = (basePx) => {
        for (const entry of entries) {
            const size = Math.max(floorPx, Math.round(basePx * entry.scale));
            const area = {
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
        }
        else {
            hi = mid - 1;
        }
    }
    for (const entry of entries) {
        entry.span.style.fontSize = `${Math.max(floorPx, Math.round(best * entry.scale))}px`;
    }
    return true;
}
/** Modo prévia — cabe no tile; maximiza px até maxFontPx (CAD-313). */
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
    if (fontFamily && typeof document !== 'undefined' && 'fonts' in document) {
        try {
            await document.fonts.load(`${fontWeight ?? 400} ${fontStyle ?? 'normal'} ${measureFontPx}px ${fontFamily}`);
        }
        catch {
            /* @font-face pode ainda aplicar */
        }
        await document.fonts.ready;
    }
    await waitForLayoutFrames();
}
async function ensureStageReturnTextfillBoxes(rootEl) {
    const boxes = rootEl.querySelectorAll('.retorno-musica .texto, .retorno-biblia .texto');
    if (!boxes.length)
        return;
    for (let attempt = 0; attempt < 16; attempt += 1) {
        const ready = Array.from(boxes).every((box) => box.clientHeight >= 24 && box.clientWidth >= 24);
        if (ready)
            return;
        await waitForLayoutFrames();
    }
}
function measureLayoutReady(contentEl, box, mode) {
    const minHeight = mode === 'preview' ? 16 : 24;
    const minWidth = mode === 'preview' ? 16 : 24;
    const height = box.clientHeight;
    const width = box.clientWidth;
    if (height < minHeight || width < minWidth)
        return false;
    const rodape = contentEl.querySelector('.rodape');
    if (rodape && rodape.textContent?.trim() && rodape.offsetHeight <= 0) {
        return false;
    }
    const titulo = contentEl.querySelector('.titulo');
    if (titulo && titulo.textContent?.trim() && titulo.offsetHeight <= 0) {
        return false;
    }
    return true;
}
async function ensureMeasurableBox(contentEl, mode = 'output') {
    const box = contentEl.querySelector('.content') ??
        contentEl.querySelector('.texto') ??
        contentEl;
    let stableHeight = -1;
    let stableWidth = -1;
    for (let attempt = 0; attempt < 32; attempt += 1) {
        const height = box.clientHeight;
        const width = box.clientWidth;
        if (measureLayoutReady(contentEl, box, mode) &&
            height === stableHeight &&
            width === stableWidth) {
            return;
        }
        stableHeight = height;
        stableWidth = width;
        await waitForLayoutFrames();
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
export async function refreshPreviewTextfill(contentEl, minPx, maxPx, enabled, options = {}) {
    await runRefreshTextfill(contentEl, minPx, maxPx, enabled, options, 'preview');
}
/** Modo output — maximiza área útil em projeção real (CAD-313). */
export function applyOutputTextfill(contentEl, minPx, maxPx, enabled, options) {
    applyTextfill(contentEl, minPx, maxPx, enabled, options, 'output');
}
/** Aguarda fontes/layout e aplica textfill — saídas reais (CAD-313). */
export async function refreshOutputTextfill(contentEl, minPx, maxPx, enabled, options = {}) {
    await runRefreshTextfill(contentEl, minPx, maxPx, enabled, options, 'output');
}
/** Aguarda fontes/layout e aplica textfill em cada `.texto` (retorno de palco). */
export async function refreshOutputTextfillAll(rootEl, minPx, maxPx, enabled, options = {}) {
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
export function applyOutputTextfillAll(rootEl, minPx, maxPx, enabled, options) {
    if (applyStageReturnCoupledTextfill(rootEl, minPx, maxPx, enabled, options, 'output')) {
        return;
    }
    const nodes = rootEl.querySelectorAll('.texto');
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
