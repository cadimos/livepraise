import type { Server } from 'node:http';
import type { Socket } from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';
import { resolveSession } from '../../core/auth/sessions.js';
import { getMainDb } from '../db/connection.js';
import { isLoopbackAddress } from '../middleware/client-ip.js';
import { createLiveStateStore, type LiveStateStore } from '../../core/live-state/index.js';
import { parseLiveAction, sanitizeLiveAction } from '../../core/projection/index.js';
import {
  STAGE_RETURN_ACTIONS,
  type ClientRole,
  type ExternalDisplayProfile,
  type LiveAction,
  type LiveActionName,
  type WsClientMessage,
  type WsDevicePresenceMessage,
  type WsLiveBroadcastMessage,
  type WsServerMessage,
} from '../../shared/types/live.js';
import {
  getExternalDevice,
  isExternalDisplayProfile,
  touchExternalDevice,
} from '../../core/devices/external-devices.js';

const STAGE_ONLY = new Set<string>(STAGE_RETURN_ACTIONS);
const PROJECTOR_ONLY = new Set<string>(['viewMusica', 'viewBiblia']);

const SHARED_ACTIONS = new Set<string>([
  'background',
  'texto',
  'video',
  'removeConteudo',
  'atualizar',
  'ajustarTela',
]);

/** CA-R21: /live omite fundos (imagens/vídeos de background). */
const LIVE_VIEWER_SKIP = new Set<string>(['background']);

function externalDisplayReceives(
  profile: ExternalDisplayProfile,
  acao: LiveActionName,
): boolean {
  if (profile === 'live') {
    if (STAGE_ONLY.has(acao) || acao === 'background') return false;
    return (
      PROJECTOR_ONLY.has(acao) ||
      SHARED_ACTIONS.has(acao) ||
      acao === 'removeConteudo' ||
      acao === 'atualizar'
    );
  }
  if (profile === 'vocal') {
    if (STAGE_ONLY.has(acao) || acao === 'background' || acao === 'video') {
      return false;
    }
    return (
      PROJECTOR_ONLY.has(acao) ||
      SHARED_ACTIONS.has(acao) ||
      acao === 'removeConteudo' ||
      acao === 'atualizar'
    );
  }
  if (profile === 'stage') {
    return (
      STAGE_ONLY.has(acao) ||
      acao === 'removeConteudo' ||
      acao === 'atualizar'
    );
  }
  if (profile === 'player') {
    if (STAGE_ONLY.has(acao)) return false;
    return PROJECTOR_ONLY.has(acao) || SHARED_ACTIONS.has(acao);
  }
  return false;
}

function actionReceivableByRole(
  role: ClientRole,
  acao: LiveActionName,
  profile?: ExternalDisplayProfile,
): boolean {
  if (role === 'external-display' && profile) {
    return externalDisplayReceives(profile, acao);
  }
  if (STAGE_ONLY.has(acao)) return role === 'stage-return';
  if (PROJECTOR_ONLY.has(acao)) {
    return role === 'projector' || role === 'live-viewer';
  }
  if (SHARED_ACTIONS.has(acao)) {
    return (
      role === 'projector' ||
      role === 'stage-return' ||
      role === 'live-viewer'
    );
  }
  return true;
}

function shouldDeliver(
  role: ClientRole,
  action: LiveAction,
  profile?: ExternalDisplayProfile,
): boolean {
  if (role === 'operator' || role === 'remote-operator') return false;
  if (role === 'live-viewer' && LIVE_VIEWER_SKIP.has(action.acao)) return false;
  if (
    role === 'external-display' &&
    (profile === 'live' || profile === 'vocal') &&
    LIVE_VIEWER_SKIP.has(action.acao)
  ) {
    return false;
  }
  return actionReceivableByRole(role, action.acao, profile);
}

export const LIVE_WS_PATH = '/ws/live';

interface ClientMeta {
  id: string;
  role: ClientRole;
  name: string;
  joined: boolean;
  userId?: number;
  deviceId?: string;
  profile?: ExternalDisplayProfile;
  showChords?: boolean;
}

