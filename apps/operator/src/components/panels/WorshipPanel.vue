<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
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
import { expandVersesForDisplay, normalizeVerseText } from '../../utils/music';
import { buildMusicHtml, buildMusicStageHtml } from '../../utils/projection';
import {
  createWorshipFuseIndex,
  filterWorshipSongs,
  type SongWithLyrics,
} from '../../utils/worship-search';
import { summarizeLabel } from '@shared/queue-items';
import { CircleCheckBig, Download, Pencil, Trash2, Upload } from '@lucide/vue';
import { useQueueDrag } from '../../composables/useQueueDrag';
import {
  exportMusicRepertoireFile,
  importMusicRepertoireFile,
} from '../../composables/useMusicRepertoireTransfer';

const emit = defineEmits<{
  preview: [html: string];
  editSong: [songId: number];
}>();

const { t } = useI18n();
const { prefs, setMusicCategory, addChromeTab, removeChromeTabsForSong, setWorshipSearchQuery } =
  usePreferences();
const { onDragStart } = useQueueDrag();
const { refreshToken } = useWorshipRefresh();
const { sendAction } = useLiveSocket();

const categories = ref<MusicCategory[]>([]);
const songs = ref<SongWithLyrics[]>([]);
const verses = ref<Verse[]>([]);
const selectedSong = ref<Song | null>(null);
const selectedVerseId = ref<number | null>(null);
const loading = ref(false);
const error = ref('');
const importInputRef = ref<HTMLInputElement | null>(null);
const transferBusy = ref(false);

const SEARCH_DEBOUNCE_MS = 150;
const searchInput = ref(prefs.value.worshipSearchQuery);
const filterQuery = ref(prefs.value.worshipSearchQuery);
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function applyFilterQuery(value: string): void {
  filterQuery.value = value;
  setWorshipSearchQuery(value);
}

function scheduleDebouncedSearch(value: string): void {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null;
    applyFilterQuery(value);
  }, SEARCH_DEBOUNCE_MS);
}

function onSearchInput(value: string): void {
  searchInput.value = value;
  scheduleDebouncedSearch(value);
}

function onSearchEnter(): void {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = null;
  applyFilterQuery(searchInput.value);
}

/** Versos do BD expandidos para exibição/fila (CAD-182). */
const displayVerses = computed(() => {
  const raw = verses.value.map((v) => ({ id: v.id, text: v.verso }));
  return expandVersesForDisplay(raw, prefs.value.maxEstofreLines).map((v) => ({
    id: v.id,
    verso: v.text,
  }));
});

const worshipFuse = computed(() => (songs.value.length > 0 ? createWorshipFuseIndex(songs.value) : null));

const filteredSongs = computed(() =>
  filterWorshipSongs(songs.value, filterQuery.value, worshipFuse.value),
);

watch(
  () => prefs.value.worshipSearchQuery,
  (query) => {
    if (query === searchInput.value && query === filterQuery.value) return;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
    searchInput.value = query;
    filterQuery.value = query;
  },
);

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
  selectedVerseId.value = null;
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
  selectedVerseId.value = null;
  try {
    const data = await fetchJson<{ status: string; items: Verse[] }>(
      `/musica/verso/${song.id}`,
    );
    verses.value = (data.items ?? []).map((v) => ({
      ...v,
      verso: normalizeVerseText(v.verso),
    }));
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao carregar versos';
  }
}

function projectVerse(verse: Verse) {
  if (!selectedSong.value) return;
  selectedVerseId.value = verse.id;
  const footer = `${selectedSong.value.nome} (${selectedSong.value.artista})`;
  const html = buildMusicHtml(verse.verso, footer);
  emit('preview', html);
  sendAction('viewMusica', html);

  const idx = displayVerses.value.findIndex((v) => v.id === verse.id);
  const nextVerse = idx >= 0 ? displayVerses.value[idx + 1] : undefined;
  const stageHtml = buildMusicStageHtml(
    verse.verso,
    nextVerse?.verso ?? null,
    footer,
    true,
  );
  sendAction('viewMusicaRetorno', stageHtml);
}

function onVerseDragStart(event: DragEvent, verse: Verse): void {
  if (!selectedSong.value) return;
  selectedVerseId.value = verse.id;
  onDragStart(event, {
    kind: 'music',
    label: summarizeLabel(verse.verso),
    text: verse.verso,
    verseId: verse.id,
    songId: selectedSong.value.id,
    songName: selectedSong.value.nome,
    artist: selectedSong.value.artista,
  });
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
      selectedVerseId.value = null;
      verses.value = [];
    }
    songs.value = songs.value.filter((s) => s.id !== song.id);
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('worship.errors.delete');
  }
}

