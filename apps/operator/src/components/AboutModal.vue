<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue';
import { X } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { APP_VERSION } from '@shared/app-version';

const open = defineModel<boolean>('open', { default: false });

const { t, tm } = useI18n();

type LivepraiseBridge = {
  version?: string;
  runtime?: {
    node?: string;
    chrome?: string;
    electron?: string;
  };
};

const bridge = (window as Window & { livepraise?: LivepraiseBridge }).livepraise;

const stackItems = computed(() => {
  const items = tm('about.stackItems');
  return Array.isArray(items) ? items : [];
});

const runtime = computed(() => ({
  node: bridge?.runtime?.node ?? '—',
  chrome: bridge?.runtime?.chrome ?? '—',
  electron: bridge?.runtime?.electron ?? '—',
}));

const appVersion = computed(() => bridge?.version ?? APP_VERSION);

let escHandler: ((event: KeyboardEvent) => void) | null = null;

function close(): void {
  open.value = false;
}

function bindEsc(): void {
  unbindEsc();
  escHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };
  window.addEventListener('keydown', escHandler);
}

function unbindEsc(): void {
  if (!escHandler) return;
  window.removeEventListener('keydown', escHandler);
  escHandler = null;
}

watch(open, (isOpen) => {
  if (isOpen) bindEsc();
  else unbindEsc();
});

onUnmounted(unbindEsc);
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="'about-title'"
    @click.self="close"
  >
    <div
      class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-lp-surface bg-lp-background shadow-xl"
    >
      <header class="flex items-center justify-between border-b border-lp-surface px-4 py-3">
        <h2 id="about-title" class="text-sm font-semibold text-lp-text">
          {{ t('about.title') }}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-lp-muted hover:bg-lp-surface hover:text-lp-text"
          :aria-label="t('about.close')"
          @click="close"
        >
          <X class="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-sm text-lp-text">
        <section>
          <h3 class="mb-1 font-semibold">{{ t('about.whatIsTitle') }}</h3>
          <p class="text-lp-muted">{{ t('about.whatIsBody') }}</p>
        </section>

        <section>
          <h3 class="mb-1 font-semibold">{{ t('about.licenseTitle') }}</h3>
          <p class="mb-1 text-lp-muted">{{ t('about.licenseBody') }}</p>
          <p class="text-xs text-lp-muted">{{ t('about.licenseDisclaimer') }}</p>
        </section>

        <section>
          <h3 class="mb-1 font-semibold">{{ t('about.stackTitle') }}</h3>
          <ul class="list-disc space-y-1 pl-5 text-lp-muted">
            <li v-for="(item, index) in stackItems" :key="index">{{ item }}</li>
          </ul>
          <p class="mt-2 text-xs text-lp-muted">
            {{
              t('about.runtime', {
                node: runtime.node,
                chromium: runtime.chrome,
                electron: runtime.electron,
              })
            }}
          </p>
        </section>

        <p class="text-xs text-lp-muted">
          {{ t('about.version', { version: appVersion }) }}
        </p>
      </div>

      <footer class="flex justify-end border-t border-lp-surface px-4 py-3">
        <button
          type="button"
          class="rounded-lg bg-lp-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          @click="close"
        >
          {{ t('about.close') }}
        </button>
      </footer>
    </div>
  </div>
</template>
