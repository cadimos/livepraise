<script setup lang="ts">
import { X } from '@lucide/vue';
import { useI18n } from 'vue-i18n';

const open = defineModel<boolean>('open', { default: false });

const props = defineProps<{
  title: string;
  wide?: boolean;
}>();

const { t } = useI18n();
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
    @click.self="open = false"
  >
    <div
      class="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-lp-surface bg-lp-background shadow-xl"
      :class="props.wide ? 'max-w-4xl' : 'max-w-2xl'"
    >
      <header class="flex items-center justify-between border-b border-lp-surface px-4 py-3">
        <h2 class="text-sm font-semibold text-lp-text">
          {{ title }}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-lp-muted hover:bg-lp-surface hover:text-lp-text"
          :aria-label="t('notepad.close')"
          @click="open = false"
        >
          <X
            class="h-4 w-4"
            aria-hidden="true"
          />
        </button>
      </header>
      <div class="min-h-0 flex-1 overflow-y-auto p-4">
        <slot />
      </div>
    </div>
  </div>
</template>
