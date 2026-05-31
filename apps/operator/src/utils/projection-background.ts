import { resolveProjectionMediaUrl } from '@shared/projection-media-url.js';
import type { LiveAction } from '@shared/types/live';

export function isProjectionBackgroundAction(
  action: LiveAction | null | undefined,
): boolean {
  return action?.acao === 'background' || action?.acao === 'video';
}

export function projectionBackgroundPreviewUrl(action: LiveAction): string {
  return resolveProjectionMediaUrl(action.valor);
}
