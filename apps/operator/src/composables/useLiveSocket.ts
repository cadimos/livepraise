import { ref, readonly } from 'vue';
import {
  isBrowserLoopbackHost,
  readAuthToken,
} from '@shared/auth-session';
import type { LiveAction, LiveActionName, LiveState, WsDevicePresenceMessage } from '@shared/types/live';
import { handleDevicePresence } from './useExternalDevices';
import {
  onApprovalPending,
  onApprovalResolved,
  onChromeTabAdded,
  refreshApprovals,
  syncChromeTabs,
} from './useRemoteSync';

const connected = ref(false);
const frozen = ref(false);
const lastAction = ref<LiveAction | null>(null);
/** LAN sem sessão — evita loop de reconexão até login no portal. */
const authRequired = ref(false);

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let authRedirectPending = false;
const readyCallbacks: Array<() => void> = [];
export type LiveSocketEvent = {
  type: string;
  action?: LiveAction;
  state?: LiveState;
};

const socketEventListeners = new Set<(event: LiveSocketEvent) => void>();

function notifySocketEvent(event: LiveSocketEvent): void {
  for (const listener of socketEventListeners) {
    listener(event);
  }
}

/** Subscrição unificada a join, state-sync e live-action (CAD-223). */
export function subscribeLiveSocket(
  listener: (event: LiveSocketEvent) => void,
): () => void {
  socketEventListeners.add(listener);
  return () => socketEventListeners.delete(listener);
}

function flushReadyCallbacks(): void {
  if (!connected.value || !socket || socket.readyState !== WebSocket.OPEN) return;
  const pending = readyCallbacks.splice(0);
  for (const cb of pending) cb();
}

/** Executa quando o operador está ligado ao hub (após `joined`). */
export function whenLiveSocketReady(fn: () => void): void {
  if (connected.value && socket?.readyState === WebSocket.OPEN) {
    fn();
    return;
  }
  readyCallbacks.push(fn);
}

function wsUrl(): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws/live`;
}

function handleMessage(raw: string): void {
  const message = JSON.parse(raw) as {
    type: string;
    state?: LiveState;
    action?: LiveAction;
  };

  if (message.type === 'error') {
    const text = String((message as { message?: string }).message ?? '');
    if (text.includes('Token de operador')) {
      authRequired.value = true;
      scheduleAuthRedirect();
    }
  }

  if (message.type === 'joined') {
    connected.value = true;
    authRequired.value = false;
    frozen.value = message.state?.frozen ?? false;
    lastAction.value = message.state?.lastAction ?? null;
    notifySocketEvent({ type: 'joined', state: message.state });
    flushReadyCallbacks();
  }

  if (message.type === 'live-action' && message.action) {
    lastAction.value = message.action;
    notifySocketEvent({ type: 'live-action', action: message.action });
  }

  if (message.type === 'state-sync' && message.state) {
    frozen.value = message.state.frozen;
    lastAction.value = message.state.lastAction;
    notifySocketEvent({ type: 'state-sync', state: message.state });
  }

  if (message.type === 'chrome-tab-added') {
    onChromeTabAdded();
  }

  if (message.type === 'approval-pending') {
    onApprovalPending();
  }

  if (message.type === 'approval-resolved') {
    onApprovalResolved(message as unknown as { id: string });
  }

  if (message.type === 'device-presence') {
    handleDevicePresence(message as WsDevicePresenceMessage);
  }
}

function scheduleReconnect(): void {
  if (authRequired.value || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectLiveSocket();
  }, 1500);
}

function scheduleAuthRedirect(): void {
  if (authRedirectPending || isBrowserLoopbackHost()) return;
  authRedirectPending = true;
  const returnTo = encodeURIComponent(
    `${location.pathname}${location.search}${location.hash}`,
  );
  location.replace(`/?return=${returnTo}`);
}

function buildJoinPayload(): Record<string, string> {
  const payload: Record<string, string> = {
    type: 'join',
    role: 'operator',
    name: 'Operador',
  };
  const token = readAuthToken();
  if (token) payload.token = token;
  return payload;
}

export function connectLiveSocket(): void {
  if (authRequired.value && !readAuthToken()) {
    scheduleAuthRedirect();
    return;
  }

  if (!isBrowserLoopbackHost() && !readAuthToken()) {
    authRequired.value = true;
    scheduleAuthRedirect();
    return;
  }

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  connected.value = false;
  socket = new WebSocket(wsUrl());

  socket.addEventListener('open', () => {
    socket?.send(JSON.stringify(buildJoinPayload()));
    void syncChromeTabs();
    void refreshApprovals();
  });

  socket.addEventListener('message', (event) => {
    handleMessage(String(event.data));
  });

  socket.addEventListener('close', () => {
    connected.value = false;
    scheduleReconnect();
  });

  socket.addEventListener('error', () => {
    socket?.close();
  });
}

export function sendLiveAction(acao: LiveActionName, valor: string): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;

  const action: LiveAction = { acao, valor };
  const blockedOnProjector =
    frozen.value &&
    acao !== 'atualizar' &&
    acao !== 'serviceTimer' &&
    acao !== 'footerAlert';

  if (blockedOnProjector) {
    notifySocketEvent({ type: 'live-action', action });
    return true;
  }

  socket.send(
    JSON.stringify({
      type: 'live-action',
      action,
    }),
  );
  notifySocketEvent({ type: 'live-action', action });
  return true;
}

export function setFrozenState(next: boolean): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ type: 'set-frozen', frozen: next }));
  return true;
}

export function toggleFrozen(): boolean {
  return setFrozenState(!frozen.value);
}

export function useLiveSocket() {
  return {
    connected: readonly(connected),
    authRequired: readonly(authRequired),
    frozen: readonly(frozen),
    lastAction: readonly(lastAction),
    connect: connectLiveSocket,
    sendAction: sendLiveAction,
    setFrozen: setFrozenState,
    toggleFrozen,
  };
}
