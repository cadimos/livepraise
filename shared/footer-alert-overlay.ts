/**
 * Marquee de alerta no rodapé (#last-action) — CAD-188.
 * DOM overlay; parsing em shared/footer-alert.ts.
 */

import {
  clientReceivesFooterAlert,
  decodeFooterAlertValor,
  type FooterAlertState,
  type FooterAlertTargetKind,
} from './footer-alert.js';

export interface FooterAlertClientTarget {
  kind: FooterAlertTargetKind;
  id: string;
}

export function createFooterAlertOverlay(clientTarget: FooterAlertClientTarget) {
  let playToken = 0;
  let endTimer: ReturnType<typeof setTimeout> | null = null;
  let textEl: HTMLSpanElement | null = null;

  function getFooter(): HTMLElement | null {
    return document.getElementById('last-action');
  }

  function clearTimer(): void {
    if (endTimer !== null) {
      clearTimeout(endTimer);
      endTimer = null;
    }
  }

  function resetDom(): void {
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

  function stop(): void {
    playToken += 1;
    resetDom();
  }

  function play(state: FooterAlertState): void {
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
    applyValor(valor: string) {
      const state = decodeFooterAlertValor(valor);
      if (!state) return;
      if (!state.active) {
        stop();
        return;
      }
      if (!clientReceivesFooterAlert(state, clientTarget.kind, clientTarget.id)) return;
      play(state);
    },
    stop,
    dispose() {
      stop();
    },
  };
}