export interface LiveWebSocketHub {
  store: LiveStateStore;
  path: string;
  broadcast(message: WsServerMessage): void;
  applyOperatorAction(action: LiveAction, from: string): void;
  close(): Promise<void>;
}

function send(ws: WebSocket, message: WsServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function peerAddress(ws: WebSocket): string {
  const socket = (ws as WebSocket & { _socket?: Socket })._socket;
  return socket?.remoteAddress ?? '';
}

function requireOperatorSession(
  ws: WebSocket,
  token: string | undefined,
  db: ReturnType<typeof getMainDb>,
): { userId: number; username: string } | null {
  if (!token) return null;
  const auth = resolveSession(db, token);
  if (!auth || auth.user.role !== 'operator' || !auth.user.active) return null;
  return { userId: auth.user.id, username: auth.user.username };
}

export function attachLiveWebSocket(
  httpServer: Server,
  path = LIVE_WS_PATH,
): LiveWebSocketHub {
  const store = createLiveStateStore();
  const db = getMainDb();
  const wss = new WebSocketServer({ server: httpServer, path });
  const clients = new Map<WebSocket, ClientMeta>();
  let nextId = 1;

  function emitAll(message: WsServerMessage, except?: WebSocket): void {
    for (const [socket, meta] of clients) {
      if (socket === except || socket.readyState !== WebSocket.OPEN) continue;
      if (
        message.type === 'live-action' &&
        !shouldDeliver(meta.role, message.action, meta.profile)
      ) {
        continue;
      }
      send(socket, message);
    }
  }

  function emitOperators(message: WsServerMessage): void {
    for (const [socket, meta] of clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (meta.role !== 'operator' && meta.role !== 'remote-operator') continue;
      send(socket, message);
    }
  }

  function broadcastDevicePresence(
    event: 'online' | 'offline',
    meta: ClientMeta,
  ): void {
    if (!meta.deviceId || !meta.profile) return;
    const stored = getExternalDevice(db, meta.deviceId);
    const payload: WsDevicePresenceMessage = {
      type: 'device-presence',
      event,
      device: {
        clientId: meta.id,
        name: meta.name,
        deviceId: meta.deviceId,
        profile: meta.profile,
        showChords: meta.showChords ?? true,
        label: stored?.label ?? null,
      },
    };
    emitOperators(payload);
  }

  function applyOperatorAction(action: LiveAction, from: string): void {
    const sanitized = sanitizeLiveAction(action);
    if (!sanitized) return;
    const state = store.applyAction(sanitized, true);
    const broadcast: WsLiveBroadcastMessage = {
      type: 'live-action',
      from,
      action: sanitized,
      revision: state.revision,
      ts: Date.now(),
    };
    emitAll(broadcast);
  }

  wss.on('connection', (ws) => {
    const clientId = `c${nextId++}`;
    clients.set(ws, {
      id: clientId,
      role: 'operator',
      name: 'unknown',
      joined: false,
    });

    ws.on('message', (data) => {
      let message: WsClientMessage;
      try {
        message = JSON.parse(data.toString()) as WsClientMessage;
      } catch {
        send(ws, { type: 'error', message: 'JSON inválido' });
        return;
      }

      const meta = clients.get(ws);
      if (!meta) return;

      if (message.type === 'ping') {
        send(ws, { type: 'pong', ts: Date.now() });
        return;
      }

      if (message.type === 'set-frozen') {
        if (!meta.joined) {
          send(ws, { type: 'error', message: 'Envie join antes de set-frozen' });
          return;
        }
        if (meta.role !== 'operator' && meta.role !== 'remote-operator') {
          send(ws, { type: 'error', message: 'Apenas operador pode congelar' });
          return;
        }
        const state = store.setFrozen(Boolean(message.frozen));
        emitAll({ type: 'state-sync', state });
        return;
      }

      if (message.type === 'join') {
        const fromLoopback = isLoopbackAddress(peerAddress(ws));

        if (message.role === 'operator' && !fromLoopback) {
          const operatorAuth = requireOperatorSession(ws, message.token, db);
          if (!operatorAuth) {
            send(ws, {
              type: 'error',
              message: 'Token de operador obrigatório fora de localhost',
            });
            ws.close();
            return;
          }
          meta.userId = operatorAuth.userId;
          meta.name = operatorAuth.username;
        }

        if (message.role === 'remote-operator') {
          if (!message.token) {
            send(ws, { type: 'error', message: 'Token obrigatório para remoto' });
            ws.close();
            return;
          }
          const auth = resolveSession(db, message.token);
          if (!auth || auth.user.role !== 'remote' || !auth.user.active) {
            send(ws, { type: 'error', message: 'Sessão remota inválida' });
            ws.close();
            return;
          }
          meta.userId = auth.user.id;
          meta.name = auth.user.username;
        }

        if (message.role === 'external-display') {
          const deviceId = String(message.deviceId ?? '').trim();
          const profile = String(message.profile ?? '').trim();
          if (!deviceId || !isExternalDisplayProfile(profile)) {
            send(ws, {
              type: 'error',
              message:
                'external-display exige deviceId (UUID) e profile live|vocal|stage|player',
            });
            ws.close();
            return;
          }
          const device = touchExternalDevice(db, deviceId, profile);
          meta.deviceId = deviceId;
          meta.profile = profile;
          meta.showChords =
            message.showChords !== undefined
              ? Boolean(message.showChords)
              : device.showChords;
          if (profile === 'vocal' || profile === 'live') {
            meta.showChords = false;
          }
        }

        meta.role = message.role;
        if (message.name && message.role !== 'remote-operator') {
          meta.name = message.name;
        } else if (message.role !== 'remote-operator') {
          meta.name = message.role;
        }
        meta.joined = true;

        const state = store.getState();
        const useStageState =
          meta.role === 'stage-return' ||
          (meta.role === 'external-display' && meta.profile === 'stage');
        send(ws, {
          type: 'joined',
          clientId,
          role: meta.role,
          state: useStageState
            ? {
                ...state,
                lastAction: state.lastStageAction,
              }
            : state,
        });

        if (meta.role === 'external-display') {
          broadcastDevicePresence('online', meta);
        }
        return;
      }

      if (!meta.joined) {
        send(ws, { type: 'error', message: 'Envie join antes de live-action' });
        return;
      }

      if (message.type !== 'live-action') return;

      const action = parseLiveAction(message.action);
      if (!action) {
        send(ws, { type: 'error', message: 'Ação ao vivo inválida' });
        return;
      }

      const isOperator =
        meta.role === 'operator' || meta.role === 'remote-operator';

      if (meta.role === 'remote-operator') {
        send(ws, {
          type: 'error',
          message: 'Remoto não pode enviar live-action directamente; use /api/remote/live-request',
        });
        return;
      }

      if (!isOperator) {
        send(ws, {
          type: 'error',
          message: 'Apenas operador pode publicar live-action',
        });
        return;
      }

      const sanitized = sanitizeLiveAction(action);
      if (!sanitized) {
        send(ws, {
          type: 'error',
          message: 'Ação ao vivo rejeitada (conteúdo não permitido)',
        });
        return;
      }

      const state = store.applyAction(sanitized, true);
      const broadcast: WsLiveBroadcastMessage = {
        type: 'live-action',
        from: meta.name,
        action: sanitized,
        revision: state.revision,
        ts: Date.now(),
      };

      emitAll(broadcast);
    });

    ws.on('close', () => {
      const meta = clients.get(ws);
      if (meta?.role === 'external-display') {
        broadcastDevicePresence('offline', meta);
      }
      clients.delete(ws);
    });
  });

  return {
    store,
    path,
    broadcast: (message) => emitAll(message),
    applyOperatorAction,
    close: () =>
      new Promise((resolve, reject) => {
        wss.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}
