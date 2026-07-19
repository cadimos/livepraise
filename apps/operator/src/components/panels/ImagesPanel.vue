<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchJson, mediaUrl } from '../../composables/useApi';
import { usePreferences } from '../../composables/usePreferences';
import { useLiveSocket } from '../../composables/useLiveSocket';
import MediaTileContextMenu from '../MediaTileContextMenu.vue';
import { summarizeLabel } from '@shared/queue-items';
import { useQueueDrag } from '../../composables/useQueueDrag';
import { projectTabImageBackground } from '../../utils/projection-actions';

const emit = defineEmits<{
  previewBg: [url: string];
}>();

const { t } = useI18n();
const { prefs, setImageCategory, setImageSearchQuery } = usePreferences();
const { sendAction } = useLiveSocket();
const { onDragStart } = useQueueDrag();

function imageDragLabel(path: string): string {
  const parts = path.replaceAll('\\', '/').split('/');
  return summarizeLabel(parts[parts.length - 1] ?? path, 32);
}

const imageCategories = ref<string[]>([]);
const images = ref<string[]>([]);
const error = ref('');
const searchQuery = computed({
  get: () => prefs.value.imageSearchQuery,
  set: (value: string) => setImageSearchQuery(value),
});

const filteredImages = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return images.value;
  return images.value.filter((img) => img.toLowerCase().includes(q));
});

async function loadImageCategories() {
  try {
    const data = await fetchJson<{ status: string; imagens: string[] }>(
      '/imagem/categoria',
    );
    imageCategories.value = data.imagens ?? [];
    if (!prefs.value.imageCategory && imageCategories.value[0]) {
      setImageCategory(imageCategories.value[0]);
    }
    if (prefs.value.imageCategory) {
      await loadImages(prefs.value.imageCategory);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('images.errors.categories');
  }
}

function reloadCurrentCategory(): void {
  const cat = prefs.value.imageCategory;
  if (cat) void loadImages(cat);
}

async function loadImages(category: string) {
  setImageCategory(category);
  try {
    const data = await fetchJson<{ status: string; imagens: string[] }>(
      `/imagem/categoria/${encodeURIComponent(category)}`,
    );
    images.value = data.imagens ?? [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('images.errors.images');
  }
}

/** Abas de conteúdo: só troca o fundo, mantém texto na projeção (paridade `background()` legado). */
function projectBackground(url: string) {
  emit('previewBg', url);
  projectTabImageBackground(sendAction, url);
}

watch(
  () => prefs.value.imageCategory,
  (cat) => {
    if (cat) void loadImages(cat);
  },
);

onMounted(() => {
  void loadImageCategories();
});
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <div
      v-if="error"
      class="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
    >
      {{ error }}
    </div>

    <div class="lp-panel-field-row">
      <label
        class="lp-panel-label"
        for="images-category"
      >{{ t('images.category') }}</label>
      <select
        id="images-category"
        :value="prefs.imageCategory"
        class="rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text"
        @change="loadImages(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="cat in imageCategories"
          :key="cat"
          :value="cat"
        >
          {{ cat }}
        </option>
      </select>
    </div>

    <div class="lp-panel-field-row">
      <label
        class="lp-panel-label"
        for="images-search"
      >{{ t('common.search') }}</label>
      <input
        id="images-search"
        v-model="searchQuery"
        type="search"
        class="rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text placeholder:text-lp-muted"
        :placeholder="t('common.searchPlaceholder')"
      >
    </div>

    <ul class="grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
      <li
        v-for="img in filteredImages"
        :key="img"
      >
        <MediaTileContextMenu
          :media-path="img"
          media-kind="imagens"
          :categories="imageCategories"
          @preview-bg="emit('previewBg', $event)"
          @refresh="reloadCurrentCategory"
        >
          <button
            type="button"
            draggable="true"
            class="aspect-video w-full cursor-grab overflow-hidden rounded-lg border border-lp-surface transition hover:border-lp-primary active:cursor-grabbing"
            :title="t('tabs.dragHint')"
            @click="projectBackground(mediaUrl(img))"
            @dragstart="
              onDragStart($event, {
                kind: 'image',
                label: imageDragLabel(img),
                mediaPath: img,
              })
            "
          >
            <img
              :src="mediaUrl(img)"
              alt=""
              class="h-full w-full object-cover"
            >
          </button>
        </MediaTileContextMenu>
      </li>
    </ul>
  </div>
</template>
