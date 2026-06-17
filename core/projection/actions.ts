import {
  BASELINE_LIVE_ACTIONS,
  LIVE_ACTIONS,
  type LiveAction,
  type LiveActionName,
} from '../../shared/types/live.js';

export { LIVE_ACTIONS, BASELINE_LIVE_ACTIONS };

export function isLiveActionName(name: string): name is LiveActionName {
  return (LIVE_ACTIONS as readonly string[]).includes(name);
}

export function parseLiveAction(raw: unknown): LiveAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const { acao, valor } = raw as Record<string, unknown>;
  if (typeof acao !== 'string' || !isLiveActionName(acao)) return null;
  if (typeof valor !== 'string') return null;
  return { acao, valor };
}

/** Formato legado Socket.IO: JSON com valor em base64. */
export function encodeLegacyPayload(action: LiveAction): string {
  const valor = Buffer.from(action.valor, 'utf8').toString('base64');
  return JSON.stringify({ acao: action.acao, valor });
}

export function decodeLegacyPayload(raw: string): LiveAction | null {
  try {
    const parsed = JSON.parse(raw) as { acao?: string; valor?: string };
    if (!parsed.acao || !isLiveActionName(parsed.acao)) return null;
    if (typeof parsed.valor !== 'string') return null;
    const valor = Buffer.from(parsed.valor, 'base64').toString('utf8');
    return { acao: parsed.acao, valor };
  } catch {
    return null;
  }
}

/** Ações suportadas na baseline de projeção pública. */
export const BASELINE_ACTION_SET: readonly LiveActionName[] =
  BASELINE_LIVE_ACTIONS;
