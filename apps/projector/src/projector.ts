import {
  attachProjectionContrast,
  syncProjectionContentState,
} from './projection-contrast.js';

/** Tipos locais do client projetor (espelham shared/types/live.ts). */

type LiveActionName =
  | 'background'
  | 'texto'
  | 'video'
  | 'viewMusica'
  | 'viewBiblia'
  | 'removeConteudo'
  | 'atualizar'
  | 'ajustarTela';

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

function parseAjustarTelaPayload(valor: string): {
  displayId: number | null;
  size: string;
} {
  const pipe = valor.indexOf('|');
  if (pipe < 0) {
    return { displayId: null, size: valor };
  }
  const idPart = valor.slice(0, pipe);
  const size = valor.slice(pipe + 1);
  const displayId = Number.parseInt(idPart, 10);
  return {
    displayId: Number.isFinite(displayId) ? displayId : null,
    size,
  };
}

function shouldApplyScreenSize(valor: string): string | null {
  const { displayId, size } = parseAjustarTelaPayload(valor);
  if (displayId !== null && LOCAL_DISPLAY_ID !== null && displayId !== LOCAL_DISPLAY_ID) {
    return null;
  }
  return size;
}

async function applyStoredScreenSize(): Promise<void> {
  if (LOCAL_DISPLAY_ID === null) return;
  try {
    const res = await fetch(`${location.origin}/displays/config`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      config?: {
        assignments?: Array<{
          displayId: number;
          screenSize?: { preset: string; largura: string; altura: string };
        }>;
      };
    };
    const assignment = data.config?.assignments?.find(
      (a) => a.displayId === LOCAL_DISPLAY_ID,
    );
    const screen = assignment?.screenSize;
    if (!screen) return;
    const valor =
      screen.preset === 'personalizado'
        ? `${screen.largura.trim() || '0'}x${screen.altura.trim() || '0'}`
        : screen.preset;
    applyScreenSize(valor);
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

function applyAction(action: LiveAction): void {
  const content = byId<HTMLDivElement>('conteudo');
  const bgImg = byId<HTMLImageElement>('bg-image');
  const videoWrap = byId<HTMLDivElement>('video-wrap');
  const player = byId<HTMLVideoElement>('player');

  switch (action.acao) {
    case 'background': {
      videoWrap.hidden = true;
      player.pause();
      bgImg.hidden = false;
      bgImg.src = decodeURIComponent(action.valor);
      break;
    }
    case 'video': {
      bgImg.hidden = true;
      videoWrap.hidden = false;
      player.src = decodeURIComponent(action.valor);
      void player.play();
      break;
    }
    case 'texto': {
      content.textContent = decodeURIComponent(action.valor);
      break;
    }
    case 'viewMusica':
    case 'viewBiblia': {
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
      const size = shouldApplyScreenSize(action.valor);
      if (size !== null) applyScreenSize(size);
      break;
    }
  }

  const badge = byId<HTMLElement>('last-action');
  badge.textContent = `${action.acao} @ ${new Date().toLocaleTimeString()}`;
  syncProjectionContentState(
    byId<HTMLDivElement>('stage'),
    content,
  );
}

const projectionContrast = attachProjectionContrast({
  stage: byId<HTMLDivElement>('stage'),
  content: byId<HTMLDivElement>('conteudo'),
  bgImage: byId<HTMLImageElement>('bg-image'),
  video: byId<HTMLVideoElement>('player'),
});
void projectionContrast;

function connect(): WebSocket {
  const socket = new WebSocket(wsUrl());

  socket.addEventListener('open', () => {
    socket.send(
      JSON.stringify({ type: 'join', role: 'projector', name: 'Projetor' }),
    );
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data as string) as WsServerMessage;
    if (message.type === 'live-action') {
      applyAction((message as WsLiveBroadcastMessage).action);
    }
    if (message.type === 'joined') {
      const last = (message as WsJoinedMessage).state.lastAction;
      if (last) applyAction(last);
    }
  });

  socket.addEventListener('close', () => {
    setTimeout(connect, 1500);
  });

  return socket;
}

connect();
void applyStoredScreenSize();

export {};
