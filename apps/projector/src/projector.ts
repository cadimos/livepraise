import {
  attachProjectionContrast,
  syncProjectionContentState,
} from './projection-contrast.js';
import {
  attachDisplayDebugOverlayListener,
  updateLastActionBadge,
} from '/shared/display-debug-overlay.js';
import { resolveProjectionMediaUrl } from '/shared/projection-media-url.js';
import { clearProjectionVideoUnlock, playProjectionVideo } from '/shared/projection-video-player.js';
import { playYoutubeProjection, stopYoutubeProjection } from './youtube-iframe-player.js';
import { createFooterAlertOverlay } from '/shared/footer-alert-overlay.js';
import { parseAjustarTelaPayload, buildAjustarTelaValor, normalizeContentFit } from '/shared/screen-layout.js';
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
  if (parsed.deviceId !== null) {
    if (LOCAL_DEVICE_ID === null || parsed.deviceId !== LOCAL_DEVICE_ID) {
      return null;
    }
    return parsed;
  }
  if (
    parsed.displayId !== null &&
    LOCAL_DISPLAY_ID !== null &&
    parsed.displayId !== LOCAL_DISPLAY_ID
  ) {
    return null;
  }
  if (parsed.displayId !== null && LOCAL_DISPLAY_ID === null && LOCAL_DEVICE_ID !== null) {
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
      applyScreenSize(buildAjustarTelaValor(screen.preset, screen.largura, screen.altura));
      applyScreenPosition(screen.position ?? 'centro', Number.parseInt(screen.offsetX ?? '0', 10) || 0, Number.parseInt(screen.offsetY ?? '0', 10) || 0);
      applyContentFit(screen.contentFit ?? 'estender');
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
    applyScreenSize(buildAjustarTelaValor(screen.preset, screen.largura, screen.altura));
    applyScreenPosition(screen.position ?? 'centro', Number.parseInt(screen.offsetX ?? '0', 10) || 0, Number.parseInt(screen.offsetY ?? '0', 10) || 0);
    applyContentFit(screen.contentFit ?? 'estender');
  } catch {
    /* ignore */
  }
}

/** Paridade v0.0.8 `projetor.js` — ajusta área útil da projeção. */
function applyScreenSize(valor: string): void {
  const stage = byId<HTMLDivElement>('stage');
  const targets = [stage, byId<HTMLDivElement>('bg-layer'), byId<HTMLDivElement>('conteudo')];

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  const setSize = (width: number, height: number): void => {
    for (const el of targets) {
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
    }
  };

  const resetFullScreen = (): void => {
    for (const el of targets) {
      el.style.width = '100%';
      el.style.height = '100%';
    }
  };

  if (!valor || valor === 'padrao') {
    resetFullScreen();
    document.body.dataset.screen = valor || 'padrao';
    return;
  }

  const xIdx = valor.indexOf('x');
  if (xIdx >= 0) {
    const w = Number.parseInt(valor.slice(0, xIdx), 10);
    const h = Number.parseInt(valor.slice(xIdx + 1), 10);
    if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
      setSize(w, h);
      document.body.dataset.screen = valor;
      return;
    }
  }

  if (valor.includes(':')) {
    const [numW, numH] = valor.split(':').map((part) => Number.parseInt(part, 10));
    if (Number.isFinite(numW) && numW > 0 && Number.isFinite(numH) && numH > 0) {
      let heightPx = (screenWidth * numH) / numW;
      if (heightPx > screenHeight) {
        heightPx = (screenHeight * numH) / numW;
      }
      setSize(screenWidth, Math.round(heightPx));
      document.body.dataset.screen = valor;
      return;
    }
  }

  const fixedHeight = Number.parseInt(valor, 10);
  if (Number.isFinite(fixedHeight) && fixedHeight > 0) {
    setSize(screenWidth, fixedHeight);
    document.body.dataset.screen = valor;
    return;
  }

  resetFullScreen();
  document.body.dataset.screen = valor;
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
        applyScreenSize(layout.size);
        applyScreenPosition(layout.position, layout.offsetX, layout.offsetY);
        applyContentFit(layout.contentFit);
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
void registerRemoteDevice().then(() => applyStoredScreenSize());
void fetchProjectionTypographyPrefs().then((prefs) => typography.init(prefs));

export {};
