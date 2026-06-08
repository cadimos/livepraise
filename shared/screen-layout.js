/** Tamanho e posição da área de projeção (paridade v0.0.8 `conf_tela`). */
export const SCREEN_POSITIONS = ['centro', 'topo', 'personalizado'];
export const SCREEN_CONTENT_FITS = ['estender', 'centralizar', 'proporcional'];
export function isRatioPreset(tipo) {
    return ['16:9', '4:3', '7:3', '5:3', '13:7'].includes(tipo);
}
export function normalizeContentFit(value) {
    return SCREEN_CONTENT_FITS.includes(value)
        ? value
        : 'estender';
}
export function defaultScreenLayoutFields() {
    return {
        livePreview: false,
        position: 'centro',
        offsetX: '',
        offsetY: '',
        contentFit: 'estender',
    };
}
/** Dimensões em pixels quando largura e altura são válidas. */
export function parseCustomScreenPixels(largura, altura) {
    const w = Number.parseInt(String(largura ?? '').trim(), 10);
    const h = Number.parseInt(String(altura ?? '').trim(), 10);
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
        return null;
    }
    return { w, h };
}
export function buildAjustarTelaValor(preset, largura, altura) {
    if (preset === 'personalizado') {
        const custom = parseCustomScreenPixels(largura, altura);
        if (custom)
            return `${custom.w}x${custom.h}`;
        return '0x0';
    }
    return preset;
}
/** Texto legível do tamanho que será aplicado no projetor. */
export function describeScreenLayoutSize(preset, largura, altura) {
    if (!preset || preset === 'padrao')
        return 'padrao';
    if (preset === 'personalizado') {
        const custom = parseCustomScreenPixels(largura, altura);
        return custom ? `${custom.w}x${custom.h}` : 'invalido';
    }
    return preset;
}
/** Encaixa proporção num rectângulo (letterbox / pillarbox). */
export function fitAspectRatioInBox(numW, numH, boxW, boxH) {
    if (numW <= 0 || numH <= 0 || boxW <= 0 || boxH <= 0) {
        return { w: Math.max(1, Math.round(boxW)), h: Math.max(1, Math.round(boxH)) };
    }
    let widthPx = boxW;
    let heightPx = (widthPx * numH) / numW;
    if (heightPx > boxH) {
        heightPx = boxH;
        widthPx = (heightPx * numW) / numH;
    }
    return { w: Math.round(widthPx), h: Math.round(heightPx) };
}
/**
 * Calcula pixels da área de projeção (#stage) dentro de um viewport.
 * @param valor — `padrao`, `800x600`, `16:9`, etc.
 * @param viewportW — largura útil do monitor (ex.: bounds Electron)
 * @param viewportH — altura útil do monitor
 */
export function resolveProjectionStageSize(valor, viewportW, viewportH) {
    const boxW = Math.max(1, Math.round(viewportW));
    const boxH = Math.max(1, Math.round(viewportH));
    if (!valor || valor === 'padrao') {
        return { width: boxW, height: boxH, fullScreen: true };
    }
    const xIdx = valor.indexOf('x');
    if (xIdx >= 0) {
        const w = Number.parseInt(valor.slice(0, xIdx), 10);
        const h = Number.parseInt(valor.slice(xIdx + 1), 10);
        if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
            const width = Math.min(w, boxW);
            const height = Math.min(h, boxH);
            return {
                width,
                height,
                fullScreen: width >= boxW && height >= boxH,
            };
        }
    }
    if (valor.includes(':')) {
        const [numW, numH] = valor.split(':').map((part) => Number.parseInt(part, 10));
        if (Number.isFinite(numW) && numW > 0 && Number.isFinite(numH) && numH > 0) {
            const fitted = fitAspectRatioInBox(numW, numH, boxW, boxH);
            return {
                width: fitted.w,
                height: fitted.h,
                fullScreen: fitted.w >= boxW && fitted.h >= boxH,
            };
        }
    }
    const fixedHeight = Number.parseInt(valor, 10);
    if (Number.isFinite(fixedHeight) && fixedHeight > 0) {
        const height = Math.min(fixedHeight, boxH);
        return {
            width: boxW,
            height,
            fullScreen: height >= boxH,
        };
    }
    return { width: boxW, height: boxH, fullScreen: true };
}
const DEVICE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/**
 * Payload live-action `ajustarTela`:
 * `displayId|tamanho`, `deviceId|tamanho` ou `…|tamanho~posição~offsetX~offsetY[~contentFit]`
 */
export function parseAjustarTelaPayload(valor) {
    const raw = String(valor ?? '');
    const pipe = raw.indexOf('|');
    let displayId = null;
    let deviceId = null;
    let rest = raw;
    if (pipe >= 0) {
        const idPart = raw.slice(0, pipe);
        if (DEVICE_ID_RE.test(idPart)) {
            deviceId = idPart;
        }
        else {
            const parsedId = Number.parseInt(idPart, 10);
            displayId = Number.isFinite(parsedId) ? parsedId : null;
        }
        rest = raw.slice(pipe + 1);
    }
    const parts = rest.split('~');
    const size = parts[0] ?? 'padrao';
    const position = parts[1] || 'centro';
    const offsetX = Number.parseInt(parts[2] ?? '0', 10) || 0;
    const offsetY = Number.parseInt(parts[3] ?? '0', 10) || 0;
    const contentFit = normalizeContentFit(parts[4] || 'estender');
    return { displayId, deviceId, size, position, offsetX, offsetY, contentFit };
}
function buildAjustarTelaPayloadForTarget(targetId, screen) {
    const size = buildAjustarTelaValor(screen.preset, screen.largura, screen.altura);
    const position = screen.position || 'centro';
    const ox = String(screen.offsetX ?? '').trim();
    const oy = String(screen.offsetY ?? '').trim();
    const contentFit = normalizeContentFit(screen.contentFit ?? 'estender');
    const isDefaultPosition = position === 'centro' && !ox && !oy;
    const isDefaultFit = contentFit === 'estender';
    if (isDefaultPosition && isDefaultFit) {
        return `${targetId}|${size}`;
    }
    let payload = `${targetId}|${size}~${position}~${ox || '0'}~${oy || '0'}`;
    if (!isDefaultFit) {
        payload += `~${contentFit}`;
    }
    return payload;
}
export function buildAjustarTelaPayload(displayId, screen) {
    return buildAjustarTelaPayloadForTarget(displayId, screen);
}
export function buildAjustarTelaPayloadForDevice(deviceId, screen) {
    return buildAjustarTelaPayloadForTarget(deviceId, screen);
}
function normalizeDisplayId(value) {
    if (value === null || value === undefined)
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
/** Decide se um endpoint deve aplicar o payload `ajustarTela` recebido. */
export function matchesAjustarTelaTarget(parsed, localDisplayId, localDeviceId) {
    if (parsed.deviceId !== null) {
        if (!localDeviceId || parsed.deviceId !== localDeviceId) {
            return false;
        }
        return true;
    }
    const targetDisplayId = normalizeDisplayId(parsed.displayId);
    const endpointDisplayId = normalizeDisplayId(localDisplayId);
    if (targetDisplayId !== null && endpointDisplayId !== null) {
        return targetDisplayId === endpointDisplayId;
    }
    if (targetDisplayId !== null && endpointDisplayId === null && localDeviceId) {
        return false;
    }
    return true;
}
