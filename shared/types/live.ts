/** Protocolo WebSocket ao vivo — operador ↔ projetor (paridade v0.0.8). */

/** Paridade v0.0.8 monitor/projetor (Fase 3). */
export const BASELINE_LIVE_ACTIONS = [
  'background',
  'texto',
  'video',
  'viewMusica',
  'viewBiblia',
  'removeConteudo',
  'atualizar',
  'ajustarTela',
] as const;

/** Retorno de palco — visão distinta da projeção pública (Fase 5, CA-R20). */
export const STAGE_RETURN_ACTIONS = [
  'viewMusicaRetorno',
  'viewBibliaRetorno',
] as const;

export const LIVE_ACTIONS = [
  ...BASELINE_LIVE_ACTIONS,
  ...STAGE_RETURN_ACTIONS,
] as const;

export type LiveActionName = (typeof LIVE_ACTIONS)[number];

export interface LiveAction {
  acao: LiveActionName;
  valor: string;
}

export interface LiveState {
  frozen: boolean;
  lastAction: LiveAction | null;
  lastStageAction: LiveAction | null;
  revision: number;
}

export type ExternalDisplayProfile = 'live' | 'vocal' | 'stage' | 'player';

export type ClientRole =
  | 'operator'
  | 'projector'
  | 'stage-return'
  | 'remote-operator'
  | 'live-viewer'
  | 'external-display';

export interface ExternalDeviceInfo {
  deviceId: string;
  profile: ExternalDisplayProfile;
  showChords: boolean;
  label: string | null;
}

export type DisplayRole = 'operator' | 'projection' | 'stage-return' | 'off';

/** Tamanho da área de projeção por monitor (paridade v0.0.8 `conf_tela`). */
export interface DisplayScreenSize {
  preset: string;
  largura: string;
  altura: string;
}

export interface DisplayAssignment {
  displayId: number;
  label: string;
  role: DisplayRole;
  bounds: { x: number; y: number; width: number; height: number };
  primary: boolean;
  /** Opcional; relevante para monitores em projeção. */
  screenSize?: DisplayScreenSize;
}

export interface DisplaysConfig {
  assignments: DisplayAssignment[];
  updatedAt: string;
}

export interface WsJoinMessage {
  type: 'join';
  role: ClientRole;
  name?: string;
  token?: string;
  deviceId?: string;
  profile?: ExternalDisplayProfile;
  showChords?: boolean;
}

export interface WsLiveActionMessage {
  type: 'live-action';
  action: LiveAction;
}

export interface WsPingMessage {
  type: 'ping';
}

export interface WsSetFrozenMessage {
  type: 'set-frozen';
  frozen: boolean;
}

export type WsClientMessage =
  | WsJoinMessage
  | WsLiveActionMessage
  | WsPingMessage
  | WsSetFrozenMessage;

export interface WsJoinedMessage {
  type: 'joined';
  clientId: string;
  role: ClientRole;
  state: LiveState;
}

export interface WsLiveBroadcastMessage {
  type: 'live-action';
  from: string;
  action: LiveAction;
  revision: number;
  ts: number;
}

export interface WsStateSyncMessage {
  type: 'state-sync';
  state: LiveState;
}

export interface WsPongMessage {
  type: 'pong';
  ts: number;
}

export interface WsErrorMessage {
  type: 'error';
  message: string;
}

export interface WsChromeTabAddedMessage {
  type: 'chrome-tab-added';
  tab: {
    id: string;
    label: string;
    songId: number | null;
    songName: string | null;
    from: string;
  };
}

export interface WsApprovalPendingMessage {
  type: 'approval-pending';
  item: {
    id: string;
    kind: string;
    userName: string;
    payload: Record<string, unknown>;
    createdAt: string;
  };
}

export interface WsApprovalResolvedMessage {
  type: 'approval-resolved';
  id: string;
  status: string;
}

export interface WsDevicePresenceMessage {
  type: 'device-presence';
  event: 'online' | 'offline';
  device: ExternalDeviceInfo & { clientId: string; name: string };
}

export type WsServerMessage =
  | WsJoinedMessage
  | WsLiveBroadcastMessage
  | WsStateSyncMessage
  | WsPongMessage
  | WsErrorMessage
  | WsChromeTabAddedMessage
  | WsApprovalPendingMessage
  | WsApprovalResolvedMessage
  | WsDevicePresenceMessage;
