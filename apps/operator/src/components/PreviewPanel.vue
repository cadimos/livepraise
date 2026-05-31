<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import '@shared/projection-layout.css';
import type { FooterAlertState } from '@shared/footer-alert';

const { t } = useI18n();

const props = defineProps<{
  contentHtml: string;
  backgroundUrl: string;
  footerAlertPreview?: FooterAlertState | null;
}>();

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

watch(
  () => props.contentHtml,
  (html) => {
    if (contentRef.value) {
      contentRef.value.innerHTML = html;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div
    class="projection-preview-frame relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-lp-surface bg-black shadow-inner"
  >
    <img
      v-if="backgroundUrl"
      :src="backgroundUrl"
      alt=""
      class="absolute inset-0 h-full w-full object-fill"
    />
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
    <p
      class="absolute bottom-2 right-3 z-10 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-slate-100"
      :class="footerAlertPreview?.active ? 'bottom-10' : ''"
    >
      {{ t('preview.local') }}
    </p>
  </div>
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
