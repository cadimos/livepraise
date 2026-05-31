<script setup lang="ts">
import { ref, watch } from 'vue';
import { X } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { fetchJson, type Song, type Verse } from '../composables/useApi';
import { usePreferences } from '../composables/usePreferences';
import { triggerWorshipRefresh } from '../composables/useWorshipRefresh';
import { joinVersesIntoLyrics, splitLyricsIntoVerses } from '../utils/music';

const open = defineModel<boolean>('open', { default: false });
const editSongId = defineModel<number | null>('editSongId', { default: null });

const { t } = useI18n();
const { prefs } = usePreferences();

const nome = ref('');
const artista = ref('');
const compositor = ref('');
const letra = ref('');
const saving = ref(false);
const loading = ref(false);
const error = ref('');

const isEdit = () => editSongId.value != null;

function resetForm(): void {
  nome.value = '';
  artista.value = '';
  compositor.value = '';
  letra.value = '';
  error.value = '';
}

function close(): void {
  open.value = false;
  editSongId.value = null;
  resetForm();
}

async function loadSongForEdit(songId: number): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const songData = await fetchJson<{ status: string; items: Song[] }>(`/musica/${songId}`);
    const song = songData.items?.[0];
    if (!song) {
      throw new Error(t('newSong.errors.loadFailed'));
    }
    nome.value = song.nome;
    artista.value = song.artista;
    compositor.value = song.compositor ?? '';

    const verseData = await fetchJson<{ status: string; items: Verse[] }>(
      `/musica/verso/${songId}`,
    );
    letra.value = joinVersesIntoLyrics(
      (verseData.items ?? []).map((v) => v.verso),
    );
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('newSong.errors.loadFailed');
  } finally {
    loading.value = false;
  }
}

watch(
  () => [open.value, editSongId.value] as const,
  ([isOpen, songId]) => {
    if (!isOpen) return;
    resetForm();
    if (songId != null) {
      void loadSongForEdit(songId);
    }
  },
);

async function save(): Promise<void> {
  const name = nome.value.trim();
  const artist = artista.value.trim();
  const verses = splitLyricsIntoVerses(letra.value);

  if (!name) {
    error.value = t('newSong.errors.nameRequired');
    return;
  }
  if (!artist) {
    error.value = t('newSong.errors.artistRequired');
    return;
  }
  if (!verses.length) {
    error.value = t('newSong.errors.lyricsRequired');
    return;
  }

  const cat = prefs.value.musicCategoryId || '1';
  saving.value = true;
  error.value = '';

  const body = {
    cat,
    nome: name,
    artista: artist,
    compositor: compositor.value.trim(),
  };

  try {
    let musicaId: number;

    if (isEdit() && editSongId.value != null) {
      const updated = await fetchJson<{ status: string; id: number | string }>(
        `/musica/${editSongId.value}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (updated.status !== 'successo') {
        throw new Error(t('newSong.errors.saveFailed'));
      }
      musicaId = editSongId.value;
    } else {
      const created = await fetchJson<{ status: string; id: number }>('/musica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (created.status !== 'successo' || !created.id) {
        throw new Error(t('newSong.errors.saveFailed'));
      }
      musicaId = created.id;
    }

    for (const verso of verses) {
      await fetchJson('/musica/verso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musica: String(musicaId), verso }),
      });
    }

    triggerWorshipRefresh();
    close();
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('newSong.errors.saveFailed');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    role="dialog"
    aria-modal="true"
    :aria-label="isEdit() ? t('newSong.editTitle') : t('newSong.title')"
    @click.self="close"
  >
    <form
      class="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-lp-surface bg-lp-background shadow-xl"
      @submit.prevent="save"
    >
      <header class="flex items-center justify-between border-b border-lp-surface px-4 py-3">
        <h2 class="text-sm font-semibold text-lp-text">
          {{ isEdit() ? t('newSong.editTitle') : t('newSong.title') }}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-lp-muted hover:bg-lp-surface hover:text-lp-text"
          :aria-label="t('notepad.close')"
          @click="close"
        >
          <X class="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <p v-if="loading" class="text-sm text-lp-muted">{{ t('newSong.loading') }}</p>
        <p v-if="error" class="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
          {{ error }}
        </p>

        <label class="block text-xs uppercase tracking-wider text-lp-muted">
          {{ t('newSong.name') }}
          <input
            v-model="nome"
            type="text"
            required
            :disabled="loading"
            class="mt-1 w-full rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text disabled:opacity-50"
          />
        </label>

        <label class="block text-xs uppercase tracking-wider text-lp-muted">
          {{ t('newSong.artist') }}
          <input
            v-model="artista"
            type="text"
            required
            :disabled="loading"
            class="mt-1 w-full rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text disabled:opacity-50"
          />
        </label>

        <label class="block text-xs uppercase tracking-wider text-lp-muted">
          {{ t('newSong.composer') }}
          <input
            v-model="compositor"
            type="text"
            :disabled="loading"
            class="mt-1 w-full rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text disabled:opacity-50"
          />
        </label>

        <label class="block text-xs uppercase tracking-wider text-lp-muted">
          {{ t('newSong.lyrics') }}
          <textarea
            v-model="letra"
            rows="10"
            required
            :disabled="loading"
            class="mt-1 w-full rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text disabled:opacity-50"
          />
        </label>
        <p class="text-xs text-lp-muted">{{ t('newSong.lyricsHint') }}</p>
      </div>

      <footer class="flex justify-end gap-2 border-t border-lp-surface px-4 py-3">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm text-lp-muted hover:bg-lp-surface"
          @click="close"
        >
          {{ t('newSong.cancel') }}
        </button>
        <button
          type="submit"
          class="rounded-lg bg-lp-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          :disabled="saving || loading"
        >
          {{ saving ? t('newSong.saving') : t('newSong.save') }}
        </button>
      </footer>
    </form>
  </div>
</template>
