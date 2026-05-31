const STORAGE_KEY = 'livepraise.externalDeviceId';
const PROFILE = 'live';

function wsUrl() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws/live`;
}

function ensureDeviceId() {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
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

const deviceId = ensureDeviceId();
document.body.dataset.profile = PROFILE;

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
      return;
    case 'video': {
      bgImg.hidden = true;
      videoWrap.hidden = false;
      player.src = decodeURIComponent(action.valor);
      void player.play();
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
      break;
    case 'atualizar':
      location.reload();
      break;
    case 'ajustarTela':
      document.body.dataset.screen = action.valor;
      break;
    default:
      break;
  }

  byId('last-action').textContent = `${action.acao} @ ${new Date().toLocaleTimeString()}`;
}

function connect() {
  const socket = new WebSocket(wsUrl());

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
    if (message.type === 'live-action') {
      applyAction(message.action);
    }
    if (message.type === 'joined' && message.state?.lastAction) {
      applyAction(message.state.lastAction);
    }
  });

  socket.addEventListener('close', () => {
    setTimeout(connect, 1500);
  });
}

registerDevice()
  .then(connect)
  .catch((err) => {
    console.error(err);
    byId('last-action').textContent = 'Erro ao registar dispositivo';
    setTimeout(connect, 3000);
  });
