import { attachProjectionContrast, syncProjectionContentState, } from './projection-contrast.js';
import { attachDisplayDebugOverlayListener, updateLastActionBadge, } from '/shared/display-debug-overlay.js';
import { resolveProjectionMediaUrl } from '/shared/projection-media-url.js';
import { clearProjectionVideoUnlock, playProjectionVideo } from '/shared/projection-video-player.js';
import { playYoutubeProjection, stopYoutubeProjection } from './youtube-iframe-player.js';
import { createFooterAlertOverlay } from '/shared/footer-alert-overlay.js';
import { parseAjustarTelaPayload, buildAjustarTelaValor, normalizeContentFit } from '/shared/screen-layout.js';
import { ensureEndpointDeviceId } from '/shared/endpoint-device-id.js';
import { createServiceTimerOverlay } from '/shared/service-timer-overlay.js';
import { attachProjectionTypographyWs, createProjectionTypographyController, fetchProjectionTypographyPrefs, } from '/shared/projection-typography-runtime.js';
attachDisplayDebugOverlayListener();
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
const LOCAL_DEVICE_ID = LOCAL_DISPLAY_ID === null ? ensureEndpointDeviceId('projection') : null;
async function registerRemoteDevice() {
    if (!LOCAL_DEVICE_ID)
        return;
    try {
        await fetch(`${location.origin}/api/devices/${encodeURIComponent(LOCAL_DEVICE_ID)}?profile=projection`);
    }
    catch {
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
function shouldApplyScreenLayout(valor) {
    const parsed = parseAjustarTelaPayload(valor);
    if (parsed.deviceId !== null) {
        if (LOCAL_DEVICE_ID === null || parsed.deviceId !== LOCAL_DEVICE_ID) {
            return null;
        }
        return parsed;
    }
    if (parsed.displayId !== null &&
        LOCAL_DISPLAY_ID !== null &&
        parsed.displayId !== LOCAL_DISPLAY_ID) {
        return null;
    }
    if (parsed.displayId !== null && LOCAL_DISPLAY_ID === null && LOCAL_DEVICE_ID !== null) {
        return null;
    }
    return parsed;
}
function applyScreenPosition(position, offsetX, offsetY) {
    const align = position === 'topo' || position === 'personalizado' ? position : 'centro';
    document.body.dataset.screenAlign = align;
    const stage = byId('stage');
    if (align === 'personalizado') {
        stage.style.marginLeft = `${Math.max(0, offsetX)}px`;
        stage.style.marginTop = `${Math.max(0, offsetY)}px`;
    }
    else {
        stage.style.marginLeft = '';
        stage.style.marginTop = '';
    }
}
function applyContentFit(contentFit) {
    document.body.dataset.contentFit = normalizeContentFit(contentFit);
}
async function applyStoredScreenSize() {
    if (LOCAL_DISPLAY_ID !== null) {
        try {
            const res = await fetch(`${location.origin}/displays/config`);
            if (!res.ok)
                return;
            const data = (await res.json());
            const assignment = data.config?.assignments?.find((a) => a.displayId === LOCAL_DISPLAY_ID);
            const screen = assignment?.screenSize;
            if (!screen)
                return;
            applyScreenSize(buildAjustarTelaValor(screen.preset, screen.largura, screen.altura));
            applyScreenPosition(screen.position ?? 'centro', Number.parseInt(screen.offsetX ?? '0', 10) || 0, Number.parseInt(screen.offsetY ?? '0', 10) || 0);
            applyContentFit(screen.contentFit ?? 'estender');
        }
        catch {
            /* ignore */
        }
        return;
    }
    if (LOCAL_DEVICE_ID === null)
        return;
    try {
        const res = await fetch(`${location.origin}/api/devices/${encodeURIComponent(LOCAL_DEVICE_ID)}`);
        if (!res.ok)
            return;
        const data = (await res.json());
        const screen = data.device?.screenSize;
        if (!screen)
            return;
        applyScreenSize(buildAjustarTelaValor(screen.preset, screen.largura, screen.altura));
        applyScreenPosition(screen.position ?? 'centro', Number.parseInt(screen.offsetX ?? '0', 10) || 0, Number.parseInt(screen.offsetY ?? '0', 10) || 0);
        applyContentFit(screen.contentFit ?? 'estender');
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
function hideBackgroundMedia() {
    const bgImg = byId('bg-image');
    const videoWrap = byId('video-wrap');
    const player = byId('player');
    const youtubeWrap = byId('youtube-wrap');
    videoWrap.hidden = true;
    player.pause();
    player.removeAttribute('src');
    clearProjectionVideoUnlock(player);
    youtubeWrap.hidden = true;
    stopYoutubeProjection();
    bgImg.hidden = true;
}
function applyAction(action) {
    const content = byId('conteudo');
    const bgImg = byId('bg-image');
    const videoWrap = byId('video-wrap');
    const player = byId('player');
    const youtubeWrap = byId('youtube-wrap');
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
    const badge = byId('last-action');
    updateLastActionBadge(badge, `${action.acao} @ ${new Date().toLocaleTimeString()}`);
    syncProjectionContentState(byId('stage'), content);
    typography.scheduleRefresh();
}
const projectionContrast = attachProjectionContrast({
    stage: byId('stage'),
    content: byId('conteudo'),
    bgImage: byId('bg-image'),
    video: byId('player'),
});
void projectionContrast;
const typography = createProjectionTypographyController({
    rootEl: byId('conteudo'),
    role: 'projector',
    mode: 'output',
});
function connect() {
    const socket = new WebSocket(wsUrl());
    let handleWsMessage = () => { };
    socket.addEventListener('open', () => {
        const join = {
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
            applyAction(message.action);
        }
        if (message.type === 'joined') {
            const last = message.state.lastAction;
            if (last)
                applyAction(last);
        }
    });
    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
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
