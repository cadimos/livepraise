import {
  attachProjectionContrast,
  syncProjectionContentState,
} from '/shared/projection-contrast.js';
import {
  attachDisplayDebugOverlayListener,
  updateLastActionBadge,
} from '/shared/display-debug-overlay.js';
import { resolveProjectionMediaUrl } from '/shared/projection-media-url.js';
import { playProjectionVideo } from '/shared/projection-video-player.js';
import { createFooterAlertOverlay } from '/shared/footer-alert-overlay.js';
import { ensureEndpointDeviceId } from '/shared/endpoint-device-id.js';
import { createServiceTimerOverlay } from '/shared/service-timer-overlay.js';
import { clearViewerStatus, setViewerStatus } from '/shared/viewer-status.js';
import {
  attachProjectionTypographyWs,
  createProjectionTypographyController,
  fetchProjectionTypographyPrefs,
} from '/shared/projection-typography-runtime.js';
import type { ProjectionTypographyPrefs } from '/shared/projection-typography.js';

type ExternalProfile = 'vocal' | 'stage' | 'player';

interface LiveAction {
  acao: string;
  valor: string;
}

type LiveWsMessage = {
  type?: string;
  action?: LiveAction;
  state?: { lastAction?: LiveAction | null };
  projectionTypography?: unknown;
};

interface DeviceRegisterResponse {
  device?: { showChords?: boolean };
}

const PROFILES = new Set<string>(['vocal', 'stage', 'player']);

attachDisplayDebugOverlayListener();

function wsUrl(): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws/live`;
}

function detectProfile(): ExternalProfile {
  const segment = location.pathname.replace(/\/+$/, '').split('/').pop() ?? '';
  if (PROFILES.has(segment)) return segment as ExternalProfile;
  const fromQuery = new URLSearchParams(location.search).get('profile');
  return PROFILES.has(fromQuery ?? '') ? (fromQuery as ExternalProfile) : 'vocal';
}

function ensureDeviceId(profile: ExternalProfile): string {
  return ensureEndpointDeviceId(profile);
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

const profile = detectProfile();
const deviceId = ensureDeviceId(profile);
document.body.dataset.profile = profile;

const usesStageReturnLayout = profile === 'stage' || profile === 'vocal';

const typography = createProjectionTypographyController({
  rootEl: byId('conteudo'),
  role: 'external-display',
  externalProfile: profile,
  mode: 'output',
  textfillOptions: usesStageReturnLayout ? { allTexto: true } : undefined,
  shadowSelector: usesStageReturnLayout ? '.texto-fill, .texto, .content' : '.content',
});

const serviceTimerOverlay = createServiceTimerOverlay({
  kind: 'external',
  id: deviceId,
});

const footerAlertOverlay = createFooterAlertOverlay({
  kind: 'external',
  id: deviceId,
});

const statusEl = (): HTMLElement => byId('last-action');
let wsConnected = false;
let hasProjectionContent = false;

let showChords = profile !== 'vocal';

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
    `/api/devices/${encodeURIComponent(deviceId)}?profile=${encodeURIComponent(profile)}`,
  );
  if (!res.ok) throw new Error(`Registo dispositivo falhou (${res.status})`);
  const data = (await res.json()) as DeviceRegisterResponse;
  if (profile === 'vocal') {
    showChords = false;
  } else if (data.device?.showChords !== undefined) {
    showChords = Boolean(data.device.showChords);
  }
}

function filterHtml(html: string): string {
  if (profile === 'vocal' || !showChords) {
    return stripChordsFromHtml(html);
  }
  return html;
}

function applyAction(action: LiveAction): void {
  const content = byId('conteudo');
  const bgImg = byId<HTMLImageElement>('bg-image');
  const videoWrap = byId<HTMLElement>('video-wrap');
  const player = byId<HTMLVideoElement>('player');

  switch (action.acao) {
    case 'background':
      if (profile === 'vocal') return;
      videoWrap.hidden = true;
      player.pause();
      bgImg.hidden = false;
      bgImg.src = resolveProjectionMediaUrl(action.valor);
      break;
    case 'video':
      if (profile === 'vocal') return;
      bgImg.hidden = true;
      videoWrap.hidden = false;
      player.src = resolveProjectionMediaUrl(action.valor);
      void playProjectionVideo(player);
      break;
    case 'texto':
      content.textContent = decodeURIComponent(action.valor);
      break;
    case 'viewMusica':
    case 'viewBiblia':
      if (usesStageReturnLayout) return;
      content.style.visibility = 'hidden';
      content.innerHTML = filterHtml(action.valor);
      break;
    case 'viewMusicaRetorno':
    case 'viewBibliaRetorno':
      if (!usesStageReturnLayout) return;
      content.style.visibility = 'hidden';
      content.innerHTML = filterHtml(action.valor);
      break;
    case 'removeConteudo':
      content.innerHTML = '';
      hasProjectionContent = false;
      break;
    case 'atualizar':
      location.reload();
      break;
    case 'ajustarTela':
      if (profile !== 'player') break;
      document.body.dataset.screen = action.valor;
      break;
    case 'serviceTimer':
      serviceTimerOverlay.applyValor(action.valor);
      return;
    case 'footerAlert':
      footerAlertOverlay.applyValor(action.valor);
      return;
    default:
      break;
  }

  if (
    action.acao === 'viewMusica' ||
    action.acao === 'viewBiblia' ||
    action.acao === 'viewMusicaRetorno' ||
    action.acao === 'viewBibliaRetorno' ||
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
  syncProjectionContentState(byId('stage'), content);
  typography.scheduleRefresh();
  refreshViewerStatus();
}

attachProjectionContrast({
  stage: byId('stage'),
  content: byId('conteudo'),
  bgImage: byId('bg-image'),
  video: byId('player'),
});

function connect(): void {
  wsConnected = false;
  refreshViewerStatus();

  const socket = new WebSocket(wsUrl());
  let handleWsMessage = (message: LiveWsMessage): void => {
    if (message.type === 'joined') {
      wsConnected = true;
      refreshViewerStatus();
      if (message.state?.lastAction) {
        applyAction(message.state.lastAction);
      }
      return;
    }
    if (message.type === 'live-action' && message.action) {
      applyAction(message.action);
    }
  };
  handleWsMessage = attachProjectionTypographyWs(
    typography,
    handleWsMessage as Parameters<typeof attachProjectionTypographyWs>[1],
  ) as typeof handleWsMessage;

  socket.addEventListener('open', () => {
    socket.send(
      JSON.stringify({
        type: 'join',
        role: 'external-display',
        name: profile,
        deviceId,
        profile,
        showChords,
      }),
    );
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data)) as LiveWsMessage;
    handleWsMessage(message);
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
