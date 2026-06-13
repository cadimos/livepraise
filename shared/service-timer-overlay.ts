/**
 * Overlay contador/timer nos clientes de projeção (CAD-187).
 * DOM overlay; parsing em shared/service-timer.ts.
 */

import {
  decodeServiceTimerValor,
  displayMsForMode,
  findTargetForClient,
  shouldShowServiceTimerOnClient,
  type ServiceTimerState,
  type ServiceTimerTargetKind,
} from './service-timer.js';

export interface ServiceTimerClientTarget {
  kind: ServiceTimerTargetKind;
  id: string;
}

function projectionOverlayRoot(): HTMLElement {
  return document.getElementById('stage') ?? document.body;
}

export function createServiceTimerOverlay(clientTarget: ServiceTimerClientTarget) {
  let state: ServiceTimerState | null = null;
  let tickId: number | null = null;
  let root: HTMLDivElement | null = null;

  function ensureRoot(): HTMLDivElement {
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

  function stopTick(): void {
    if (tickId !== null) {
      cancelAnimationFrame(tickId);
      tickId = null;
    }
  }

  function hideOverlay(): void {
    const el = ensureRoot();
    el.hidden = true;
    delete el.dataset.mode;
  }

  function renderFrame(): void {
    tickId = null;
    if (!state || !shouldShowServiceTimerOnClient(state, clientTarget.kind, clientTarget.id)) {
      hideOverlay();
      stopTick();
      return;
    }

    const target = findTargetForClient(state, clientTarget.kind, clientTarget.id);
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

  function scheduleTick(): void {
    stopTick();
    renderFrame();
  }

  return {
    applyValor(valor: string) {
      state = decodeServiceTimerValor(valor);
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
