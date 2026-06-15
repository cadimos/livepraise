import {
  attachProjectionContrast,
  syncProjectionContentState,
} from '/shared/projection-contrast.js';
import {
  attachDisplayDebugOverlayListener,
  updateLastActionBadge,
} from '/shared/display-debug-overlay.js';
import { resolveProjectionMediaUrl } from '/shared/projection-media-url.js';
import { clearProjectionVideoUnlock, playProjectionVideo } from '/shared/projection-video-player.js';
import { playYoutubeProjection, stopYoutubeProjection } from './youtube-iframe-player.js';
import { createFooterAlertOverlay } from '/shared/footer-alert-overlay.js';
import { parseAjustarTelaPayload, buildAjustarTelaValor, normalizeContentFit, matchesAjustarTelaTarget, resolveProjectionStageSize, type AjustarTelaPayload } from '/shared/screen-layout.js';
import { ensureEndpointDeviceId } from '/shared/endpoint-device-id.js';
import { createServiceTimerOverlay } from '/shared/service-timer-overlay.js';
import {
  attachProjectionTypographyWs,
  createProjectionTypographyController,
  fetchProjectionTypographyPrefs,
} from '/shared/projection-typography-runtime.js';

attachDisplayDebugOverlayListener();

type LiveActionName =
  | 'background'
  | 'texto'
  | 'video'
  | 'youtube'
  | 'viewMusica'
  | 'viewBiblia'
  | 'removeConteudo'
  | 'atualizar'
  | 'ajustarTela'
  | 'serviceTimer'
  | 'footerAlert';

interface LiveAction {
  acao: LiveActionName;
  valor: string;
}

interface WsLiveBroadcastMessage {
  type: 'live-action';
  action: LiveAction;
}

interface WsJoinedMessage {
  type: 'joined';
  state: { lastAction: LiveAction | null };
}

type WsServerMessage = WsLiveBroadcastMessage | WsJoinedMessage | { type: string };

