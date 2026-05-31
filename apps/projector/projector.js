import { attachProjectionContrast, syncProjectionContentState, } from './projection-contrast.js';
function wsUrl() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}/ws/live`;
}
function byId(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`Elemento #${id} não encontrado`);
    return el;
}
function projectorDisplayId() {
    const raw = new URLSearchParams(location.search).get('displayId');
    if (!raw)
        return null;
    const id = Number.parseInt(raw, 10);
    return Number.isFinite(id) ? id : null;
}
const LOCAL_DISPLAY_ID = projectorDisplayId();
function parseAjustarTelaPayload(valor) {
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
function shouldApplyScreenSize(valor) {
    const { displayId, size } = parseAjustarTelaPayload(valor);
    if (displayId !== null && LOCAL_DISPLAY_ID !== null && displayId !== LOCAL_DISPLAY_ID) {
        return null;
    }
    return size;
}
async function applyStoredScreenSize() {
    if (LOCAL_DISPLAY_ID === null)
        return;
    try {
        const res = await fetch(`${location.origin}/displays/config`);
        if (!res.ok)
            return;
        const data = (await res.json());
        const assignment = data.config?.assignments?.find((a) => a.displayId === LOCAL_DISPLAY_ID);
        const screen = assignment?.screenSize;
        if (!screen)
            return;
        const valor = screen.preset === 'personalizado'
            ? `${screen.largura.trim() || '0'}x${screen.altura.trim() || '0'}`
            : screen.preset;
        applyScreenSize(valor);
    }
    catch {
        /* ignore */
    }
}
/** Paridade v0.0.8 `projetor.js` — ajusta área útil da projeção. */
function applyScreenSize(valor) {
    const stage = byId('stage');
    const targets = [stage, byId('bg-layer'), byId('conteudo')];
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const setSize = (width, height) => {
        for (const el of targets) {
            el.style.width = `${width}px`;
            el.style.height = `${height}px`;
        }
    };
    const resetFullScreen = () => {
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
function applyAction(action) {
    const content = byId('conteudo');
    const bgImg = byId('bg-image');
    const videoWrap = byId('video-wrap');
    const player = byId('player');
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
            if (size !== null)
                applyScreenSize(size);
            break;
        }
    }
    const badge = byId('last-action');
    badge.textContent = `${action.acao} @ ${new Date().toLocaleTimeString()}`;
    syncProjectionContentState(byId('stage'), content);
}
const projectionContrast = attachProjectionContrast({
    stage: byId('stage'),
    content: byId('conteudo'),
    bgImage: byId('bg-image'),
    video: byId('player'),
});
void projectionContrast;
function connect() {
    const socket = new WebSocket(wsUrl());
    socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'join', role: 'projector', name: 'Projetor' }));
    });
    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'live-action') {
            applyAction(message.action);
        }
        if (message.type === 'joined') {
            const last = message.state.lastAction;
            if (last)
                applyAction(last);
        }
    });
    socket.addEventListener('close', () => {
        setTimeout(connect, 1500);
    });
    return socket;
}
connect();
void applyStoredScreenSize();
