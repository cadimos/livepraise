/** Estado da acção `footerAlert` — texto rolante no rodapé (CAD-188). */
export const FOOTER_ALERT_VERSION = 1;
export const FOOTER_ALERT_DEFAULTS = {
    repeatCount: 3,
    textColor: '#ffffff',
    backgroundColor: '#000000',
    scrollDurationSec: 15,
};
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
export function isValidFooterAlertColor(value) {
    return HEX_COLOR.test(value.trim());
}
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function parseTarget(raw) {
    if (!isRecord(raw))
        return null;
    const kind = raw.kind;
    const id = raw.id;
    if (kind !== 'display' && kind !== 'external')
        return null;
    if (typeof id !== 'string' || !id.trim())
        return null;
    return { kind, id: id.trim() };
}
function clampInt(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
}
function normalizeColor(value, fallback) {
    if (typeof value !== 'string')
        return fallback;
    const trimmed = value.trim();
    return isValidFooterAlertColor(trimmed) ? trimmed.toLowerCase() : fallback;
}
function normalizeText(value) {
    if (typeof value !== 'string')
        return '';
    return value
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);
}
/** Valida e normaliza payload JSON da acção `footerAlert`. */
export function parseFooterAlertState(raw) {
    if (!isRecord(raw))
        return null;
    if (raw.version !== FOOTER_ALERT_VERSION)
        return null;
    const targets = [];
    if (Array.isArray(raw.targets)) {
        for (const item of raw.targets) {
            const target = parseTarget(item);
            if (target)
                targets.push(target);
        }
    }
    return {
        version: FOOTER_ALERT_VERSION,
        active: Boolean(raw.active),
        text: normalizeText(raw.text),
        repeatCount: clampInt(raw.repeatCount, 1, 20, FOOTER_ALERT_DEFAULTS.repeatCount),
        textColor: normalizeColor(raw.textColor, FOOTER_ALERT_DEFAULTS.textColor),
        backgroundColor: normalizeColor(raw.backgroundColor, FOOTER_ALERT_DEFAULTS.backgroundColor),
        scrollDurationSec: clampInt(raw.scrollDurationSec, 1, 120, FOOTER_ALERT_DEFAULTS.scrollDurationSec),
        targets: targets.slice(0, 32),
    };
}
export function encodeFooterAlertState(state) {
    return JSON.stringify(state);
}
export function decodeFooterAlertValor(valor) {
    if (!valor.trim())
        return null;
    try {
        return parseFooterAlertState(JSON.parse(valor));
    }
    catch {
        return null;
    }
}
export function defaultFooterAlertDraft() {
    return {
        version: FOOTER_ALERT_VERSION,
        active: false,
        text: '',
        repeatCount: FOOTER_ALERT_DEFAULTS.repeatCount,
        textColor: FOOTER_ALERT_DEFAULTS.textColor,
        backgroundColor: FOOTER_ALERT_DEFAULTS.backgroundColor,
        scrollDurationSec: FOOTER_ALERT_DEFAULTS.scrollDurationSec,
        targets: [],
    };
}
export function clientReceivesFooterAlert(state, kind, id) {
    if (!state.active || !state.text.trim())
        return false;
    if (!state.targets.length)
        return true;
    const key = id.trim();
    return state.targets.some((t) => t.kind === kind && t.id === key);
}
