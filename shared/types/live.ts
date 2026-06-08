/** Protocolo WebSocket ao vivo — operador ↔ projetor (paridade v0.0.8). */

/** Paridade v0.0.8 monitor/projetor (Fase 3). */
export const BASELINE_LIVE_ACTIONS = [
  'background',
  /** CA-R21: /live não recebe `background`; o hub envia isto para limpar vídeo/fundo. */
  'limparFundo',
  'texto',
  'video',
  /** CAD-194: embed YouTube quando download local falha (valor = videoId 11 chars). */
  'youtube',
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

/** Overlay contador/timer de culto — sync multi-monitor (CAD-187). */
export const SERVICE_TIMER_ACTIONS = ['serviceTimer'] as const;

/** Texto rolante de alerta no rodapé — sync multi-monitor (CAD-188). */
export const FOOTER_ALERT_ACTIONS = ['footerAlert'] as const;

export const OVERLAY_ACTIONS = [
  ...SERVICE_TIMER_ACTIONS,
  ...FOOTER_ALERT_ACTIONS,
] as const;

export const LIVE_ACTIONS = [
  ...BASELINE_LIVE_ACTIONS,
  ...STAGE_RETURN_ACTIONS,
  ...OVERLAY_ACTIONS,
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

export type ExternalDisplayProfile =
  | 'live'
  | 'vocal'
  | 'stage'
  | 'player'
  | 'projection';

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
  screenSize?: DisplayScreenSize | null;
}

export type DisplayRole = 'operator' | 'projection' | 'stage-return' | 'off';

/** Tamanho da área de projeção por monitor (paridade v0.0.8 `conf_tela`). */
export interface DisplayScreenSize {
  preset: string;
  largura: string;
  altura: string;
  /** Pré-visualizar no projetor enquanto edita (antes de guardar). */
  livePreview?: boolean;
  /** Posição da área útil: centro, topo ou deslocamento personalizado. */
  position?: 'centro' | 'topo' | 'personalizado';
  offsetX?: string;
  offsetY?: string;
  /** Comportamento quando o conteúdo é menor que a área de projeção. */
  contentFit?: 'estender' | 'centralizar' | 'proporcional';
}

export interface DisplayAssignment {
  displayId: number;
  label: string;
  role: DisplayRole;
  bounds: { x: number; y: number; width: number; height: number };
  primary: boolean;
  /** Opcional; relevante para monitores em projeção. */
  screenSize?: DisplayScreenSize;
  /** false quando o monitor foi desligado mas a configuração foi preservada (CAD-175). */
  connected?: boolean;
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

/** Tipografia de projeção — sync ≤1s após guardar (CAD-313). */
export interface WsProjectionTypographySyncMessage {
  type: 'projection-typography-sync';
  projectionTypography: Record<string, unknown>;
  ts: number;
}

/** Biblioteca de mídia local — novo ficheiro detectado pelo watcher (tarefa 5). */
export interface WsMediaUpdatedMessage {
  type: 'media-updated';
  kind: 'videos';
  category: string;
  path: string;
  ts: number;
}

export interface WsDisplaysConfigUpdatedMessage {
  type: 'displays-config-updated';
  ts: number;
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
  | WsDevicePresenceMessage
  | WsProjectionTypographySyncMessage
  | WsMediaUpdatedMessage
  | WsDisplaysConfigUpdatedMessage;
