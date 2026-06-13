import { onMounted, onUnmounted, reactive, readonly, ref, watch } from 'vue';
import { effectiveDeliveryAction } from '@shared/live-delivery';
import {
  applyLiveActionToPreviewFrame,
  decodePreviewMediaValor,
  EMPTY_OUTPUT_PREVIEW_FRAME,
  type OutputPreviewFrame,
} from '@shared/output-preview';
import { resolveProjectionMediaUrl } from '@shared/projection-media-url';
import { videoThumbRelativePath } from '@shared/queue-items';
import { youtubeEmbedUrl, youtubeThumbnailUrl } from '@shared/youtube';
import type { LiveAction, LiveState } from '@shared/types/live';
import type { PreviewGroupDescriptor } from '../types/preview-groups';
import { subscribeLiveSocket } from './useLiveSocket';

const frames = reactive<Record<string, OutputPreviewFrame>>({});

function ensureFrame(id: string): OutputPreviewFrame {
  if (!frames[id]) {
    frames[id] = { ...EMPTY_OUTPUT_PREVIEW_FRAME };
  }
  return frames[id];
}

function applyForGroup(
  group: PreviewGroupDescriptor,
  action: LiveAction,
): void {
  const effective = effectiveDeliveryAction(
    group.deliveryRole,
    action,
    group.deliveryProfile,
  );
  if (!effective) return;
  frames[group.id] = applyLiveActionToPreviewFrame(ensureFrame(group.id), effective);
}

function hydrateFromState(
  groups: PreviewGroupDescriptor[],
  state: LiveState,
  options: { reset?: boolean } = {},
): void {
  if (options.reset) {
    for (const key of Object.keys(frames)) {
      delete frames[key];
    }
  }

  if (state.lastAction) {
    for (const group of groups) {
      if (!options.reset && frames[group.id]) continue;
      applyForGroup(group, state.lastAction);
    }
  }
  if (state.lastStageAction) {
    for (const group of groups) {
      if (
        group.deliveryRole !== 'stage-return' &&
        group.deliveryProfile !== 'stage' &&
        group.deliveryProfile !== 'vocal'
      ) {
        continue;
      }
      if (!options.reset && frames[group.id]) continue;
      applyForGroup(group, state.lastStageAction);
    }
  }
}

function resolveBackgroundUrl(frame: OutputPreviewFrame): string {
  if (!frame.backgroundMedia) return '';
  if (frame.backgroundKind === 'youtube') {
    return youtubeEmbedUrl(frame.backgroundMedia, { origin: location.origin });
  }
  return resolveProjectionMediaUrl(frame.backgroundMedia);
}

export interface ResolvedOutputPreview {
  contentHtml: string;
  backgroundUrl: string;
  videoUrl: string;
  youtubeEmbedUrl: string;
  empty: boolean;
}

function resolveVideoPreviewThumbUrl(frame: OutputPreviewFrame): string {
  const mediaPath = decodePreviewMediaValor(frame.backgroundMedia).replace(/^\//, '');
  if (!mediaPath) return '';
  const thumbRel = videoThumbRelativePath(mediaPath);
  if (!thumbRel) return '';
  return resolveProjectionMediaUrl(thumbRel);
}

export function resolveOutputPreviewFrame(
  frame: OutputPreviewFrame | undefined,
): ResolvedOutputPreview {
  if (!frame) {
    return {
      contentHtml: '',
      backgroundUrl: '',
      videoUrl: '',
      youtubeEmbedUrl: '',
      empty: true,
    };
  }
  const backgroundUrl =
    frame.backgroundKind === 'image'
      ? resolveBackgroundUrl(frame)
      : frame.backgroundKind === 'video'
        ? resolveVideoPreviewThumbUrl(frame)
        : frame.backgroundKind === 'youtube' && frame.backgroundMedia.trim()
          ? youtubeThumbnailUrl(frame.backgroundMedia.trim())
          : '';
  const videoUrl = '';
  const youtubeEmbedUrl = '';
  const empty =
    !frame.contentHtml.trim() &&
    !backgroundUrl &&
    !videoUrl &&
    !youtubeEmbedUrl;
  return {
    contentHtml: frame.contentHtml,
    backgroundUrl,
    videoUrl,
    youtubeEmbedUrl,
    empty,
  };
}

/**
 * Estado ao vivo por grupo de prévia — filtragem alinhada ao hub (CAD-221 / CAD-226).
 */
export function useOutputPreviewState(getGroups: () => PreviewGroupDescriptor[]) {
  let unsubscribe: (() => void) | null = null;
  const lastHydratedState = ref<LiveState | null>(null);

  function onLiveMessage(message: {
    type: string;
    action?: LiveAction;
    state?: LiveState;
  }): void {
    const groups = getGroups();
    if (message.type === 'live-action' && message.action) {
      for (const group of groups) {
        applyForGroup(group, message.action);
      }
      return;
    }
    if (message.type === 'joined' && message.state) {
      lastHydratedState.value = message.state;
      hydrateFromState(groups, message.state, { reset: true });
      return;
    }
    if (message.type === 'state-sync' && message.state) {
      // Congelar/descongelar — não repor prévia (lastAction é só a última acção).
      lastHydratedState.value = message.state;
      return;
    }
  }

  onMounted(() => {
    unsubscribe = subscribeLiveSocket(onLiveMessage);
  });

  onUnmounted(() => {
    unsubscribe?.();
    unsubscribe = null;
  });

  watch(
    () => getGroups().map((g) => g.id).join(','),
    () => {
      if (lastHydratedState.value) {
        hydrateFromState(getGroups(), lastHydratedState.value, { reset: false });
      }
    },
  );

  function frameForGroup(id: string): OutputPreviewFrame | undefined {
    return frames[id];
  }

  return {
    frames: readonly(frames),
    frameForGroup,
    resolveOutputPreviewFrame,
  };
}
