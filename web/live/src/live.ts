import {
  attachDisplayDebugOverlayListener,
  updateLastActionBadge,
} from '/shared/display-debug-overlay.js';
import { resolveProjectionMediaUrl } from '/shared/projection-media-url.js';
import { playProjectionVideo } from '/shared/projection-video-player.js';
import { clearViewerStatus, setViewerStatus } from '/shared/viewer-status.js';
import { ensureEndpointDeviceId } from '/shared/endpoint-device-id.js';
import {
  attachProjectionTypographyWs,
  createProjectionTypographyController,
  fetchProjectionTypographyPrefs,
} from '/shared/projection-typography-runtime.js';
import type { ProjectionTypographyPrefs } from '/shared/projection-typography.js';
import type {
  LiveAction,
  WsJoinedMessage,
  WsLiveBroadcastMessage,
  WsServerMessage,
} from '@shared/types/live';

const PROFILE = 'live';

attachDisplayDebugOverlayListener();

function wsUrl(): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws/live`;
}

function ensureDeviceId(): string {
  return ensureEndpointDeviceId(PROFILE);
}

function stripChordsForProjection(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*[A-G][#b]?(\/|\s|$)/.test(line.trim()))
    .join('\n')
    .trim();
}

function stripChordsFromHtml(html: string): string {
  return html.replace(
    /(<(?:div|span|p)[^>]*class="[^"]*(?:content|texto)[^"]*"[^>]*>)([\s\S]*?)(<\/(?:div|span|p)>)/gi,
    (_match, open: string, body: string, close: string) => {
      const stripped = stripChordsForProjection(
        body.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''),
      );
      const escaped = stripped
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br />');
      return `${open}${escaped}${close}`;
    },
  );
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  return el as T;
}

/** CA-R21: /live não exibe fundo; remove vídeo/imagem para voltar ao preto. */
function clearBackgroundMedia(): void {
  const bgImg = byId<HTMLImageElement>('bg-image');
  const videoWrap = byId<HTMLElement>('video-wrap');
  const player = byId<HTMLVideoElement>('player');
  videoWrap.hidden = true;
  player.pause();
  player.removeAttribute('src');
  player.load();
  bgImg.hidden = true;
  bgImg.removeAttribute('src');
}

const deviceId = ensureDeviceId();
document.body.dataset.profile = PROFILE;

const typography = createProjectionTypographyController({
  rootEl: byId('conteudo'),
  role: 'external-display',
  externalProfile: PROFILE,
  mode: 'output',
});

const statusEl = (): HTMLElement => byId('last-action');
let wsConnected = false;
let hasProjectionContent = false;

function refreshViewerStatus(): void {
  if (document.body.dataset.displayDebug === 'true') {
    return;
  }
  if (hasProjectionContent) {
    clearViewerStatus(statusEl());
    return;
  }
  if (!wsConnected) {
    setViewerStatus(statusEl(), 'Reconectando…');
    return;
  }
  setViewerStatus(
    statusEl(),
    hasProjectionContent
      ? 'Ligado'
      : 'Ligado — aguardando projeção do operador…',
  );
}

async function registerDevice(): Promise<void> {
  const res = await fetch(
    `/api/devices/${encodeURIComponent(deviceId)}?profile=${encodeURIComponent(PROFILE)}`,
  );
  if (!res.ok) throw new Error(`Registo dispositivo falhou (${res.status})`);
}

function applyAction(action: LiveAction): void {
  const content = byId('conteudo');
  const bgImg = byId<HTMLImageElement>('bg-image');
  const videoWrap = byId<HTMLElement>('video-wrap');
  const player = byId<HTMLVideoElement>('player');

  switch (action.acao) {
    case 'background':
    case 'limparFundo':
      clearBackgroundMedia();
      break;
    case 'video': {
      bgImg.hidden = true;
      videoWrap.hidden = false;
      player.src = resolveProjectionMediaUrl(action.valor);
      void playProjectionVideo(player);
      break;
    }
    case 'texto':
      content.textContent = decodeURIComponent(action.valor);
      break;
    case 'viewMusica':
    case 'viewBiblia':
      content.style.visibility = 'hidden';
      content.innerHTML = stripChordsFromHtml(action.valor);
      break;
    case 'removeConteudo':
      content.innerHTML = '';
      hasProjectionContent = false;
      break;
    case 'atualizar':
      location.reload();
      break;
    case 'ajustarTela':
      /* /live ocupa viewport inteira — ajuste de tela é só do projetor */
      break;
    default:
      break;
  }

  if (
    action.acao === 'viewMusica' ||
    action.acao === 'viewBiblia' ||
    action.acao === 'texto'
  ) {
    hasProjectionContent = Boolean(
      content.textContent?.trim() || content.innerHTML.trim(),
    );
  }

  updateLastActionBadge(
    statusEl(),
    `${action.acao} @ ${new Date().toLocaleTimeString()}`,
  );
  typography.scheduleRefresh();
  refreshViewerStatus();
}

function parseWsMessage(raw: string): WsServerMessage {
  return JSON.parse(raw) as WsServerMessage;
}

function connect(): void {
  wsConnected = false;
  refreshViewerStatus();

  const socket = new WebSocket(wsUrl());
  const handleLiveMessage = (message: WsServerMessage): void => {
    if (message.type === 'joined') {
      const joined = message as WsJoinedMessage;
      wsConnected = true;
      refreshViewerStatus();
      if (joined.state.lastAction) {
        applyAction(joined.state.lastAction);
      }
      return;
    }
    if (message.type === 'live-action') {
      const live = message as WsLiveBroadcastMessage;
      applyAction(live.action);
    }
  };

  const handleWsMessage = attachProjectionTypographyWs(typography, (message) => {
    handleLiveMessage(message as WsServerMessage);
  });

  socket.addEventListener('open', () => {
    socket.send(
      JSON.stringify({
        type: 'join',
        role: 'external-display',
        name: PROFILE,
        deviceId,
        profile: PROFILE,
        showChords: false,
      }),
    );
  });

  socket.addEventListener('message', (event) => {
    handleWsMessage(parseWsMessage(String(event.data)) as Parameters<typeof handleWsMessage>[0]);
  });

  socket.addEventListener('close', () => {
    wsConnected = false;
    refreshViewerStatus();
    setTimeout(connect, 1500);
  });

  socket.addEventListener('error', () => {
    socket.close();
  });
}

setViewerStatus(statusEl(), 'A ligar…');
void registerDevice().catch((err) => {
  console.warn('Registo dispositivo:', err);
});
void fetchProjectionTypographyPrefs().then((prefs: ProjectionTypographyPrefs | null) =>
  typography.init(prefs),
);
connect();
