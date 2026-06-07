import type { Server } from 'node:http';
import type { Socket } from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';
import { canAccessRemote, isStaffRole } from '../../core/auth/roles.js';
import { resolveSession } from '../../core/auth/sessions.js';
import { getMainDb } from '../db/connection.js';
import { isLoopbackAddress } from '../middleware/client-ip.js';
import { getLivepraiseHome } from '../config/paths.js';
import {
  clearPersistedProjectionBackground,
  createLiveStateStore,
  loadPersistedProjectionBackground,
  savePersistedProjectionBackground,
  type LiveStateStore,
} from '../../core/live-state/index.js';
import { parseLiveAction, sanitizeLiveAction } from '../../core/projection/index.js';
import { effectiveDeliveryAction } from '../../shared/live-delivery.js';
import type {
  ClientRole,
  ExternalDisplayProfile,
  LiveAction,
  WsClientMessage,
  WsDevicePresenceMessage,
  WsLiveBroadcastMessage,
  WsProjectionTypographySyncMessage,
  WsServerMessage,
} from '../../shared/types/live.js';
import {
  getExternalDevice,
  isExternalDisplayProfile,
  touchExternalDevice,
} from '../../core/devices/external-devices.js';
import {
  loadProjectionTypographyPrefs,
} from '../../core/projection-typography/persistence.js';
import type { ProjectionTypographyPrefs } from '../../shared/projection-typography.js';

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
  broadcastProjectionTypography(projectionTypography: ProjectionTypographyPrefs): void;
  broadcastMediaUpdated(update: {
    kind: 'videos';
    category: string;
    path: string;
  }): void;
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
  if (!auth || !auth.user.active || !isStaffRole(auth.user.role)) return null;
  return { userId: auth.user.id, username: auth.user.username };
}

export function attachLiveWebSocket(
  httpServer: Server,
  path = LIVE_WS_PATH,
): LiveWebSocketHub {
  const store = createLiveStateStore();
  const persistedBackground = loadPersistedProjectionBackground();
  if (persistedBackground) {
    store.applyAction(persistedBackground, false);
  }
  const db = getMainDb();
  const wss = new WebSocketServer({ server: httpServer, path });
  const clients = new Map<WebSocket, ClientMeta>();
  let nextId = 1;

  function projectionTypographyState(): ProjectionTypographyPrefs {
    return loadProjectionTypographyPrefs(getLivepraiseHome());
  }

  function broadcastProjectionTypography(
    projectionTypography: ProjectionTypographyPrefs,
  ): void {
    const payload: WsProjectionTypographySyncMessage = {
      type: 'projection-typography-sync',
      projectionTypography,
      ts: Date.now(),
    };
    emitAll(payload);
  }

  function sendProjectionTypographySync(ws: WebSocket): void {
    send(ws, {
      type: 'projection-typography-sync',
      projectionTypography: projectionTypographyState(),
      ts: Date.now(),
    });
  }

  function emitAll(message: WsServerMessage, except?: WebSocket): void {
    for (const [socket, meta] of clients) {
      if (socket === except || socket.readyState !== WebSocket.OPEN) continue;
      if (message.type === 'live-action') {
        const delivered = effectiveDeliveryAction(
          meta.role,
          message.action,
          meta.profile,
        );
        if (!delivered) continue;
        if (delivered !== message.action) {
          send(socket, { ...message, action: delivered });
          continue;
        }
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

  function broadcastMediaUpdated(update: {
    kind: 'videos';
    category: string;
    path: string;
  }): void {
    emitOperators({
      type: 'media-updated',
      kind: update.kind,
      category: update.category,
      path: update.path,
      ts: Date.now(),
    });
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
    if (sanitized.acao === 'background' || sanitized.acao === 'video') {
      savePersistedProjectionBackground(sanitized);
    } else if (sanitized.acao === 'limparFundo') {
      clearPersistedProjectionBackground();
    }
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
          if (!auth || !auth.user.active || !canAccessRemote(auth.user.role)) {
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
                'external-display exige deviceId (UUID) e profile live|vocal|stage|player|projection',
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

        if (message.role === 'projector') {
          const deviceId = String(message.deviceId ?? '').trim();
          if (deviceId && /^[0-9a-f-]{36}$/i.test(deviceId)) {
            const device = touchExternalDevice(db, deviceId, 'projection');
            meta.deviceId = deviceId;
            meta.profile = 'projection';
            meta.showChords = device.showChords;
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
          (meta.role === 'external-display' &&
            (meta.profile === 'stage' || meta.profile === 'vocal'));
        const timerReplay =
          state.lastAction?.acao === 'serviceTimer' ? state.lastAction : null;
        send(ws, {
          type: 'joined',
          clientId,
          role: meta.role,
          state: useStageState
            ? {
                ...state,
                lastAction: timerReplay ?? state.lastStageAction,
              }
            : state,
        });
        sendProjectionTypographySync(ws);

        if (meta.role === 'external-display' || meta.role === 'projector') {
          if (meta.deviceId && meta.profile) {
            broadcastDevicePresence('online', meta);
          }
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

      applyOperatorAction(sanitized, meta.name);
    });

    ws.on('close', () => {
      const meta = clients.get(ws);
      if (meta?.deviceId && meta.profile) {
        broadcastDevicePresence('offline', meta);
      }
      clients.delete(ws);
    });
  });

  return {
    store,
    path,
    broadcast: (message) => emitAll(message),
    broadcastProjectionTypography,
    broadcastMediaUpdated,
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
