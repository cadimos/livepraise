/**
 * Overlay contador/timer nos clientes de projeção (CAD-187).
 * Lógica espelhada em shared/service-timer.ts.
 */

const SERVICE_TIMER_VERSION = 1;
const DEFAULT_TIMER_DURATION_MS = 30 * 60 * 1000;

function parseTarget(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { kind, id, mode } = raw;
  if (kind !== 'display' && kind !== 'external') return null;
  if (typeof id !== 'string' || !id.trim()) return null;
  if (mode !== 'counter' && mode !== 'timer') return null;
  return { kind, id: id.trim(), mode };
}

export function parseServiceTimerState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.version !== SERVICE_TIMER_VERSION) return null;

  const targets = [];
  if (Array.isArray(raw.targets)) {
    for (const item of raw.targets) {
      const target = parseTarget(item);
      if (target) targets.push(target);
    }
  }

  const timerDurationMs = Number(raw.timerDurationMs);
  const accumulatedMs = Number(raw.accumulatedMs);
  const startedAt =
    raw.startedAt === null || raw.startedAt === undefined
      ? null
      : Number(raw.startedAt);

  return {
    version: SERVICE_TIMER_VERSION,
    active: Boolean(raw.active),
    running: Boolean(raw.running),
    startedAt:
      startedAt !== null && Number.isFinite(startedAt) ? startedAt : null,
    accumulatedMs:
      Number.isFinite(accumulatedMs) && accumulatedMs >= 0
        ? Math.min(accumulatedMs, 24 * 60 * 60 * 1000)
        : 0,
    timerDurationMs:
      Number.isFinite(timerDurationMs) && timerDurationMs > 0
        ? Math.min(timerDurationMs, 24 * 60 * 60 * 1000)
        : DEFAULT_TIMER_DURATION_MS,
    targets: targets.slice(0, 32),
  };
}

export function decodeServiceTimerValor(valor) {
  if (!valor.trim()) {
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
  try {
    return parseServiceTimerState(JSON.parse(valor));
  } catch {
    return null;
  }
}

function counterElapsedMs(state, now = Date.now()) {
  let total = state.accumulatedMs;
  if (state.running && state.startedAt !== null) {
    total += Math.max(0, now - state.startedAt);
  }
  return total;
}

function timerRemainingMs(state, now = Date.now()) {
  return Math.max(0, state.timerDurationMs - counterElapsedMs(state, now));
}

function formatTimerMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function displayMsForMode(state, mode, now = Date.now()) {
  if (mode === 'timer') return formatTimerMs(timerRemainingMs(state, now));
  return formatTimerMs(counterElapsedMs(state, now));
}

function findTargetForClient(state, kind, id) {
  const key = String(id).trim();
  return state.targets.find((t) => t.kind === kind && t.id === key) ?? null;
}

function shouldShowOnClient(state, clientTarget) {
  if (!state?.active) return false;
  return findTargetForClient(state, clientTarget.kind, clientTarget.id) !== null;
}

function projectionOverlayRoot() {
  return document.getElementById('stage') ?? document.body;
}

/**
 * @param {{ kind: 'display' | 'external', id: string }} clientTarget
 */
export function createServiceTimerOverlay(clientTarget) {
  let state = null;
  let tickId = null;
  let root = null;

  function ensureRoot() {
    if (root) return root;
    root = document.createElement('div');
    root.id = 'service-timer-overlay';
    root.className = 'service-timer-overlay';
    root.hidden = true;
    root.setAttribute('aria-live', 'off');
    const label = document.createElement('span');
    label.className = 'service-timer-label';
    const value = document.createElement('span');
    value.className = 'service-timer-value';
    root.append(label, value);
    projectionOverlayRoot().appendChild(root);
    return root;
  }

  function stopTick() {
    if (tickId !== null) {
      cancelAnimationFrame(tickId);
      tickId = null;
    }
  }

  function hideOverlay() {
    const el = ensureRoot();
    el.hidden = true;
    delete el.dataset.mode;
  }

  function renderFrame() {
    tickId = null;
    const target = shouldShowOnClient(state, clientTarget)
      ? findTargetForClient(state, clientTarget.kind, clientTarget.id)
      : null;
    if (!target) {
      hideOverlay();
      stopTick();
      return;
    }

    const el = ensureRoot();
    const now = Date.now();
    const labelEl = el.querySelector('.service-timer-label');
    const valueEl = el.querySelector('.service-timer-value');
    if (labelEl) {
      labelEl.textContent = target.mode === 'timer' ? 'Timer' : 'Contador';
    }
    if (valueEl) {
      valueEl.textContent = displayMsForMode(state, target.mode, now);
    }
    el.dataset.mode = target.mode;
    el.hidden = false;

    if (state.running) {
      tickId = requestAnimationFrame(renderFrame);
    }
  }

  function scheduleTick() {
    stopTick();
    renderFrame();
  }

  return {
    applyValor(valor) {
      const next = decodeServiceTimerValor(valor);
      state = next ?? null;
      scheduleTick();
    },
    dispose() {
      stopTick();
      root?.remove();
      root = null;
      state = null;
    },
  };
}
