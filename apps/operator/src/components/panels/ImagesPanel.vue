<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchJson, mediaUrl } from '../../composables/useApi';
import { usePreferences } from '../../composables/usePreferences';
import { useLiveSocket } from '../../composables/useLiveSocket';
import MediaTileContextMenu from '../MediaTileContextMenu.vue';
import { projectTabImageBackground } from '../../utils/projection-actions';

const emit = defineEmits<{
  previewBg: [url: string];
}>();

const { t } = useI18n();
const { prefs, setImageCategory, setImageSearchQuery } = usePreferences();
const { sendAction } = useLiveSocket();

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
    <div v-if="error" class="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
      {{ error }}
    </div>

    <label class="text-xs uppercase tracking-wider text-lp-muted">{{ t('images.category') }}</label>
    <select
      :value="prefs.imageCategory"
      class="rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text"
      @change="loadImages(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="cat in imageCategories" :key="cat" :value="cat">
        {{ cat }}
      </option>
    </select>

    <label class="text-xs uppercase tracking-wider text-lp-muted">{{ t('common.search') }}</label>
    <input
      v-model="searchQuery"
      type="search"
      class="rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text placeholder:text-lp-muted"
      :placeholder="t('common.searchPlaceholder')"
    />

    <ul class="grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
      <li v-for="img in filteredImages" :key="img">
        <MediaTileContextMenu
          :media-path="img"
          media-kind="imagens"
          :categories="imageCategories"
          @preview-bg="emit('previewBg', $event)"
          @refresh="reloadCurrentCategory"
        >
          <button
            type="button"
            class="aspect-video w-full overflow-hidden rounded-lg border border-lp-surface transition hover:border-lp-primary"
            @click="projectBackground(mediaUrl(img))"
          >
            <img :src="mediaUrl(img)" alt="" class="h-full w-full object-cover" />
          </button>
        </MediaTileContextMenu>
      </li>
    </ul>
  </div>
</template>
