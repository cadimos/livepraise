import { sanitizeApprovalHtml } from '../approval-queue/sanitize.js';
import type { LiveAction, LiveActionName } from '../../shared/types/live.js';

const HTML_ACTIONS = new Set<LiveActionName>([
  'viewMusica',
  'viewBiblia',
  'viewMusicaRetorno',
  'viewBibliaRetorno',
]);

const MEDIA_ACTIONS = new Set<LiveActionName>(['background', 'video']);

/** Paths servidos por express.static em server/index.ts */
const ALLOWED_MEDIA_PATH = /^\/(imagens|videos)\/[^?#]+$/;

function decodeMediaPath(valor: string): string | null {
  try {
    return decodeURIComponent(valor);
  } catch {
    const trimmed = valor.trim();
    return trimmed.startsWith('/') ? trimmed : null;
  }
}

/** A6 — rejeita URLs arbitrárias; aceita só /imagens e /videos (path relativo seguro). */
export function isAllowedProjectionMediaPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed || !trimmed.startsWith('/')) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('://') ||
    lower.startsWith('//') ||
    lower.startsWith('javascript:') ||
    lower.startsWith('data:')
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
export function sanitizeLiveAction(action: LiveAction): LiveAction | null {
  if (HTML_ACTIONS.has(action.acao)) {
    return { acao: action.acao, valor: sanitizeApprovalHtml(action.valor) };
  }
  if (MEDIA_ACTIONS.has(action.acao)) {
    const safe = sanitizeProjectionMediaValor(action.valor);
    if (!safe) return null;
    return { acao: action.acao, valor: safe };
  }
  return action;
}
