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

const PROFILE = 'live';

attachDisplayDebugOverlayListener();

function wsUrl() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws/live`;
}

function ensureDeviceId() {
  return ensureEndpointDeviceId(PROFILE);
}

function stripChordsForProjection(text) {
  return text
    .split('\n')
    .filter((line) => !/^\s*[A-G][#b]?(\/|\s|$)/.test(line.trim()))
    .join('\n')
    .trim();
}

function stripChordsFromHtml(html) {
  return html.replace(
    /(<(?:div|span|p)[^>]*class="[^"]*(?:content|texto)[^"]*"[^>]*>)([\s\S]*?)(<\/(?:div|span|p)>)/gi,
    (_match, open, body, close) => {
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

function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  return el;
}

/** CA-R21: /live não exibe fundo; remove vídeo/imagem para voltar ao preto. */
function clearBackgroundMedia() {
  const bgImg = byId('bg-image');
  const videoWrap = byId('video-wrap');
  const player = byId('player');
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

const statusEl = () => byId('last-action');
let wsConnected = false;
let hasProjectionContent = false;

function refreshViewerStatus() {
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

async function registerDevice() {
  const res = await fetch(
    `/api/devices/${encodeURIComponent(deviceId)}?profile=${encodeURIComponent(PROFILE)}`,
  );
  if (!res.ok) throw new Error(`Registo dispositivo falhou (${res.status})`);
}

function applyAction(action) {
  const content = byId('conteudo');
  const bgImg = byId('bg-image');
  const videoWrap = byId('video-wrap');
  const player = byId('player');

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

function connect() {
  wsConnected = false;
  refreshViewerStatus();

  const socket = new WebSocket(wsUrl());
  let handleWsMessage = (message) => {
    if (message.type === 'joined') {
      wsConnected = true;
      refreshViewerStatus();
      if (message.state?.lastAction) {
        applyAction(message.state.lastAction);
      }
      return;
    }
    if (message.type === 'live-action') {
      applyAction(message.action);
    }
  };
  handleWsMessage = attachProjectionTypographyWs(typography, handleWsMessage);

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
    const message = JSON.parse(String(event.data));
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
void fetchProjectionTypographyPrefs().then((prefs) => typography.init(prefs));
connect();
