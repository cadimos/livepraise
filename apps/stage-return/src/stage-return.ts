/** Client retorno de palco — HTML+CSS+JS (CA-R10, CA-R20). */

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
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws/live`;
}

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  return el as T;
}

function applyAction(action: LiveAction): void {
  const content = byId<HTMLElement>('conteudo');

  switch (action.acao) {
    case 'viewMusicaRetorno':
    case 'viewBibliaRetorno':
      content.innerHTML = action.valor;
      break;
    case 'removeConteudo':
      content.innerHTML = '';
      break;
    case 'atualizar':
      location.reload();
      break;
    default:
      return;
  }

  const badge = byId<HTMLElement>('last-action');
  badge.textContent = `${action.acao} @ ${new Date().toLocaleTimeString()}`;
}

function connect(): WebSocket {
  const socket = new WebSocket(wsUrl());

  socket.addEventListener('open', () => {
    socket.send(
      JSON.stringify({ type: 'join', role: 'stage-return', name: 'Retorno' }),
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

export {};
