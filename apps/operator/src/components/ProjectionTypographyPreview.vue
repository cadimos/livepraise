<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import '@shared/projection-layout.css';
import { refreshPreviewTextfill } from '@shared/projection-textfill';
import { resolveProjectionTextShadowCss, projectionTextShadowSlackPx } from '@shared/projection-text-shadow';
import {
  applyProjectionTypographyStyles,
  bundledFontFileForProfile,
  type ProjectionTypographyProfile,
  type ProjectionTypographyProfileKey,
} from '@shared/projection-typography';
import { apiBase } from '../composables/useApi';
import { useProjectionFonts } from '../composables/useProjectionFonts';

export type ProjectionPreviewSample = 'worship' | 'bible' | 'notes';

const props = defineProps<{
  profile: ProjectionTypographyProfile;
  profileKey: ProjectionTypographyProfileKey;
  sample: ProjectionPreviewSample;
}>();

const { t } = useI18n();
const { bundledFamilyById, resolveCssFamily } = useProjectionFonts();

const contentRef = ref<HTMLElement | null>(null);
const frameRef = ref<HTMLElement | null>(null);
const fontFaceStyleRef = ref<HTMLStyleElement | null>(null);
const previewReady = ref(false);
const loadedSample = ref<ProjectionPreviewSample | null>(null);

let resizeObserver: ResizeObserver | null = null;
let refreshGeneration = 0;
let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
let refreshDebounce: ReturnType<typeof setTimeout> | null = null;

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

const cssFamily = computed(() =>
  resolveCssFamily(props.profile.fontSource, props.profile.fontFamily),
);

const textShadowCss = computed(() =>
  resolveProjectionTextShadowCss(
    props.profile.textShadowLayers,
    props.profile.textShadowEnabled,
    props.profile.textShadowCssAdvanced,
  ),
);

const fontFaceCss = computed(() => {
  if (props.profile.fontSource !== 'bundled') return '';
  const family = bundledFamilyById(props.profile.fontFamily);
  if (!family) return '';
  const fileName = bundledFontFileForProfile(
    family.files,
    props.profile.fontWeight,
    props.profile.fontStyle,
  );
  if (!fileName) return '';
  const url = `${apiBase()}/fonts/${encodeURIComponent(family.id)}/${encodeURIComponent(fileName)}`;
  return `@font-face{font-family:${family.cssFamily};src:url('${url}') format('woff2');font-weight:${props.profile.fontWeight};font-style:${props.profile.fontStyle};font-display:block;}`;
});

const fitSlackPx = computed(() =>
  projectionTextShadowSlackPx(
    props.profile.textShadowLayers,
    props.profile.textShadowEnabled,
  ),
);

const footnote = computed(() =>
  t('settings.projectionTypography.preview.footnote', {
    destination: t(`settings.projectionTypography.profiles.${props.profileKey}`),
  }),
);

const typographySignature = computed(() =>
  JSON.stringify({
    profile: props.profile,
    sample: props.sample,
    cssFamily: cssFamily.value,
    textShadowCss: textShadowCss.value,
    fontFaceCss: fontFaceCss.value,
    sampleHtml: sampleHtml.value,
  }),
);

/** Mudanças que exigem recarga de fonte ou HTML — esconder tile até estabilizar. */
const layoutSignature = computed(() =>
  JSON.stringify({
    sample: props.sample,
    sampleHtml: sampleHtml.value,
    cssFamily: cssFamily.value,
    fontWeight: props.profile.fontWeight,
    fontStyle: props.profile.fontStyle,
    fontFaceCss: fontFaceCss.value,
    minFontPx: props.profile.minFontPx,
    maxFontPx: props.profile.maxFontPx,
    textfillEnabled: props.profile.textfillEnabled,
  }),
);

let lastLayoutSignature = '';

function applyTypographyStyles(root: HTMLElement): void {
  applyProjectionTypographyStyles(root, {
    fontFamily: cssFamily.value,
    fontWeight: props.profile.fontWeight,
    fontStyle: props.profile.fontStyle,
    textShadowCss: textShadowCss.value,
  });
}

function ensureSampleMarkup(root: HTMLElement): void {
  if (loadedSample.value === props.sample && root.querySelector('.content')) {
    return;
  }
  root.innerHTML = sampleHtml.value;
  loadedSample.value = props.sample;
}

async function refreshPreview(remeasure = false): Promise<void> {
  const generation = ++refreshGeneration;
  const layoutChanged = layoutSignature.value !== lastLayoutSignature;
  const needsTextfill = layoutChanged || remeasure;
  if (layoutChanged) {
    previewReady.value = false;
  }

  await nextTick();
  const root = contentRef.value;
  if (!root) return;

  ensureSampleMarkup(root);
  applyTypographyStyles(root);

  if (needsTextfill) {
    await refreshPreviewTextfill(
      root,
      props.profile.minFontPx,
      props.profile.maxFontPx,
      props.profile.textfillEnabled,
      {
        fontFamily: cssFamily.value,
        fontWeight: props.profile.fontWeight,
        fontStyle: props.profile.fontStyle,
        fitSlackPx: fitSlackPx.value,
      },
    );
    if (layoutChanged) {
      lastLayoutSignature = layoutSignature.value;
    }
  }

  if (generation !== refreshGeneration) return;
  previewReady.value = true;
}

function scheduleRefreshPreview(remeasure = false): void {
  if (refreshDebounce) clearTimeout(refreshDebounce);
  refreshDebounce = setTimeout(() => {
    void refreshPreview(remeasure);
  }, 32);
}

watch(
  typographySignature,
  () => {
    scheduleRefreshPreview();
  },
  { immediate: true },
);

watch(fontFaceCss, (css) => {
  if (fontFaceStyleRef.value) {
    fontFaceStyleRef.value.textContent = css;
  }
});

onMounted(() => {
  if (fontFaceStyleRef.value) {
    fontFaceStyleRef.value.textContent = fontFaceCss.value;
  }

  if (!frameRef.value) return;
  resizeObserver = new ResizeObserver(() => {
    if (resizeDebounce) clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
      scheduleRefreshPreview(true);
    }, 120);
  });
  resizeObserver.observe(frameRef.value);
});

onBeforeUnmount(() => {
  if (resizeDebounce) clearTimeout(resizeDebounce);
  if (refreshDebounce) clearTimeout(refreshDebounce);
  resizeObserver?.disconnect();
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
    <p class="mt-2 text-xs text-lp-muted">{{ footnote }}</p>
  </div>
</template>
