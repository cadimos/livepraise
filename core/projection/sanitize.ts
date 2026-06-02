import { sanitizeApprovalHtml } from '../approval-queue/sanitize.js';
import {
  encodeFooterAlertState,
  parseFooterAlertState,
} from '../../shared/footer-alert.js';
import {
  encodeServiceTimerState,
  parseServiceTimerState,
} from '../../shared/service-timer.js';
import { isValidYouTubeVideoId } from '../../shared/youtube.js';
import type { LiveAction, LiveActionName } from '../../shared/types/live.js';

const HTML_ACTIONS = new Set<LiveActionName>([
  'viewMusica',
  'viewBiblia',
  'viewMusicaRetorno',
  'viewBibliaRetorno',
]);

const MEDIA_ACTIONS = new Set<LiveActionName>(['background', 'video']);
const YOUTUBE_ACTIONS = new Set<LiveActionName>(['youtube']);

/** Paths servidos por express.static em server/index.ts */
const ALLOWED_MEDIA_PATH = /^\/(imagens|videos)\/[^?#]+$/;
/** Legado `background_rapido` — imagens embutidas em SQLite (data URL). */
const MAX_LEGACY_DATA_IMAGE_LEN = 600_000;

function normalizeProjectionMediaPath(path: string): string {
  return path.trim().replaceAll('\\', '/');
}

function decodeMediaPath(valor: string): string | null {
  try {
    return normalizeProjectionMediaPath(decodeURIComponent(valor));
  } catch {
    const trimmed = normalizeProjectionMediaPath(valor);
    if (trimmed.startsWith('/') || trimmed.startsWith('data:')) return trimmed;
    return null;
  }
}

function isAllowedLegacyDataImageUrl(path: string): boolean {
  if (!path.startsWith('data:image/')) return false;
  if (!/^data:image\/(?:jpeg|jpg|png|gif|webp|bmp);base64,/i.test(path)) return false;
  return path.length <= MAX_LEGACY_DATA_IMAGE_LEN;
}

/** A6 — rejeita URLs arbitrárias; aceita /imagens, /videos ou data:image legado. */
export function isAllowedProjectionMediaPath(path: string): boolean {
  const trimmed = normalizeProjectionMediaPath(path);
  if (!trimmed) return false;

  if (trimmed.startsWith('data:')) {
    return isAllowedLegacyDataImageUrl(trimmed);
  }

  if (!trimmed.startsWith('/')) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('://') ||
    lower.startsWith('//') ||
    lower.startsWith('javascript:')
  ) {
    return false;
  }
  return ALLOWED_MEDIA_PATH.test(trimmed);
}

export function sanitizeProjectionMediaValor(valor: string): string | null {
  const path = decodeMediaPath(valor);
  if (!path || !isAllowedProjectionMediaPath(path)) return null;
  return encodeURIComponent(path);
}

/** A3 — HTML de projeção alinhado à fila de aprovação (M2). */
const NO_VALOR_ACTIONS = new Set<LiveActionName>(['limparFundo', 'removeConteudo']);

function sanitizeServiceTimerValor(valor: string): string | null {
  if (!valor.trim()) {
    return encodeServiceTimerState({
      version: 1,
      active: false,
      running: false,
      startedAt: null,
      accumulatedMs: 0,
      timerDurationMs: 30 * 60 * 1000,
      targets: [],
    });
  }
  try {
    const parsed = parseServiceTimerState(JSON.parse(valor));
    if (!parsed) return null;
    const encoded = encodeServiceTimerState(parsed);
    if (encoded.length > 16_384) return null;
    return encoded;
  } catch {
    return null;
  }
}

function sanitizeFooterAlertValor(valor: string): string | null {
  if (!valor.trim()) {
    return encodeFooterAlertState({
      version: 1,
      active: false,
      text: '',
      repeatCount: 3,
      textColor: '#ffffff',
      backgroundColor: '#000000',
      scrollDurationSec: 15,
      targets: [],
    });
  }
  try {
    const parsed = parseFooterAlertState(JSON.parse(valor));
    if (!parsed) return null;
    if (parsed.active && !parsed.text.trim()) return null;
    const encoded = encodeFooterAlertState(parsed);
    if (encoded.length > 8_192) return null;
    return encoded;
  } catch {
    return null;
  }
}

export function sanitizeLiveAction(action: LiveAction): LiveAction | null {
  if (action.acao === 'footerAlert') {
    const safe = sanitizeFooterAlertValor(action.valor);
    if (!safe) return null;
    return { acao: action.acao, valor: safe };
  }
  if (action.acao === 'serviceTimer') {
    const safe = sanitizeServiceTimerValor(action.valor);
    if (!safe) return null;
    return { acao: action.acao, valor: safe };
  }
  if (NO_VALOR_ACTIONS.has(action.acao)) {
    return { acao: action.acao, valor: '' };
  }
  if (HTML_ACTIONS.has(action.acao)) {
    return { acao: action.acao, valor: sanitizeApprovalHtml(action.valor) };
  }
  if (MEDIA_ACTIONS.has(action.acao)) {
    const safe = sanitizeProjectionMediaValor(action.valor);
    if (!safe) return null;
    return { acao: action.acao, valor: safe };
  }
  if (YOUTUBE_ACTIONS.has(action.acao)) {
    const id = action.valor.trim();
    if (!isValidYouTubeVideoId(id)) return null;
    return { acao: action.acao, valor: id };
  }
  return action;
}