async function exportCategory() {
  if (!prefs.value.musicCategoryId) {
    window.alert(t('worship.export.noCategory'));
    return;
  }
  transferBusy.value = true;
  error.value = '';
  try {
    await exportMusicRepertoireFile({ categoryId: prefs.value.musicCategoryId });
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('worship.export.errors.export');
  } finally {
    transferBusy.value = false;
  }
}

async function exportSelection() {
  if (!selectedSong.value) {
    window.alert(t('worship.export.noSelection'));
    return;
  }
  transferBusy.value = true;
  error.value = '';
  try {
    await exportMusicRepertoireFile({ songIds: [selectedSong.value.id] });
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('worship.export.errors.export');
  } finally {
    transferBusy.value = false;
  }
}

function openImportPicker() {
  importInputRef.value?.click();
}

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  transferBusy.value = true;
  error.value = '';
  try {
    const raw = await file.text();
    const result = await importMusicRepertoireFile(raw);
    window.alert(
      t('worship.export.importSuccess', {
        songs: result.songsImported,
        verses: result.versesImported,
      }),
    );
    await loadCategories();
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('worship.export.errors.import');
  } finally {
    transferBusy.value = false;
  }
}

async function addToTabs(song: Song) {
  try {
    const data = await fetchJson<{ status: string; items: Verse[] }>(
      `/musica/verso/${song.id}`,
    );
    const rawVerses = (data.items ?? []).map((v) => ({
      id: v.id,
      text: normalizeVerseText(v.verso),
    }));
    const verses = expandVersesForDisplay(rawVerses, prefs.value.maxEstofreLines);
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

onUnmounted(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
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

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-lp-surface px-3 py-1.5 text-xs text-lp-text transition hover:bg-lp-surface/60 disabled:opacity-50"
        :disabled="transferBusy || !prefs.musicCategoryId"
        @click="exportCategory"
      >
        <Download class="h-4 w-4" aria-hidden="true" />
        {{ t('worship.export.category') }}
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-lp-surface px-3 py-1.5 text-xs text-lp-text transition hover:bg-lp-surface/60 disabled:opacity-50"
        :disabled="transferBusy || !selectedSong"
        @click="exportSelection"
      >
        <Download class="h-4 w-4" aria-hidden="true" />
        {{ t('worship.export.selection') }}
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-lp-surface px-3 py-1.5 text-xs text-lp-text transition hover:bg-lp-surface/60 disabled:opacity-50"
        :disabled="transferBusy"
        @click="openImportPicker"
      >
        <Upload class="h-4 w-4" aria-hidden="true" />
        {{ t('worship.export.import') }}
      </button>
      <input
        ref="importInputRef"
        type="file"
        accept="application/json,.json"
        class="hidden"
        @change="onImportFile"
      />
    </div>

    <label class="lp-panel-label">{{ t('common.search') }}</label>
    <input
      :value="searchInput"
      type="search"
      class="rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text placeholder:text-lp-muted"
      :placeholder="t('common.searchPlaceholder')"
      @input="onSearchInput(($event.target as HTMLInputElement).value)"
      @keydown.enter.prevent="onSearchEnter"
    />

    <div class="grid min-h-0 flex-1 grid-cols-2 gap-3">
      <div class="flex min-h-0 flex-col">
        <p class="mb-2 lp-panel-label">{{ t('worship.songs') }}</p>
        <ul class="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border border-lp-surface bg-lp-background/50 p-2">
          <li v-if="loading" class="px-2 py-3 text-sm text-lp-muted">{{ t('worship.loading') }}</li>
          <li
            v-for="song in filteredSongs"
            :key="song.id"
            class="group flex items-center justify-between rounded-md px-2 py-2 text-sm transition hover:bg-lp-selection-list-hover"
            :class="
              selectedSong?.id === song.id
                ? 'bg-lp-selection-list text-lp-selection-list-text ring-1 ring-lp-selection-list-ring'
                : 'text-lp-text/90'
            "
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
            v-for="verse in displayVerses"
            :key="verse.id"
            draggable="true"
            class="cursor-grab rounded-md px-2 py-2 text-sm transition hover:bg-lp-selection-active-hover active:cursor-grabbing"
            :class="
              selectedVerseId === verse.id
                ? 'bg-lp-selection-active text-lp-selection-active-text ring-1 ring-lp-selection-active-ring'
                : 'text-lp-text/90 hover:text-lp-selection-active-text'
            "
            :title="t('tabs.dragHint')"
            @click="projectVerse(verse)"
            @dragstart="onVerseDragStart($event, verse)"
          >
            <pre class="whitespace-pre-wrap font-sans">{{ verse.verso }}</pre>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
