/** Client retorno de palco — HTML+CSS+JS (CA-R10, CA-R20). */

import {
  attachDisplayDebugOverlayListener,
  updateLastActionBadge,
} from '/shared/display-debug-overlay.js';
import { createFooterAlertOverlay } from '/shared/footer-alert-overlay.js';
import { createServiceTimerOverlay } from '/shared/service-timer-overlay.js';
import {
  attachProjectionTypographyWs,
  createProjectionTypographyController,
  fetchProjectionTypographyPrefs,
} from '/shared/projection-typography-runtime.js';
import { wsLiveUrl } from '/shared/ws-live-url.js';

attachDisplayDebugOverlayListener();

type LiveActionName =
  | 'viewMusicaRetorno'
  | 'viewBibliaRetorno'
  | 'removeConteudo'
  | 'atualizar';

interface LiveAction {
  acao: LiveActionName | string;
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
  return wsLiveUrl();
}

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  return el as T;
}

function stageDisplayId(): number | null {
  const raw = new URLSearchParams(location.search).get('displayId');
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

const LOCAL_DISPLAY_ID = stageDisplayId();

const serviceTimerOverlay = createServiceTimerOverlay({
  kind: 'display',
  id: LOCAL_DISPLAY_ID !== null ? String(LOCAL_DISPLAY_ID) : '',
});

const footerAlertOverlay = createFooterAlertOverlay({
  kind: 'display',
  id: LOCAL_DISPLAY_ID !== null ? String(LOCAL_DISPLAY_ID) : '',
});

const typography = createProjectionTypographyController({
  rootEl: byId<HTMLElement>('conteudo'),
  role: 'stage-return',
  mode: 'output',
  shadowSelector: '.texto',
  textfillOptions: { allTexto: true },
});

function applyAction(action: LiveAction): void {
  const content = byId<HTMLElement>('conteudo');

  switch (action.acao) {
    case 'viewMusicaRetorno':
    case 'viewBibliaRetorno':
      content.style.visibility = 'hidden';
      content.innerHTML = action.valor;
      break;
    case 'removeConteudo':
      content.innerHTML = '';
      break;
    case 'atualizar':
      location.reload();
      break;
    case 'serviceTimer':
      serviceTimerOverlay.applyValor(action.valor);
      return;
    case 'footerAlert':
      footerAlertOverlay.applyValor(action.valor);
      return;
    default:
      return;
  }

  const badge = byId<HTMLElement>('last-action');
  updateLastActionBadge(
    badge,
    `${action.acao} @ ${new Date().toLocaleTimeString()}`,
  );
  typography.scheduleRefresh();
}

function connect(): WebSocket {
  const socket = new WebSocket(wsUrl());
  let handleWsMessage: (message: WsServerMessage) => void = () => {};

  socket.addEventListener('open', () => {
    socket.send(
      JSON.stringify({ type: 'join', role: 'stage-return', name: 'Retorno' }),
    );
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
void fetchProjectionTypographyPrefs().then((prefs) => typography.init(prefs));

export {};
