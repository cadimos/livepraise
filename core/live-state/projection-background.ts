import type { LiveAction } from '../../shared/types/live.js';

const PROJECTION_BACKGROUND_ACTIONS = new Set<LiveAction['acao']>([
  'background',
  'video',
]);

export function isPersistedProjectionBackgroundAction(
  action: LiveAction | null | undefined,
): boolean {
  return !!action && PROJECTION_BACKGROUND_ACTIONS.has(action.acao);
}
