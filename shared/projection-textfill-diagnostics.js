import { APP_VERSION } from './app-version.js';
const STORAGE_KEY = 'livepraise.textfillDiagnosticsEnabled';
const FLUSH_MS = 1500;
const MAX_BUFFER = 12;
let buffer = [];
let flushTimer = null;
let flushInFlight = false;
export function isTextfillDiagnosticsEnabled() {
    if (typeof window === 'undefined')
        return false;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null)
            return true;
        return raw === '1' || raw === 'true';
    }
    catch {
        return true;
    }
}
export function setTextfillDiagnosticsEnabled(enabled) {
    if (typeof window === 'undefined')
        return;
    try {
        localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    }
    catch {
        /* ignore */
    }
}
function apiBase() {
    if (typeof window === 'undefined')
        return '';
    return window.location.origin;
}
async function flushBuffer() {
    if (flushInFlight || !buffer.length)
        return;
    flushInFlight = true;
    const batch = buffer.splice(0, buffer.length);
    try {
        const res = await fetch(`${apiBase()}/api/system/textfill-diagnostics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                entries: batch.map((entry) => ({
                    ...entry,
                    appVersion: APP_VERSION,
                    userAgent: navigator.userAgent,
                    location: window.location.href,
                })),
            }),
        });
        if (!res.ok) {
            buffer.unshift(...batch);
        }
    }
    catch {
        buffer.unshift(...batch);
        if (buffer.length > MAX_BUFFER * 4) {
            buffer = buffer.slice(-MAX_BUFFER * 2);
        }
    }
    finally {
        flushInFlight = false;
        if (buffer.length)
            scheduleFlush();
    }
}
function scheduleFlush() {
    if (flushTimer)
        return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushBuffer();
    }, FLUSH_MS);
}
export function logTextfillDiagnostic(payload) {
    if (typeof window === 'undefined' || !isTextfillDiagnosticsEnabled())
        return;
    buffer.push(payload);
    if (buffer.length >= MAX_BUFFER) {
        void flushBuffer();
        return;
    }
    scheduleFlush();
}
export function collectTextfillLayoutContext(contentEl, span, box) {
    const stage = document.getElementById('stage');
    const rodape = contentEl.querySelector('.rodape');
    const titulo = contentEl.querySelector('.titulo');
    return {
        box: {
            clientW: box.clientWidth,
            clientH: box.clientHeight,
            scrollW: span.scrollWidth,
            scrollH: span.scrollHeight,
        },
        root: {
            clientW: contentEl.clientWidth,
            clientH: contentEl.clientHeight,
        },
        stage: stage
            ? {
                clientW: stage.clientWidth,
                clientH: stage.clientHeight,
                dataScreen: document.body.dataset.screen,
            }
            : undefined,
        viewport: {
            innerW: window.innerWidth,
            innerH: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1,
        },
        rodapeH: rodape?.offsetHeight ?? 0,
        tituloH: titulo?.offsetHeight ?? 0,
        textSnippet: (span.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
    };
}
