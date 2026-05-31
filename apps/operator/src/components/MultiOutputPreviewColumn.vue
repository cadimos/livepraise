<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { FooterAlertState } from '@shared/footer-alert';
import PreviewOutputTile from './PreviewOutputTile.vue';
import { useOutputPreviewState } from '../composables/useOutputPreviewState';
import { usePreviewGroups } from '../composables/usePreviewGroups';
import { profileKeyForPreviewKind } from '@shared/projection-typography-runtime.js';
import type { PreviewGroupDescriptor, PreviewGroupKind } from '../types/preview-groups';

const props = defineProps<{
  footerAlertPreview?: FooterAlertState | null;
}>();

const { t } = useI18n();
const { visibleGroups } = usePreviewGroups();
const { frameForGroup, resolveOutputPreviewFrame } = useOutputPreviewState(
  () => visibleGroups.value,
);

/** CA-5: overlays em projector, stage-return e perfis que recebem no hub. */
function groupShowsFooterAlert(kind: PreviewGroupKind): boolean {
  return kind === 'projection' || kind === 'stage-return' || kind === 'live' || kind === 'vocal';
}

function tileProps(group: PreviewGroupDescriptor) {
  const live = resolveOutputPreviewFrame(frameForGroup(group.id));
  const footerAlertPreview = groupShowsFooterAlert(group.kind)
    ? props.footerAlertPreview
    : null;

  return {
    profileKey: profileKeyForPreviewKind(group.kind),
    contentHtml: live.contentHtml,
    backgroundUrl: live.backgroundUrl,
    videoUrl: live.videoUrl,
    youtubeEmbedUrl: live.youtubeEmbedUrl,
    empty: live.empty,
    footerAlertPreview,
  };
}
</script>

<template>
  <div
    class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5"
    role="region"
    :aria-label="t('preview.columnAria')"
  >
    <PreviewOutputTile
      v-for="g in visibleGroups"
      :key="g.id"
      :label="t(g.labelKey)"
      v-bind="tileProps(g)"
    />
  </div>
</template>
