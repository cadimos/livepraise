/** Estado sincronizado do contador/timer de culto (CAD-187). */
export const SERVICE_TIMER_VERSION = 1;
export const DEFAULT_TIMER_DURATION_MS = 30 * 60 * 1000;
export function defaultServiceTimerState() {
    return {
        version: SERVICE_TIMER_VERSION,
        active: false,
        running: false,
        startedAt: null,
        accumulatedMs: 0,
        timerDurationMs: DEFAULT_TIMER_DURATION_MS,
        targets: [],
    };
}
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function parseTarget(raw) {
    if (!isRecord(raw))
        return null;
    const kind = raw.kind;
    const id = raw.id;
    const mode = raw.mode;
    if (kind !== 'display' && kind !== 'external')
        return null;
    if (typeof id !== 'string' || !id.trim())
        return null;
    if (mode !== 'counter' && mode !== 'timer')
        return null;
    return { kind, id: id.trim(), mode };
}
/** Valida e normaliza payload JSON da acção `serviceTimer`. */
export function parseServiceTimerState(raw) {
    if (!isRecord(raw))
        return null;
    if (raw.version !== SERVICE_TIMER_VERSION)
        return null;
    const targets = [];
    if (Array.isArray(raw.targets)) {
        for (const item of raw.targets) {
            const target = parseTarget(item);
            if (target)
                targets.push(target);
        }
    }
    const timerDurationMs = Number(raw.timerDurationMs);
    const accumulatedMs = Number(raw.accumulatedMs);
    const startedAt = raw.startedAt === null || raw.startedAt === undefined
        ? null
        : Number(raw.startedAt);
    return {
        version: SERVICE_TIMER_VERSION,
        active: Boolean(raw.active),
        running: Boolean(raw.running),
        startedAt: startedAt !== null && Number.isFinite(startedAt) ? startedAt : null,
        accumulatedMs: Number.isFinite(accumulatedMs) && accumulatedMs >= 0
            ? Math.min(accumulatedMs, 24 * 60 * 60 * 1000)
            : 0,
        timerDurationMs: Number.isFinite(timerDurationMs) && timerDurationMs > 0
            ? Math.min(timerDurationMs, 24 * 60 * 60 * 1000)
            : DEFAULT_TIMER_DURATION_MS,
        targets: targets.slice(0, 32),
    };
}
export function encodeServiceTimerState(state) {
    return JSON.stringify(state);
}
export function decodeServiceTimerValor(valor) {
    if (!valor.trim())
        return defaultServiceTimerState();
    try {
        return parseServiceTimerState(JSON.parse(valor));
    }
    catch {
        return null;
    }
}
/** Elapsed ms for counter mode (count-up). */
export function counterElapsedMs(state, now = Date.now()) {
    let total = state.accumulatedMs;
    if (state.running && state.startedAt !== null) {
        total += Math.max(0, now - state.startedAt);
    }
    return total;
}
/** Remaining ms for timer mode (count-down). */
export function timerRemainingMs(state, now = Date.now()) {
    const elapsed = counterElapsedMs(state, now);
    return Math.max(0, state.timerDurationMs - elapsed);
}
export function formatTimerMs(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (h > 0)
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
}
export function displayMsForMode(state, mode, now = Date.now()) {
    if (mode === 'timer')
        return formatTimerMs(timerRemainingMs(state, now));
    return formatTimerMs(counterElapsedMs(state, now));
}
export function findTargetForClient(state, kind, id) {
    const key = id.trim();
    return state.targets.find((t) => t.kind === kind && t.id === key) ?? null;
}
/** Overlay visível só com ferramenta activa e alvo seleccionado. */
export function shouldShowServiceTimerOnClient(state, kind, id) {
    if (!state.active)
        return false;
    return findTargetForClient(state, kind, id) !== null;
}
export function startServiceTimer(state, now = Date.now()) {
    if (state.running)
        return state;
    return { ...state, running: true, startedAt: now };
}
export function pauseServiceTimer(state, now = Date.now()) {
    if (!state.running)
        return state;
    const elapsed = counterElapsedMs(state, now);
    return {
        ...state,
        running: false,
        startedAt: null,
        accumulatedMs: elapsed,
    };
}
export function resetServiceTimer(state) {
    return {
        ...state,
        running: false,
        startedAt: null,
        accumulatedMs: 0,
    };
}
