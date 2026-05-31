export const PROJECTION_TYPOGRAPHY_PROFILE_KEYS = [
    'projector',
    'stageReturn',
    'live',
    'vocal',
    'stage',
    'player',
];
export const DEFAULT_TEXT_SHADOW_LAYERS = [
    { offsetX: 2, offsetY: 2, blur: 0, color: '#000000' },
    { offsetX: 3, offsetY: 3, blur: 0, color: '#000000' },
    { offsetX: 5, offsetY: 5, blur: 0, color: '#000000' },
    { offsetX: 6, offsetY: 6, blur: 0, color: '#000000' },
];
export const DEFAULT_PROJECTION_TYPOGRAPHY_PROFILE = {
    fontSource: 'bundled',
    fontFamily: 'roboto',
    fontWeight: 700,
    fontStyle: 'normal',
    minFontPx: 24,
    maxFontPx: 120,
    textfillEnabled: true,
    textShadowEnabled: true,
    textShadowLayers: DEFAULT_TEXT_SHADOW_LAYERS.map((layer) => ({ ...layer })),
};
const FONT_STYLE_PRESETS = {
    normal: { fontWeight: 400, fontStyle: 'normal' },
    bold: { fontWeight: 700, fontStyle: 'normal' },
    italic: { fontWeight: 400, fontStyle: 'italic' },
    boldItalic: { fontWeight: 700, fontStyle: 'italic' },
};
export function defaultProjectionTypographyPrefs() {
    return PROJECTION_TYPOGRAPHY_PROFILE_KEYS.reduce((acc, key) => {
        acc[key] = {
            ...DEFAULT_PROJECTION_TYPOGRAPHY_PROFILE,
            textShadowLayers: DEFAULT_TEXT_SHADOW_LAYERS.map((layer) => ({ ...layer })),
        };
        return acc;
    }, {});
}
export function projectionFontStylePreset(profile) {
    if (profile.fontWeight === 700 && profile.fontStyle === 'italic')
        return 'boldItalic';
    if (profile.fontWeight === 700)
        return 'bold';
    if (profile.fontStyle === 'italic')
        return 'italic';
    return 'normal';
}
export function applyProjectionFontStylePreset(preset) {
    return { ...FONT_STYLE_PRESETS[preset] };
}
/** Zonas de texto com tipografia do perfil (topo, corpo, rodapé). */
export const PROJECTION_TYPOGRAPHY_TEXT_SHADOW_SELECTORS = '.titulo, .content > span, .rodape:not(:empty), .texto-fill, .texto';
export function applyProjectionTypographyStyles(rootEl, options) {
    rootEl.style.fontFamily = options.fontFamily;
    rootEl.style.fontWeight = String(options.fontWeight);
    rootEl.style.fontStyle = options.fontStyle;
    if (options.textShadowCss === undefined)
        return;
    rootEl
        .querySelectorAll(PROJECTION_TYPOGRAPHY_TEXT_SHADOW_SELECTORS)
        .forEach((el) => {
        el.style.textShadow = options.textShadowCss;
    });
}
function clampFontPx(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(400, Math.max(8, Math.round(n)));
}
function sanitizeHexColor(value, fallback = '#000000') {
    const raw = String(value ?? '').trim();
    if (/^#[0-9a-fA-F]{3}$/.test(raw))
        return raw;
    if (/^#[0-9a-fA-F]{6}$/.test(raw))
        return raw;
    return fallback;
}
function sanitizeShadowLayer(value) {
    if (!value || typeof value !== 'object')
        return null;
    const layer = value;
    return {
        offsetX: Math.min(20, Math.max(-20, Math.round(Number(layer.offsetX) || 0))),
        offsetY: Math.min(20, Math.max(-20, Math.round(Number(layer.offsetY) || 0))),
        blur: Math.min(20, Math.max(0, Math.round(Number(layer.blur) || 0))),
        color: sanitizeHexColor(layer.color),
    };
}
export function sanitizeProjectionTypographyProfile(value) {
    const base = DEFAULT_PROJECTION_TYPOGRAPHY_PROFILE;
    if (!value || typeof value !== 'object') {
        return {
            ...base,
            textShadowLayers: DEFAULT_TEXT_SHADOW_LAYERS.map((layer) => ({ ...layer })),
        };
    }
    const raw = value;
    const minFontPx = clampFontPx(raw.minFontPx, base.minFontPx);
    let maxFontPx = clampFontPx(raw.maxFontPx, base.maxFontPx);
    if (minFontPx > maxFontPx)
        maxFontPx = minFontPx;
    const layersRaw = Array.isArray(raw.textShadowLayers) ? raw.textShadowLayers : [];
    const textShadowLayers = layersRaw
        .map(sanitizeShadowLayer)
        .filter((layer) => layer !== null);
    const normalizedLayers = textShadowLayers.length > 0
        ? textShadowLayers
        : DEFAULT_TEXT_SHADOW_LAYERS.map((layer) => ({ ...layer }));
    const fontWeight = raw.fontWeight === 700 ? 700 : 400;
    const fontStyle = raw.fontStyle === 'italic' ? 'italic' : 'normal';
    const fontSource = raw.fontSource === 'system' ? 'system' : 'bundled';
    const advanced = typeof raw.textShadowCssAdvanced === 'string'
        ? raw.textShadowCssAdvanced.trim()
        : undefined;
    return {
        fontSource,
        fontFamily: typeof raw.fontFamily === 'string' && raw.fontFamily.trim()
            ? raw.fontFamily.trim()
            : base.fontFamily,
        fontWeight,
        fontStyle,
        minFontPx,
        maxFontPx,
        textfillEnabled: raw.textfillEnabled !== false,
        textShadowEnabled: raw.textShadowEnabled !== false,
        textShadowLayers: normalizedLayers,
        textShadowCssAdvanced: advanced || undefined,
    };
}
export function sanitizeProjectionTypographyPrefs(value) {
    const defaults = defaultProjectionTypographyPrefs();
    if (!value || typeof value !== 'object')
        return defaults;
    const raw = value;
    const result = { ...defaults };
    for (const key of PROJECTION_TYPOGRAPHY_PROFILE_KEYS) {
        result[key] = sanitizeProjectionTypographyProfile(raw[key]);
    }
    return result;
}
export function projectionTypographyMinMaxError(profile) {
    return profile.minFontPx > profile.maxFontPx;
}
export function resolveBundledFontFileName(weight, style) {
    if (weight === 700 && style === 'italic')
        return 'BoldItalic';
    if (weight === 700)
        return 'Bold';
    if (style === 'italic')
        return 'Italic';
    return 'Regular';
}
/** Selecciona ficheiro woff2 do manifest por peso/estilo. */
export function bundledFontFileForProfile(files, weight, style) {
    const suffix = resolveBundledFontFileName(weight, style);
    return files.find((file) => file.includes(`-${suffix}.`)) ?? files[0] ?? null;
}