function wsUrl(): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws/live`;
}

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  return el as T;
}

function projectorDisplayId(): number | null {
  const raw = new URLSearchParams(location.search).get('displayId');
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

const LOCAL_DISPLAY_ID = projectorDisplayId();
const LOCAL_DEVICE_ID =
  LOCAL_DISPLAY_ID === null ? ensureEndpointDeviceId('projection') : null;

function readViewportFromUrl(): { w: number; h: number } | null {
  const params = new URLSearchParams(location.search);
  const w = Number.parseInt(params.get('vw') ?? '', 10);
  const h = Number.parseInt(params.get('vh') ?? '', 10);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) return null;
  return { w, h };
}

let displayBounds = readViewportFromUrl();
let currentScreenLayout: AjustarTelaPayload | null = null;

function readClientViewport(): { w: number; h: number } {
  const w = document.documentElement.clientWidth || window.innerWidth || 0;
  const h = document.documentElement.clientHeight || window.innerHeight || 0;
  return {
    w: Math.max(1, Math.round(w)),
    h: Math.max(1, Math.round(h)),
  };
}

/** Viewport lógico para letterbox — prioriza bounds do monitor (Electron). */
function projectionViewport(): { w: number; h: number } {
  if (displayBounds) {
    return { w: displayBounds.w, h: displayBounds.h };
  }
  return readClientViewport();
}

async function refreshDisplayBoundsFromConfig(): Promise<void> {
  if (LOCAL_DISPLAY_ID === null) return;
  try {
    const res = await fetch(`${location.origin}/displays/config`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      config?: {
        assignments?: Array<{
          displayId: number;
          bounds?: { width: number; height: number };
        }>;
      };
    };
    const assignment = data.config?.assignments?.find(
      (a) => a.displayId === LOCAL_DISPLAY_ID,
    );
    if (assignment?.bounds?.width && assignment.bounds.height) {
      displayBounds = {
        w: assignment.bounds.width,
        h: assignment.bounds.height,
      };
    }
  } catch {
    /* ignore */
  }
}

async function registerRemoteDevice(): Promise<void> {
  if (!LOCAL_DEVICE_ID) return;
  try {
    await fetch(
      `${location.origin}/api/devices/${encodeURIComponent(LOCAL_DEVICE_ID)}?profile=projection`,
    );
  } catch {
    /* servidor pode ainda não estar pronto */
  }
}

const serviceTimerOverlay = createServiceTimerOverlay({
  kind: 'display',
  id: LOCAL_DISPLAY_ID !== null ? String(LOCAL_DISPLAY_ID) : (LOCAL_DEVICE_ID ?? ''),
});

const footerAlertOverlay = createFooterAlertOverlay({
  kind: 'display',
  id: LOCAL_DISPLAY_ID !== null ? String(LOCAL_DISPLAY_ID) : (LOCAL_DEVICE_ID ?? ''),
});

function shouldApplyScreenLayout(valor: string): ReturnType<typeof parseAjustarTelaPayload> | null {
  const parsed = parseAjustarTelaPayload(valor);
  if (!matchesAjustarTelaTarget(parsed, LOCAL_DISPLAY_ID, LOCAL_DEVICE_ID)) {
    return null;
  }
  return parsed;
}

function applyScreenPosition(
  position: string,
  offsetX: number,
  offsetY: number,
): void {
  const align =
    position === 'topo' || position === 'personalizado' ? position : 'centro';
  document.body.dataset.screenAlign = align;
  const stage = byId<HTMLDivElement>('stage');
  if (align === 'personalizado') {
    stage.style.marginLeft = `${Math.max(0, offsetX)}px`;
    stage.style.marginTop = `${Math.max(0, offsetY)}px`;
  } else {
    stage.style.marginLeft = '';
    stage.style.marginTop = '';
  }
}

function applyContentFit(contentFit: string): void {
  document.body.dataset.contentFit = normalizeContentFit(contentFit);
}

async function applyStoredScreenSize(): Promise<void> {
  await refreshDisplayBoundsFromConfig();
  if (LOCAL_DISPLAY_ID !== null) {
    try {
      const res = await fetch(`${location.origin}/displays/config`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        config?: {
          assignments?: Array<{
            displayId: number;
            screenSize?: {
              preset: string;
              largura: string;
              altura: string;
              position?: string;
              offsetX?: string;
              offsetY?: string;
              contentFit?: string;
            };
          }>;
        };
      };
      const assignment = data.config?.assignments?.find(
        (a) => a.displayId === LOCAL_DISPLAY_ID,
      );
      const screen = assignment?.screenSize;
      if (!screen) return;
      applyScreenLayout({
        displayId: LOCAL_DISPLAY_ID,
        deviceId: null,
        size: buildAjustarTelaValor(screen.preset, screen.largura, screen.altura),
        position: screen.position ?? 'centro',
        offsetX: Number.parseInt(screen.offsetX ?? '0', 10) || 0,
        offsetY: Number.parseInt(screen.offsetY ?? '0', 10) || 0,
        contentFit: normalizeContentFit(screen.contentFit ?? 'estender'),
      });
    } catch {
      /* ignore */
    }
    return;
  }

  if (LOCAL_DEVICE_ID === null) return;
  try {
    const res = await fetch(
      `${location.origin}/api/devices/${encodeURIComponent(LOCAL_DEVICE_ID)}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as {
      device?: {
        screenSize?: {
          preset: string;
          largura: string;
          altura: string;
          position?: string;
          offsetX?: string;
          offsetY?: string;
          contentFit?: string;
        } | null;
      };
    };
    const screen = data.device?.screenSize;
    if (!screen) return;
    applyScreenLayout({
      displayId: null,
      deviceId: LOCAL_DEVICE_ID,
      size: buildAjustarTelaValor(screen.preset, screen.largura, screen.altura),
      position: screen.position ?? 'centro',
      offsetX: Number.parseInt(screen.offsetX ?? '0', 10) || 0,
      offsetY: Number.parseInt(screen.offsetY ?? '0', 10) || 0,
      contentFit: normalizeContentFit(screen.contentFit ?? 'estender'),
    });
  } catch {
    /* ignore */
  }
}

function applyScreenLayout(layout: AjustarTelaPayload): void {
  currentScreenLayout = layout;
  applyScreenSize(layout.size);
  applyScreenPosition(layout.position, layout.offsetX, layout.offsetY);
  applyContentFit(layout.contentFit);
}

function reapplyCurrentScreenLayout(): void {
  if (currentScreenLayout) {
    applyScreenSize(currentScreenLayout.size);
  }
}

/** Paridade v0.0.8 `projetor.js` — ajusta área útil da projeção. */
function applyScreenSize(valor: string): void {
  const stage = byId<HTMLDivElement>('stage');
  const targets = [stage, byId<HTMLDivElement>('bg-layer'), byId<HTMLDivElement>('conteudo')];
  const viewport = projectionViewport();
  const resolved = resolveProjectionStageSize(valor, viewport.w, viewport.h);

  const setSize = (width: number, height: number): void => {
    for (const el of targets) {
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      el.style.maxWidth = `${width}px`;
      el.style.maxHeight = `${height}px`;
      el.style.minWidth = `${width}px`;
      el.style.minHeight = `${height}px`;
      el.style.flex = '0 0 auto';
    }
  };

  const resetFullScreen = (): void => {
    for (const el of targets) {
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.maxWidth = '';
      el.style.maxHeight = '';
      el.style.minWidth = '';
      el.style.minHeight = '';
      el.style.flex = '';
    }
  };

  if (resolved.fullScreen && (!valor || valor === 'padrao')) {
    resetFullScreen();
    document.body.dataset.screen = valor || 'padrao';
    return;
  }

  setSize(resolved.width, resolved.height);
  document.body.dataset.screen = valor || 'padrao';
}

