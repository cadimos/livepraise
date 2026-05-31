import { ref, readonly } from 'vue';
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

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

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

  if (message.type === 'joined') {
    connected.value = true;
    frozen.value = message.state?.frozen ?? false;
    lastAction.value = message.state?.lastAction ?? null;
  }

  if (message.type === 'live-action' && message.action) {
    lastAction.value = message.action;
  }

  if (message.type === 'state-sync' && message.state) {
    frozen.value = message.state.frozen;
    lastAction.value = message.state.lastAction;
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
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectLiveSocket();
  }, 1500);
}

export function connectLiveSocket(): void {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  connected.value = false;
  socket = new WebSocket(wsUrl());

  socket.addEventListener('open', () => {
    socket?.send(
      JSON.stringify({ type: 'join', role: 'operator', name: 'Operador' }),
    );
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
  if (frozen.value && acao !== 'atualizar') return false;

  socket.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao, valor },
    }),
  );
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
    frozen: readonly(frozen),
    lastAction: readonly(lastAction),
    connect: connectLiveSocket,
    sendAction: sendLiveAction,
    setFrozen: setFrozenState,
    toggleFrozen,
  };
}
