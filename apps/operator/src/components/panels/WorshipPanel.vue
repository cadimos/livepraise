<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  fetchJson,
  mediaUrl,
  type MusicCategory,
  type Song,
  type Verse,
} from '../../composables/useApi';
import { usePreferences } from '../../composables/usePreferences';
import { useWorshipRefresh } from '../../composables/useWorshipRefresh';
import { useLiveSocket } from '../../composables/useLiveSocket';
import { buildMusicHtml, buildMusicStageHtml } from '../../utils/projection';
import { CircleCheckBig, Pencil, Trash2 } from '@lucide/vue';

const emit = defineEmits<{
  preview: [html: string];
  editSong: [songId: number];
}>();

const { t } = useI18n();
const { prefs, setMusicCategory, addChromeTab, removeChromeTabsForSong, setWorshipSearchQuery } = usePreferences();
const { refreshToken } = useWorshipRefresh();
const { sendAction } = useLiveSocket();

const categories = ref<MusicCategory[]>([]);
const songs = ref<Song[]>([]);
const verses = ref<Verse[]>([]);
const selectedSong = ref<Song | null>(null);
const loading = ref(false);
const error = ref('');
const searchQuery = computed({
  get: () => prefs.value.worshipSearchQuery,
  set: (value: string) => setWorshipSearchQuery(value),
});

const filteredSongs = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return songs.value;
  return songs.value.filter((song) => {
    const name = (song.nome2 ?? song.nome).toLowerCase();
    const artist = (song.artista ?? '').toLowerCase();
    return name.includes(q) || artist.includes(q);
  });
});