function hideBackgroundMedia(): void {
  const bgImg = byId<HTMLImageElement>('bg-image');
  const videoWrap = byId<HTMLDivElement>('video-wrap');
  const player = byId<HTMLVideoElement>('player');
  const youtubeWrap = byId<HTMLDivElement>('youtube-wrap');
  videoWrap.hidden = true;
  player.pause();
  player.removeAttribute('src');
  clearProjectionVideoUnlock(player);
  youtubeWrap.hidden = true;
  stopYoutubeProjection();
  bgImg.hidden = true;
}

function applyAction(action: LiveAction): void {
  const content = byId<HTMLDivElement>('conteudo');
  const bgImg = byId<HTMLImageElement>('bg-image');
  const videoWrap = byId<HTMLDivElement>('video-wrap');
  const player = byId<HTMLVideoElement>('player');
  const youtubeWrap = byId<HTMLDivElement>('youtube-wrap');

  switch (action.acao) {
    case 'background': {
      hideBackgroundMedia();
      bgImg.hidden = false;
      bgImg.src = resolveProjectionMediaUrl(action.valor);
      break;
    }
    case 'video': {
      hideBackgroundMedia();
      bgImg.hidden = true;
      videoWrap.hidden = false;
      player.src = resolveProjectionMediaUrl(action.valor);
      void playProjectionVideo(player);
      break;
    }
    case 'youtube': {
      hideBackgroundMedia();
      bgImg.hidden = true;
      youtubeWrap.hidden = false;
      void playYoutubeProjection(action.valor);
      break;
    }
    case 'texto': {
      content.textContent = decodeURIComponent(action.valor);
      break;
    }
    case 'viewMusica':
    case 'viewBiblia': {
      content.style.visibility = 'hidden';
      content.innerHTML = action.valor;
      break;
    }
    case 'removeConteudo': {
      content.innerHTML = '';
      break;
    }
    case 'atualizar': {
      location.reload();
      break;
    }
    case 'ajustarTela': {
      const layout = shouldApplyScreenLayout(action.valor);
      if (layout !== null) {
        applyScreenLayout(layout);
      }
      break;
    }
    case 'serviceTimer': {
      serviceTimerOverlay.applyValor(action.valor);
      return;
    }
    case 'footerAlert': {
      footerAlertOverlay.applyValor(action.valor);
      return;
    }
  }

  const badge = byId<HTMLElement>('last-action');
  updateLastActionBadge(
    badge,
    `${action.acao} @ ${new Date().toLocaleTimeString()}`,
  );
  syncProjectionContentState(
    byId<HTMLDivElement>('stage'),
    content,
  );
  typography.scheduleRefresh();
}

const projectionContrast = attachProjectionContrast({
  stage: byId<HTMLDivElement>('stage'),
  content: byId<HTMLDivElement>('conteudo'),
  bgImage: byId<HTMLImageElement>('bg-image'),
  video: byId<HTMLVideoElement>('player'),
});
void projectionContrast;

const typography = createProjectionTypographyController({
  rootEl: byId<HTMLDivElement>('conteudo'),
  role: 'projector',
  mode: 'output',
  diagnosticSurface: 'projector',
});

function connect(): WebSocket {
  const socket = new WebSocket(wsUrl());
  let handleWsMessage: (message: WsServerMessage) => void = () => {};

  socket.addEventListener('open', () => {
    const join: Record<string, string> = {
      type: 'join',
      role: 'projector',
      name: 'Projetor',
    };
    if (LOCAL_DEVICE_ID) {
      join.deviceId = LOCAL_DEVICE_ID;
    }
    socket.send(JSON.stringify(join));
  });

  handleWsMessage = attachProjectionTypographyWs(typography, (message) => {
    if (message.type === 'live-action') {
      applyAction((message as WsLiveBroadcastMessage).action);
    }
    if (message.type === 'joined') {
      const last = (message as WsJoinedMessage).state.lastAction;
      if (last) applyAction(last);
    }
    if (message.type === 'displays-config-updated') {
      void applyStoredScreenSize();
    }
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data as string) as WsServerMessage;
    handleWsMessage(message);
  });

  socket.addEventListener('close', () => {
    setTimeout(connect, 1500);
  });

  return socket;
}

connect();
window.addEventListener('resize', () => {
  reapplyCurrentScreenLayout();
});
window.addEventListener('load', () => {
  void refreshDisplayBoundsFromConfig().then(() => {
    if (currentScreenLayout) {
      reapplyCurrentScreenLayout();
    } else {
      void applyStoredScreenSize();
    }
  });
});
void registerRemoteDevice().then(() => applyStoredScreenSize());
void fetchProjectionTypographyPrefs().then((prefs) => typography.init(prefs));

export {};
