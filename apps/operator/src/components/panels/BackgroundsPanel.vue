<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import {
  fetchJson,
  mediaUrl,
  quickBackgroundDisplayUrl,
  quickBackgroundProjectionUrl,
  type QuickBackground,
} from '../../composables/useApi';
import { usePreferences } from '../../composables/usePreferences';
import { useLiveSocket, whenLiveSocketReady } from '../../composables/useLiveSocket';
import {
  projectQuickBackground,
  projectTabImageBackground,
} from '../../utils/projection-actions';
import {
  isProjectionBackgroundAction,
  projectionBackgroundPreviewUrl,
} from '../../utils/projection-background';

const emit = defineEmits<{
  previewBg: [url: string];
}>();

const { prefs, setImageCategory } = usePreferences();
const { sendAction, lastAction } = useLiveSocket();

const quickBackgrounds = ref<QuickBackground[]>([]);
const imageCategories = ref<string[]>([]);
const images = ref<string[]>([]);
const error = ref('');

async function loadQuickBackgrounds() {
  try {
    const data = await fetchJson<{ status: string; items: QuickBackground[] }>(
      '/background-rapido',
    );
    quickBackgrounds.value = data.items ?? [];
    whenLiveSocketReady(() => {
      const action = lastAction.value;
      if (isProjectionBackgroundAction(action)) {
        emit('previewBg', projectionBackgroundPreviewUrl(action));
        return;
      }
      const initial = quickBackgrounds.value.find((b) => b.inicial === 'S');
      if (initial) {
        emit('previewBg', quickBackgroundDisplayUrl(initial));
        projectQuickBackground(sendAction, quickBackgroundProjectionUrl(initial));
      }
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao carregar fundos rápidos';
  }
}

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
    error.value = e instanceof Error ? e.message : 'Erro ao carregar categorias de imagem';
  }
}

async function loadImages(category: string) {
  setImageCategory(category);
  try {
    const data = await fetchJson<{ status: string; imagens: string[] }>(
      `/imagem/categoria/${encodeURIComponent(category)}`,
    );
    images.value = data.imagens ?? [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao carregar imagens';
  }
}

function projectBackground(url: string) {
  emit('previewBg', url);
  projectTabImageBackground(sendAction, url);
}

function projectQuick(item: QuickBackground) {
  emit('previewBg', quickBackgroundDisplayUrl(item));
  projectQuickBackground(sendAction, quickBackgroundProjectionUrl(item));
}

watch(
  () => prefs.value.imageCategory,
  (cat) => {
    if (cat) void loadImages(cat);
  },
);

onMounted(() => {
  void loadQuickBackgrounds();
  void loadImageCategories();
});
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div
      v-if="error"
      class="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
    >
      {{ error }}
    </div>

    <section>
      <p class="mb-2 text-xs uppercase tracking-wider text-slate-500">
        Fundos rápidos
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="(item, index) in quickBackgrounds"
          :key="index"
          type="button"
          class="h-16 w-24 overflow-hidden rounded-lg border border-slate-700 transition hover:border-sky-500"
          @click="projectQuick(item)"
        >
          <img
            :src="quickBackgroundDisplayUrl(item)"
            alt=""
            class="h-full w-full object-cover"
          >
        </button>
      </div>
    </section>

    <section class="flex min-h-0 flex-1 flex-col">
      <label class="text-xs uppercase tracking-wider text-slate-500">Imagens</label>
      <select
        :value="prefs.imageCategory"
        class="mb-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
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
      <ul class="grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
        <li
          v-for="img in images"
          :key="img"
        >
          <button
            type="button"
            class="aspect-video w-full overflow-hidden rounded-lg border border-slate-800 transition hover:border-sky-500"
            @click="projectBackground(mediaUrl(img))"
          >
            <img
              :src="mediaUrl(img)"
              alt=""
              class="h-full w-full object-cover"
            >
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
