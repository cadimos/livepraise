function sanitizeHexColor(value) {
    const raw = value.trim();
    if (/^#[0-9a-fA-F]{3}$/.test(raw) || /^#[0-9a-fA-F]{6}$/.test(raw))
        return raw;
    return '#000000';
}
export function layersToTextShadowCss(layers) {
    if (!layers.length)
        return 'none';
    return layers
        .map((layer) => `${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${sanitizeHexColor(layer.color)}`)
        .join(', ');
}
/** Validação mínima para modo avançado — rejeita `url(`, `expression(` etc. */
export function isValidAdvancedTextShadowCss(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return false;
    if (/[;{}<>]|url\s*\(|expression\s*\(/i.test(trimmed))
        return false;
    return trimmed.length <= 512;
}
export function resolveProjectionTextShadowCss(layers, enabled, advancedCss) {
    if (!enabled)
        return 'none';
    const advanced = advancedCss?.trim();
    if (advanced && isValidAdvancedTextShadowCss(advanced))
        return advanced;
    return layersToTextShadowCss(layers);
}
/** Margem extra no textfill para sombra/contorno não cortar o texto. */
export function projectionTextShadowSlackPx(layers, enabled) {
    if (!enabled || !layers.length)
        return 0;
    let slack = 0;
    for (const layer of layers) {
        const down = Math.max(0, layer.offsetY) + layer.blur;
        const up = Math.max(0, -layer.offsetY) + layer.blur;
        slack = Math.max(slack, down, up);
    }
    return Math.ceil(slack);
}
