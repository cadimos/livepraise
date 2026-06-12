import { attachProjectionContrast, syncProjectionContentState, } from './projection-contrast.js';
import { attachDisplayDebugOverlayListener, updateLastActionBadge, } from '/shared/display-debug-overlay.js';
import { resolveProjectionMediaUrl } from '/shared/projection-media-url.js';
import { clearProjectionVideoUnlock, playProjectionVideo } from '/shared/projection-video-player.js';
import { playYoutubeProjection, stopYoutubeProjection } from './youtube-iframe-player.js';
import { createFooterAlertOverlay } from '/shared/footer-alert-overlay.js';
import { parseAjustarTelaPayload, buildAjustarTelaValor, normalizeContentFit, matchesAjustarTelaTarget, resolveProjectionStageSize } from '/shared/screen-layout.js';
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
function readViewportFromUrl() {
    const params = new URLSearchParams(location.search);
    const w = Number.parseInt(params.get('vw') ?? '', 10);
    const h = Number.parseInt(params.get('vh') ?? '', 10);
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0)
        return null;
    return { w, h };
}
let displayBounds = readViewportFromUrl();
let currentScreenLayout = null;
function readClientViewport() {
    const w = document.documentElement.clientWidth || window.innerWidth || 0;
    const h = document.documentElement.clientHeight || window.innerHeight || 0;
    return {
        w: Math.max(1, Math.round(w)),
        h: Math.max(1, Math.round(h)),
    };
}
/** Viewport lógico para letterbox — prioriza bounds do monitor (Electron). */
function projectionViewport() {
    if (displayBounds) {
        return { w: displayBounds.w, h: displayBounds.h };
    }
    return readClientViewport();
}
async function refreshDisplayBoundsFromConfig() {
    if (LOCAL_DISPLAY_ID === null)
        return;
    try {
        const res = await fetch(`${location.origin}/displays/config`);
        if (!res.ok)
            return;
        const data = (await res.json());
        const assignment = data.config?.assignments?.find((a) => a.displayId === LOCAL_DISPLAY_ID);
        if (assignment?.bounds?.width && assignment.bounds.height) {
            displayBounds = {
                w: assignment.bounds.width,
                h: assignment.bounds.height,
            };
        }
    }
    catch {
        /* ignore */
    }
}
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
    if (!matchesAjustarTelaTarget(parsed, LOCAL_DISPLAY_ID, LOCAL_DEVICE_ID)) {
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
    await refreshDisplayBoundsFromConfig();
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
            applyScreenLayout({
                displayId: LOCAL_DISPLAY_ID,
                deviceId: null,
                size: buildAjustarTelaValor(screen.preset, screen.largura, screen.altura),
                position: screen.position ?? 'centro',
                offsetX: Number.parseInt(screen.offsetX ?? '0', 10) || 0,
                offsetY: Number.parseInt(screen.offsetY ?? '0', 10) || 0,
                contentFit: normalizeContentFit(screen.contentFit ?? 'estender'),
            });
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
        applyScreenLayout({
            displayId: null,
            deviceId: LOCAL_DEVICE_ID,
            size: buildAjustarTelaValor(screen.preset, screen.largura, screen.altura),
            position: screen.position ?? 'centro',
            offsetX: Number.parseInt(screen.offsetX ?? '0', 10) || 0,
            offsetY: Number.parseInt(screen.offsetY ?? '0', 10) || 0,
            contentFit: normalizeContentFit(screen.contentFit ?? 'estender'),
        });
    }
    catch {
        /* ignore */
    }
}
function applyScreenLayout(layout) {
    currentScreenLayout = layout;
    applyScreenSize(layout.size);
    applyScreenPosition(layout.position, layout.offsetX, layout.offsetY);
    applyContentFit(layout.contentFit);
}
function reapplyCurrentScreenLayout() {
    if (currentScreenLayout) {
        applyScreenSize(currentScreenLayout.size);
    }
}
/** Paridade v0.0.8 `projetor.js` — ajusta área útil da projeção. */
function applyScreenSize(valor) {
    const stage = byId('stage');
    const targets = [stage, byId('bg-layer'), byId('conteudo')];
    const viewport = projectionViewport();
    const resolved = resolveProjectionStageSize(valor, viewport.w, viewport.h);
    const setSize = (width, height) => {
        for (const el of targets) {
            el.style.width = `${width}px`;
            el.style.height = `${height}px`;
            el.style.maxWidth = `${width}px`;
            el.style.maxHeight = `${height}px`;
            el.style.minWidth = `${width}px`;
            el.style.minHeight = `${height}px`;
            el.style.flex = '0 0 auto';
        }
    };
    const resetFullScreen = () => {
        for (const el of targets) {
            el.style.width = '100%';
            el.style.height = '100%';
            el.style.maxWidth = '';
            el.style.maxHeight = '';
            el.style.minWidth = '';
            el.style.minHeight = '';
            el.style.flex = '';
        }
    };
    if (resolved.fullScreen && (!valor || valor === 'padrao')) {
        resetFullScreen();
        document.body.dataset.screen = valor || 'padrao';
        return;
    }
    setSize(resolved.width, resolved.height);
    document.body.dataset.screen = valor || 'padrao';
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
                applyScreenLayout(layout);
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
    diagnosticSurface: 'projector',
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
        if (message.type === 'displays-config-updated') {
            void applyStoredScreenSize();
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
window.addEventListener('resize', () => {
    reapplyCurrentScreenLayout();
});
window.addEventListener('load', () => {
    void refreshDisplayBoundsFromConfig().then(() => {
        if (currentScreenLayout) {
            reapplyCurrentScreenLayout();
        }
        else {
            void applyStoredScreenSize();
        }
    });
});
void registerRemoteDevice().then(() => applyStoredScreenSize());
void fetchProjectionTypographyPrefs().then((prefs) => typography.init(prefs));
