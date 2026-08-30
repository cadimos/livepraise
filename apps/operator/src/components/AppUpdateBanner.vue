<script setup lang="ts">
import { computed } from 'vue';
import { Download } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useAppUpdater } from '../composables/useAppUpdater';

const { t } = useI18n();
const { status, visible, percent, version, installing, dismiss, installNow } =
  useAppUpdater();

const message = computed(() => {
  const current = status.value;
  switch (current.kind) {
    case 'checking':
      return t('status.update.checking');
    case 'available':
      return t('status.update.available', { version: current.version });
    case 'downloading':
      return t('status.update.downloading', {
        version: current.version,
        percent: percent.value ?? 0,
      });
    case 'ready':
      return t('status.update.ready', { version: current.version });
    case 'installing':
      return t('status.update.installing', { version: current.version });
    case 'error':
      return t('status.update.error', { message: current.message });
    default:
      return '';
  }
});

const showProgress = computed(
  () => status.value.kind === 'downloading' || status.value.kind === 'installing',
);

const barWidth = computed(() => {
  if (status.value.kind === 'installing') return 100;
  return percent.value ?? 0;
});

const canDismiss = computed(() => {
  const kind = status.value.kind;
  return kind === 'checking' || kind === 'available' || kind === 'error';
});
</script>

<template>
  <div
    v-if="visible"
    class="border-b px-4 py-2 text-sm"
    :class="
      status.kind === 'error'
        ? 'border-rose-500/40 bg-rose-950/50 text-rose-100'
        : status.kind === 'ready' || status.kind === 'installing'
          ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-100'
          : 'border-sky-500/40 bg-sky-950/50 text-sky-100'
    "
    role="status"
    aria-live="polite"
  >
    <div class="flex flex-wrap items-center gap-3">
      <Download
        class="h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      <p class="min-w-0 flex-1">
        {{ message }}
      </p>
      <button
        v-if="status.kind === 'ready'"
        type="button"
        class="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
        :disabled="installing"
        @click="installNow"
      >
        {{ t('status.update.installNow') }}
      </button>
      <button
        v-if="canDismiss"
        type="button"
        class="rounded px-2 py-1 text-xs opacity-80 hover:bg-black/20 hover:opacity-100"
        @click="dismiss"
      >
        {{ t('status.update.dismiss') }}
      </button>
    </div>
    <div
      v-if="showProgress"
      class="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30"
    >
      <div
        class="h-full rounded-full bg-current transition-[width] duration-200"
        :class="percent == null && status.kind === 'downloading' ? 'w-1/3 animate-pulse' : ''"
        :style="
          percent != null || status.kind === 'installing'
            ? { width: `${barWidth}%` }
            : undefined
        "
      />
    </div>
  </div>
</template>
