<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { mediaUrl, type QuickBackground } from '../composables/useApi';
import { useQuickBackgrounds } from '../composables/useQuickBackgrounds';
import { useLiveSocket } from '../composables/useLiveSocket';
import { projectQuickBackground } from '../utils/projection-actions';
import { PREVIEW_COLUMN_WIDTH } from '../constants/layout';

const emit = defineEmits<{
  previewBg: [url: string];
  /** Limpa HTML da prévia — fundo rápido substitui a tela inteira. */
  clearPreview: [];
}>();

const { t } = useI18n();
const { sendAction } = useLiveSocket();

const { quickBackgrounds, error, reload } = useQuickBackgrounds();

const visibleBackgrounds = computed(() => quickBackgrounds.value.slice(0, 5));

function resolveBackgroundUrl(item: QuickBackground): string {
  if (item.url.includes('base64')) return item.url;
  return mediaUrl(item.url);
}

function projectQuick(item: QuickBackground) {
  const url = resolveBackgroundUrl(item);
  emit('previewBg', url);
  emit('clearPreview');
  projectQuickBackground(sendAction, url);
}

onMounted(async () => {
  try {
    await reload();
    const initial = quickBackgrounds.value.find((b) => b.inicial === 'S');
    if (initial) {
      emit('previewBg', resolveBackgroundUrl(initial));
    }
  } catch {
    /* error ref preenchido em reload */
  }
});
</script>

<template>
  <section class="shrink-0" :style="{ width: PREVIEW_COLUMN_WIDTH }">
    <p class="mb-1.5 text-[10px] uppercase tracking-wider text-lp-muted">
      {{ t('backgrounds.quick') }}
    </p>
    <p v-if="error" class="mb-2 text-xs text-rose-300">{{ error }}</p>
    <div class="grid grid-cols-5 gap-2">
      <button
        v-for="(item, index) in visibleBackgrounds"
        :key="index"
        type="button"
        class="aspect-[4/3] w-full overflow-hidden rounded-md border border-lp-surface transition hover:border-lp-primary"
        @click="projectQuick(item)"
      >
        <img
          :src="resolveBackgroundUrl(item)"
          alt=""
          class="h-full w-full object-cover"
        />
      </button>
    </div>
  </section>
</template>
