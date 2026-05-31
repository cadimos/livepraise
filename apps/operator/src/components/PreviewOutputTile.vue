<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import '@shared/projection-layout.css';
import type { FooterAlertState } from '@shared/footer-alert';
import type { ProjectionTypographyProfileKey } from '@shared/projection-typography';
import { usePreferences } from '../composables/usePreferences';
import { useProjectionFonts } from '../composables/useProjectionFonts';
import {
  projectionTextShadowSlackPx,
  resolveProjectionTextShadowCss,
} from '@shared/projection-text-shadow';
import { refreshPreviewTextfill } from '@shared/projection-textfill';
import { applyProjectionTypographyStyles, bundledFontFileForProfile } from '@shared/projection-typography';
import { apiBase } from '../composables/useApi';

const { t } = useI18n();
const { prefs } = usePreferences();
const { bundledFamilyById, resolveCssFamily } = useProjectionFonts();

const props = withDefaults(
  defineProps<{
    label: string;
    profileKey: ProjectionTypographyProfileKey;
    contentHtml?: string;
    backgroundUrl?: string;
    videoUrl?: string;
    youtubeEmbedUrl?: string;
    footerAlertPreview?: FooterAlertState | null;
    empty?: boolean;
  }>(),
  {
    contentHtml: '',
    backgroundUrl: '',
    videoUrl: '',
    youtubeEmbedUrl: '',
    footerAlertPreview: null,
    empty: false,
  },
);

const profile = computed(() => prefs.value.projectionTypography[props.profileKey]);

const cssFamily = computed(() =>
  resolveCssFamily(profile.value.fontSource, profile.value.fontFamily),
);

const textShadowCss = computed(() =>
  resolveProjectionTextShadowCss(
    profile.value.textShadowLayers,
    profile.value.textShadowEnabled,
    profile.value.textShadowCssAdvanced,
  ),
);

const fitSlackPx = computed(() =>
  projectionTextShadowSlackPx(
    profile.value.textShadowLayers,
    profile.value.textShadowEnabled,
  ),
);

const fontFaceCss = computed(() => {
  if (profile.value.fontSource !== 'bundled') return '';
  const family = bundledFamilyById(profile.value.fontFamily);
  if (!family) return '';
  const fileName = bundledFontFileForProfile(
    family.files,
    profile.value.fontWeight,
    profile.value.fontStyle,
  );
  if (!fileName) return '';
  const url = `${apiBase()}/fonts/${encodeURIComponent(family.id)}/${encodeURIComponent(fileName)}`;
  return `@font-face{font-family:${family.cssFamily};src:url('${url}') format('woff2');font-weight:${profile.value.fontWeight};font-style:${profile.value.fontStyle};font-display:block;}`;
});

const marqueeStyle = computed(() => {
  const alert = props.footerAlertPreview;
  if (!alert?.active) return undefined;
  return {
    '--footer-alert-text-color': alert.textColor,
    '--footer-alert-bg': alert.backgroundColor,
    '--footer-alert-duration': `${alert.scrollDurationSec}s`,
    '--footer-alert-iterations': String(alert.repeatCount),
  } as Record<string, string>;
});

const contentRef = ref<HTMLElement | null>(null);
const frameRef = ref<HTMLElement | null>(null);
const fontFaceStyleRef = ref<HTMLStyleElement | null>(null);

let resizeObserver: ResizeObserver | null = null;
let refreshGeneration = 0;
let loadedContentHtml = '';
let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
let refreshDebounce: ReturnType<typeof setTimeout> | null = null;

function ensureContentMarkup(root: HTMLElement): void {
  if (loadedContentHtml === props.contentHtml && root.querySelector('.content')) {
    return;
  }
  root.innerHTML = props.contentHtml;
  loadedContentHtml = props.contentHtml;
}

async function applyTypography(remeasure = false): Promise<void> {
  const generation = ++refreshGeneration;
  await nextTick();
  const root = contentRef.value;
  if (!root || props.empty) return;

  ensureContentMarkup(root);

  if (!root.querySelector('.content span, .content, .texto')) {
    return;
  }

  applyProjectionTypographyStyles(root, {
    fontFamily: cssFamily.value,
    fontWeight: profile.value.fontWeight,
    fontStyle: profile.value.fontStyle,
    textShadowCss: textShadowCss.value,
  });

  await refreshPreviewTextfill(
    root,
    profile.value.minFontPx,
    profile.value.maxFontPx,
    profile.value.textfillEnabled,
    {
      fontFamily: cssFamily.value,
      fontWeight: profile.value.fontWeight,
      fontStyle: profile.value.fontStyle,
      fitSlackPx: fitSlackPx.value,
    },
  );

  if (generation !== refreshGeneration) return;
}

