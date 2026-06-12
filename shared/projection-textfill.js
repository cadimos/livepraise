import { collectTextfillLayoutContext, isTextfillDiagnosticsEnabled, logTextfillDiagnostic, } from './projection-textfill-diagnostics.js';
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
/** Texto cabe na área útil de `.content` (só o corpo central). */
function textFitsBox(span, box, slackPx) {
    void span.offsetHeight;
    const maxH = box.clientHeight - slackPx;
    if (maxH <= 0 || box.clientWidth <= 0)
        return false;
    const heightOverflow = Math.ceil(span.scrollHeight) - maxH;
    if (heightOverflow > HEIGHT_FIT_TOLERANCE_PX)
        return false;
    // Largura: em blocos com width:100% o scrollWidth iguala o clientWidth mesmo com
    // quebra de linha válida. Só falha com overflow horizontal real.
    const widthOverflow = Math.ceil(span.scrollWidth) - box.clientWidth;
    return widthOverflow <= WIDTH_FIT_TOLERANCE_PX;
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
    const measure = () => {
        span.style.fontSize = `${loBound}px`;
        let targetPx = enabled
            ? runBinarySearch(span, box, loBound, hiBound, slackPx)
            : hiBound;
        if (enabled &&
            mode === 'output' &&
            span.closest('.retorno-musica, .retorno-biblia') &&
            !textFitsBox(span, box, slackPx)) {
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
    }
    finally {
        span.style.visibility = '';
    }
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
        }
        else {
            hi = mid - 1;
        }
    }
    span.style.fontSize = `${best}px`;
    return best;
}
function recordTextfillDiagnostic(contentEl, span, box, data) {
    if (!isTextfillDiagnosticsEnabled())
        return;
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
    const fitsAtBase = (basePx) => {
        for (const entry of entries) {
            const size = Math.max(floorPx, Math.round(basePx * entry.scale));
            entry.span.style.fontSize = `${size}px`;
            if (!textFitsBox(entry.span, entry.box, slackPx))
                return false;
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
function readSpanFontPx(span) {
    if (!span)
        return 0;
    const px = Number.parseInt(span.style.fontSize, 10);
    return Number.isFinite(px) ? px : 0;
}
/** Pass 2 pode medir scrollHeight errado após pass 1 fixar fonte grande (hidden root). */
function restorePass1IfPass2Broken(span, pass1Px, pass1Fits, pass2Fits) {
    if (span && pass1Fits && !pass2Fits && pass1Px > 0) {
        span.style.fontSize = `${pass1Px}px`;
    }
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
    const fillOptions = {
        ...textfillOptions,
        suppressVisibilityToggle: true,
    };
    const span = textTarget(contentEl, textfillOptions.spanSelector);
    const box = measureBox(contentEl, textfillOptions.measureSelector, textfillOptions.measureElement);
    const slackPx = resolveSlackPx(textfillOptions, mode);
    /* Ocultar o root durante ambas as passagens — evita flash entre frames e entre medições. */
    contentEl.style.visibility = 'hidden';
    try {
        contentEl.dataset.textfillPass = '1';
        applyFn(contentEl, minPx, maxPx, enabled, {
            ...fillOptions,
            diagnosticPass: 1,
        });
        const pass1Px = readSpanFontPx(span);
        const pass1Fits = Boolean(span && box && textFitsBox(span, box, slackPx));
        /* Limpa fonte da pass 1 antes de remediar — evita scrollHeight stale no Chromium. */
        if (span) {
            span.style.fontSize = '';
            void span.offsetHeight;
            if (box !== span)
                void box.offsetHeight;
        }
        /* Segunda passagem após o grid (topo/rodapé fixos) estabilizar a área de `.content`. */
        await waitForLayoutFrames();
        contentEl.dataset.textfillPass = '2';
        applyFn(contentEl, minPx, maxPx, enabled, {
            ...fillOptions,
            diagnosticPass: 2,
        });
        const pass2Fits = Boolean(span && box && textFitsBox(span, box, slackPx));
        restorePass1IfPass2Broken(span, pass1Px, pass1Fits, pass2Fits);
    }
    finally {
        delete contentEl.dataset.textfillPass;
        contentEl.style.visibility = '';
    }
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
    rootEl.style.visibility = 'hidden';
    try {
        applyOutputTextfillAll(rootEl, minPx, maxPx, enabled, { fitSlackPx });
        /* Segunda passagem após faixas flex (.atual / .proximo) estabilizarem altura. */
        await waitForLayoutFrames();
        applyOutputTextfillAll(rootEl, minPx, maxPx, enabled, { fitSlackPx });
    }
    finally {
        rootEl.style.visibility = '';
    }
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
            suppressVisibilityToggle: true,
        });
    }
}
