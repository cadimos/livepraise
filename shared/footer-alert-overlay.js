/**
 * Marquee de alerta no rodapé (#last-action) — CAD-188.
 * Lógica espelhada em shared/footer-alert.ts.
 */

const FOOTER_ALERT_VERSION = 1;
const DEFAULTS = {
  repeatCount: 3,
  textColor: '#ffffff',
  backgroundColor: '#000000',
  scrollDurationSec: 15,
};

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function parseTarget(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { kind, id } = raw;
  if (kind !== 'display' && kind !== 'external') return null;
  if (typeof id !== 'string' || !id.trim()) return null;
  return { kind, id: id.trim() };
}

export function parseFooterAlertState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.version !== FOOTER_ALERT_VERSION) return null;

  const targets = [];
  if (Array.isArray(raw.targets)) {
    for (const item of raw.targets) {
      const target = parseTarget(item);
      if (target) targets.push(target);
    }
  }

  const repeatCount = Number(raw.repeatCount);
  const scrollDurationSec = Number(raw.scrollDurationSec);
  const text =
    typeof raw.text === 'string'
      ? raw.text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 500)
      : '';

  const normColor = (value, fallback) => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return HEX_COLOR.test(trimmed) ? trimmed.toLowerCase() : fallback;
  };

  return {
    version: FOOTER_ALERT_VERSION,
    active: Boolean(raw.active),
    text,
    repeatCount:
      Number.isFinite(repeatCount) && repeatCount >= 1
        ? Math.min(20, Math.round(repeatCount))
        : DEFAULTS.repeatCount,
    textColor: normColor(raw.textColor, DEFAULTS.textColor),
    backgroundColor: normColor(raw.backgroundColor, DEFAULTS.backgroundColor),
    scrollDurationSec:
      Number.isFinite(scrollDurationSec) && scrollDurationSec >= 1
        ? Math.min(120, Math.round(scrollDurationSec))
        : DEFAULTS.scrollDurationSec,
    targets: targets.slice(0, 32),
  };
}

export function decodeFooterAlertValor(valor) {
  if (!valor.trim()) return null;
  try {
    return parseFooterAlertState(JSON.parse(valor));
  } catch {
    return null;
  }
}

function clientReceives(state, clientTarget) {
  if (!state.active || !state.text) return false;
  if (!state.targets.length) return true;
  const key = String(clientTarget.id).trim();
  return state.targets.some((t) => t.kind === clientTarget.kind && t.id === key);
}

/**
 * @param {{ kind: 'display' | 'external', id: string }} clientTarget
 */
export function createFooterAlertOverlay(clientTarget) {
  let playToken = 0;
  let endTimer = null;
  let textEl = null;

  function getFooter() {
    return document.getElementById('last-action');
  }

  function clearTimer() {
    if (endTimer !== null) {
      clearTimeout(endTimer);
      endTimer = null;
    }
  }

  function stop() {
    playToken += 1;
    resetDom();
  }

  function resetDom() {
    clearTimer();
    const footer = getFooter();
    if (!footer) return;
    footer.classList.remove('footer-alert-visible');
    footer.style.removeProperty('--footer-alert-text-color');
    footer.style.removeProperty('--footer-alert-bg');
    footer.style.removeProperty('--footer-alert-duration');
    footer.style.removeProperty('--footer-alert-iterations');
    if (textEl) {
      textEl.remove();
      textEl = null;
    }
    footer.textContent = '';
    document.body.classList.remove('footer-alert-active');
  }

  function play(state) {
    const footer = getFooter();
    if (!footer) return;

    const token = ++playToken;
    resetDom();

    footer.textContent = '';
    footer.classList.add('footer-alert-visible');
    document.body.classList.add('footer-alert-active');

    const track = document.createElement('div');
    track.className = 'footer-alert-track';
    textEl = document.createElement('span');
    textEl.className = 'footer-alert-text';
    textEl.textContent = state.text;
    track.appendChild(textEl);
    footer.appendChild(track);

    const durationMs = state.scrollDurationSec * 1000;
    const totalMs = durationMs * state.repeatCount;

    footer.style.setProperty('--footer-alert-text-color', state.textColor);
    footer.style.setProperty('--footer-alert-bg', state.backgroundColor);
    footer.style.setProperty('--footer-alert-duration', `${state.scrollDurationSec}s`);
    footer.style.setProperty('--footer-alert-iterations', String(state.repeatCount));

    endTimer = setTimeout(() => {
      if (playToken !== token) return;
      stop();
    }, totalMs + 50);
  }

  return {
    applyValor(valor) {
      const state = decodeFooterAlertValor(valor);
      if (!state) return;
      if (!state.active) {
        stop();
        return;
      }
      if (!clientReceives(state, clientTarget)) return;
      play(state);
    },
    stop,
    dispose() {
      stop();
    },
  };
}
