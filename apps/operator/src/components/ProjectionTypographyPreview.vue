<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import '@shared/projection-layout.css';
import {
  type ProjectionTypographyProfile,
  type ProjectionTypographyProfileKey,
} from '@shared/projection-typography';
import { useProjectionTypographyPreview } from '../composables/useProjectionTypographyPreview';

export type ProjectionPreviewSample = 'worship' | 'bible' | 'notes';

const props = defineProps<{
  profile: ProjectionTypographyProfile;
  profileKey: ProjectionTypographyProfileKey;
  sample: ProjectionPreviewSample;
}>();

const { t } = useI18n();

const contentRef = ref<HTMLElement | null>(null);
const frameRef = ref<HTMLElement | null>(null);
const previewReady = ref(false);
const loadedSample = ref<ProjectionPreviewSample | null>(null);

const profileRef = computed(() => props.profile);

const sampleHtml = computed(() => {
  switch (props.sample) {
    case 'bible':
      return `<div class="titulo">${t('settings.projectionTypography.preview.sample.bibleTitle')}</div><div class="content"><span>${t('settings.projectionTypography.preview.sample.bibleBody')}</span></div><div class="rodape"></div>`;
    case 'notes':
      return `<div class="titulo"></div><div class="content"><span>${t('settings.projectionTypography.preview.sample.notesBody')}</span></div><div class="rodape"></div>`;
    default:
      return `<div class="titulo"></div><div class="content"><span>${t('settings.projectionTypography.preview.sample.worshipBody').replace(/\n/g, '<br>')}</span></div><div class="rodape">${t('settings.projectionTypography.preview.sample.worshipFooter')}</div>`;
  }
});

const footnote = computed(() =>
  t('settings.projectionTypography.preview.footnote', {
    destination: t(`settings.projectionTypography.profiles.${props.profileKey}`),
  }),
);

const typographySignature = computed(() =>
  JSON.stringify({
    profile: props.profile,
    sample: props.sample,
    sampleHtml: sampleHtml.value,
  }),
);

const layoutSignature = computed(() =>
  JSON.stringify({
    sample: props.sample,
    sampleHtml: sampleHtml.value,
    fontWeight: props.profile.fontWeight,
    fontStyle: props.profile.fontStyle,
    minFontPx: props.profile.minFontPx,
    maxFontPx: props.profile.maxFontPx,
    textfillEnabled: props.profile.textfillEnabled,
    fontSource: props.profile.fontSource,
    fontFamily: props.profile.fontFamily,
  }),
);

const { fontFaceStyleRef } = useProjectionTypographyPreview({
  rootRef: contentRef,
  frameRef,
  profile: profileRef,
  diagnosticSurface: computed(
    () => `operator-preview:settings-${props.profileKey}`,
  ),
  previewReady,
  layoutSignature,
  prepareContent: () => {
    const root = contentRef.value;
    if (!root) return false;
    if (loadedSample.value === props.sample && root.querySelector('.content')) {
      return;
    }
    root.innerHTML = sampleHtml.value;
    loadedSample.value = props.sample;
  },
  watchSource: typographySignature,
});
</script>

<template>
  <div class="lg:sticky lg:top-0">
    <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-lp-muted">
      {{ t('settings.projectionTypography.preview.title') }}
    </h3>
    <slot name="sample-selector" />
    <div
      ref="frameRef"
      class="projection-preview-frame relative aspect-video w-full min-h-[140px] overflow-hidden rounded-xl border border-lp-surface bg-black shadow-inner sm:min-h-[160px] lg:min-h-[180px]"
    >
      <div
        class="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-950 to-indigo-950"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/10 via-black/40 to-black/70"
        aria-hidden="true"
      />
      <style ref="fontFaceStyleRef" />
      <div
        ref="contentRef"
        class="conteudo absolute inset-0 z-[2] text-slate-50 transition-opacity duration-75"
        :class="previewReady ? 'opacity-100' : 'opacity-0'"
        aria-live="polite"
      />
    </div>
    <p class="mt-2 text-xs text-lp-muted">
      {{ footnote }}
    </p>
  </div>
</template>
