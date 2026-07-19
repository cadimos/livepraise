<script setup lang="ts">
import { ref } from 'vue';
import { X } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useLiveSocket } from '../composables/useLiveSocket';
import { buildMusicHtml } from '../utils/projection';

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  preview: [html: string];
}>();

const { t } = useI18n();
const { sendAction } = useLiveSocket();

const note = ref('');

function close(): void {
  open.value = false;
}

function project(): void {
  const text = note.value.trim();
  if (!text) return;
  const html = buildMusicHtml(text, '');
  emit('preview', html);
  sendAction('viewMusica', html);
  close();
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    role="dialog"
    aria-modal="true"
    :aria-label="t('notepad.title')"
    @click.self="close"
  >
    <div
      class="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-lp-surface bg-lp-background shadow-xl"
    >
      <header class="flex items-center justify-between border-b border-lp-surface px-4 py-3">
        <h2 class="text-sm font-semibold text-lp-text">
          {{ t('notepad.title') }}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-lp-muted hover:bg-lp-surface hover:text-lp-text"
          :aria-label="t('notepad.close')"
          @click="close"
        >
          <X
            class="h-4 w-4"
            aria-hidden="true"
          />
        </button>
      </header>

      <div class="min-h-0 flex-1 p-4">
        <textarea
          v-model="note"
          rows="12"
          class="w-full rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text"
          :placeholder="t('notepad.placeholder')"
        />
      </div>

      <footer class="flex justify-end gap-2 border-t border-lp-surface px-4 py-3">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm text-lp-muted hover:bg-lp-surface"
          @click="close"
        >
          {{ t('notepad.close') }}
        </button>
        <button
          type="button"
          class="rounded-lg bg-lp-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          @click="project"
        >
          {{ t('notepad.project') }}
        </button>
      </footer>
    </div>
  </div>
</template>
