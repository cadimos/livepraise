<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';
import { onMounted, onUnmounted, ref } from 'vue';

defineProps<{
  label: string;
}>();

const open = ref(false);
const root = ref<HTMLElement | null>(null);

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function onDocumentClick(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) {
    close();
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick));
onUnmounted(() => document.removeEventListener('click', onDocumentClick));
</script>

<template>
  <div
    ref="root"
    class="relative"
  >
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition hover:bg-white/15"
      :aria-expanded="open"
      @click.stop="toggle"
    >
      {{ label }}
      <ChevronDown
        class="h-4 w-4 opacity-80"
        aria-hidden="true"
      />
    </button>
    <ul
      v-show="open"
      class="absolute right-0 z-50 mt-1 min-w-[12rem] rounded-md border border-lp-surface bg-lp-background py-1 text-sm text-lp-text shadow-lg"
      role="menu"
    >
      <slot :close="close" />
    </ul>
  </div>
</template>