function scheduleApplyTypography(remeasure = false): void {
  if (refreshDebounce) clearTimeout(refreshDebounce);
  refreshDebounce = setTimeout(() => {
    void applyTypography(remeasure);
  }, 32);
}

const typographySignature = computed(() =>
  JSON.stringify({
    profile: profile.value,
    contentHtml: props.contentHtml,
    empty: props.empty,
    cssFamily: cssFamily.value,
    textShadowCss: textShadowCss.value,
    fontFaceCss: fontFaceCss.value,
    fitSlackPx: fitSlackPx.value,
  }),
);

watch(typographySignature, () => {
  scheduleApplyTypography(false);
});

watch(fontFaceCss, (css) => {
  if (fontFaceStyleRef.value) {
    fontFaceStyleRef.value.textContent = css;
  }
});

onMounted(() => {
  if (fontFaceStyleRef.value) {
    fontFaceStyleRef.value.textContent = fontFaceCss.value;
  }

  void applyTypography(false);

  if (!frameRef.value) return;
  resizeObserver = new ResizeObserver(() => {
    if (resizeDebounce) clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
      scheduleApplyTypography(true);
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
  <article class="flex w-full shrink-0 flex-col gap-1" :aria-label="label">
    <header class="flex min-h-[1.25rem] items-center gap-2">
      <h3 class="truncate text-xs font-medium text-lp-muted">
        {{ label }}
      </h3>
    </header>

    <div
      ref="frameRef"
      class="projection-preview-frame relative aspect-video w-full overflow-hidden rounded-xl border border-lp-surface bg-black shadow-inner"
    >
      <template v-if="empty">
        <div
          class="absolute inset-0 flex items-center justify-center bg-lp-surface/20 p-4 text-center text-sm text-lp-muted"
        >
          {{ t('preview.empty.waiting') }}
        </div>
      </template>
      <template v-else>
        <iframe
          v-if="youtubeEmbedUrl"
          :src="youtubeEmbedUrl"
          class="absolute inset-0 h-full w-full border-0"
          title="YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        />
        <video
          v-else-if="videoUrl"
          :src="videoUrl"
          class="absolute inset-0 h-full w-full object-fill"
          muted
          playsinline
        />
        <img
          v-else-if="backgroundUrl"
          :src="backgroundUrl"
          alt=""
          class="absolute inset-0 h-full w-full object-fill"
        />
        <style ref="fontFaceStyleRef" />
        <div
          ref="contentRef"
          class="conteudo absolute inset-0 z-[2] text-white"
          :class="{ 'footer-alert-active': footerAlertPreview?.active }"
        />
        <footer
          v-if="footerAlertPreview?.active && footerAlertPreview.text"
          class="footer-alert-preview"
          :style="marqueeStyle"
          aria-live="polite"
        >
          <div class="footer-alert-track">
            <span class="footer-alert-text">{{ footerAlertPreview.text }}</span>
          </div>
        </footer>
      </template>
    </div>
  </article>
</template>

<style scoped>
.conteudo .titulo {
  color: #cbd5e1;
}

.conteudo .rodape {
  color: #e2e8f0;
}

.footer-alert-preview {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  overflow: hidden;
  background: var(--footer-alert-bg, #000);
  color: var(--footer-alert-text-color, #fff);
  font-size: clamp(0.65rem, 2.2vw, 1rem);
  line-height: 1.2;
  pointer-events: none;
}

.footer-alert-track {
  display: flex;
  width: 100%;
  overflow: hidden;
  padding: 0.35rem 0;
}

.footer-alert-text {
  display: inline-block;
  white-space: nowrap;
  padding-left: 100%;
  color: var(--footer-alert-text-color, #fff);
  animation-name: footer-alert-marquee;
  animation-duration: var(--footer-alert-duration, 3s);
  animation-timing-function: linear;
  animation-iteration-count: var(--footer-alert-iterations, 3);
  animation-fill-mode: forwards;
}

@keyframes footer-alert-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .footer-alert-text {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