async function loadCategories() {
  loading.value = true;
  error.value = '';
  try {
    const data = await fetchJson<{ status: string; items: MusicCategory[] }>(
      '/musica/categoria',
    );
    categories.value = data.items ?? [];
    if (!prefs.value.musicCategoryId && categories.value[0]) {
      setMusicCategory(String(categories.value[0].id));
    }
    if (prefs.value.musicCategoryId) {
      await loadSongs(prefs.value.musicCategoryId);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao carregar categorias';
  } finally {
    loading.value = false;
  }
}

async function loadSongs(catId: string) {
  setMusicCategory(catId);
  selectedSong.value = null;
  verses.value = [];
  try {
    const data = await fetchJson<{ status: string; items: Song[] }>(
      `/musica/categoria/${catId}`,
    );
    songs.value = data.items ?? [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao carregar músicas';
  }
}

async function selectSong(song: Song) {
  selectedSong.value = song;
  try {
    const data = await fetchJson<{ status: string; items: Verse[] }>(
      `/musica/verso/${song.id}`,
    );
    verses.value = (data.items ?? []).map((v) => ({
      ...v,
      verso: v.verso.replace(/<br \/>/g, '\n'),
    }));
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao carregar versos';
  }
}

function projectVerse(verse: Verse) {
  if (!selectedSong.value) return;
  const footer = `${selectedSong.value.nome} (${selectedSong.value.artista})`;
  const html = buildMusicHtml(verse.verso, footer);
  emit('preview', html);
  sendAction('viewMusica', html);

  const idx = verses.value.findIndex((v) => v.id === verse.id);
  const nextVerse = idx >= 0 ? verses.value[idx + 1] : undefined;
  const stageHtml = buildMusicStageHtml(
    verse.verso,
    nextVerse?.verso ?? null,
    footer,
    true,
  );
  sendAction('viewMusicaRetorno', stageHtml);
}

function editSong(song: Song) {
  emit('editSong', song.id);
}

async function deleteSong(song: Song) {
  const label = song.nome2 ?? song.nome;
  if (!window.confirm(t('worship.deleteConfirm', { name: label }))) {
    return;
  }
  error.value = '';
  try {
    await fetchJson<{ status: string }>(`/musica/${song.id}`, { method: 'DELETE' });
    removeChromeTabsForSong(song.id);
    if (selectedSong.value?.id === song.id) {
      selectedSong.value = null;
      verses.value = [];
    }
    songs.value = songs.value.filter((s) => s.id !== song.id);
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('worship.errors.delete');
  }
}

async function addToTabs(song: Song) {
  try {
    const data = await fetchJson<{ status: string; items: Verse[] }>(
      `/musica/verso/${song.id}`,
    );
    const verses = (data.items ?? []).map((v) => ({
      id: v.id,
      text: v.verso.replace(/<br \/>/g, '\n'),
    }));
    addChromeTab({
      label: song.nome2 ?? song.nome,
      songId: song.id,
      songName: song.nome,
      artist: song.artista,
      verses,
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('worship.errors.verses');
  }
}

watch(
  () => prefs.value.musicCategoryId,
  (id) => {
    if (id) void loadSongs(id);
  },
);

watch(refreshToken, () => {
  void loadCategories();
});

onMounted(() => {
  void loadCategories();
});
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <div v-if="error" class="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
      {{ error }}
    </div>

    <label class="lp-panel-label">{{ t('worship.category') }}</label>
    <select
      :value="prefs.musicCategoryId"
      class="rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text"
      @change="loadSongs(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)">
        {{ cat.descricao ?? cat.nome ?? `Categoria ${cat.id}` }}
      </option>
    </select>

    <label class="lp-panel-label">{{ t('common.search') }}</label>
    <input
      v-model="searchQuery"
      type="search"
      class="rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text placeholder:text-lp-muted"
      :placeholder="t('common.searchPlaceholder')"
    />

    <div class="grid min-h-0 flex-1 grid-cols-2 gap-3">
      <div class="flex min-h-0 flex-col">
        <p class="mb-2 lp-panel-label">{{ t('worship.songs') }}</p>
        <ul class="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border border-lp-surface bg-lp-background/50 p-2">
          <li v-if="loading" class="px-2 py-3 text-sm text-lp-muted">{{ t('worship.loading') }}</li>
          <li
            v-for="song in filteredSongs"
            :key="song.id"
            class="group flex items-center justify-between rounded-md px-2 py-2 text-sm transition hover:bg-sky-950/50"
            :class="selectedSong?.id === song.id ? 'bg-lp-primary/25 text-lp-text' : 'text-lp-text/90'"
          >
            <button type="button" class="flex-1 text-left" @click="selectSong(song)">
              {{ song.nome2 ?? song.nome }}
              <span class="block text-xs text-lp-muted">{{ song.artista }}</span>
            </button>
            <div class="ml-1 flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                class="rounded-md px-1.5 py-1 text-emerald-400 transition hover:bg-emerald-950/50 hover:text-emerald-200"
                :title="t('worship.addToQueue')"
                :aria-label="t('worship.addToQueue')"
                @click.stop="addToTabs(song)"
              >
                <CircleCheckBig class="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="rounded-md px-1.5 py-1 text-amber-400 transition hover:bg-amber-950/50 hover:text-amber-200"
                :title="t('worship.edit')"
                :aria-label="t('worship.edit')"
                @click.stop="editSong(song)"
              >
                <Pencil class="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="rounded-md px-1.5 py-1 text-rose-400 transition hover:bg-rose-950/50 hover:text-rose-200"
                :title="t('worship.delete')"
                :aria-label="t('worship.delete')"
                @click.stop="deleteSong(song)"
              >
                <Trash2 class="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </li>
        </ul>
      </div>

      <div class="flex min-h-0 flex-col">
        <p class="mb-2 lp-panel-label">{{ t('worship.verses') }}</p>
        <ul class="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border border-lp-surface bg-lp-background/50 p-2">
          <li v-if="!selectedSong" class="px-2 py-3 text-sm text-lp-muted">
            {{ t('worship.selectSong') }}
          </li>
          <li
            v-for="verse in verses"
            :key="verse.id"
            class="cursor-pointer rounded-md px-2 py-2 text-sm text-slate-200 transition hover:bg-emerald-950/50 hover:text-emerald-100"
            @click="projectVerse(verse)"
          >
            <pre class="whitespace-pre-wrap font-sans">{{ verse.verso }}</pre>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
