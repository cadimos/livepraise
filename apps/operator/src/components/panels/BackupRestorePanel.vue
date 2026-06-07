<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Download, Upload } from '@lucide/vue';
import { fetchJson, type MusicCategory } from '../../composables/useApi';
import {
  exportMusicRepertoireFile,
  importMusicRepertoireFile,
} from '../../composables/useMusicRepertoireTransfer';
import { triggerWorshipRefresh } from '../../composables/useWorshipRefresh';
import BackupModal from '../BackupModal.vue';
import RestoreModal from '../RestoreModal.vue';

const { t } = useI18n();
const backupOpen = ref(false);
const restoreOpen = ref(false);

const categories = ref<MusicCategory[]>([]);
const exportCategoryId = ref('');
const repertoireBusy = ref(false);
const repertoireError = ref('');
const importInputRef = ref<HTMLInputElement | null>(null);

async function loadCategories() {
  try {
    const data = await fetchJson<{ status: string; items: MusicCategory[] }>(
      '/musica/categoria',
    );
    categories.value = data.items ?? [];
    if (!exportCategoryId.value && categories.value[0]) {
      exportCategoryId.value = String(categories.value[0].id);
    }
  } catch (e) {
    repertoireError.value =
      e instanceof Error ? e.message : t('settings.backup.repertoire.errors.categories');
  }
}

async function exportCategory() {
  if (!exportCategoryId.value) {
    window.alert(t('settings.backup.repertoire.noCategory'));
    return;
  }
  repertoireBusy.value = true;
  repertoireError.value = '';
  try {
    await exportMusicRepertoireFile({ categoryId: exportCategoryId.value });
  } catch (e) {
    repertoireError.value =
      e instanceof Error ? e.message : t('settings.backup.repertoire.errors.export');
  } finally {
    repertoireBusy.value = false;
  }
}

async function exportAll() {
  repertoireBusy.value = true;
  repertoireError.value = '';
  try {
    await exportMusicRepertoireFile({});
  } catch (e) {
    repertoireError.value =
      e instanceof Error ? e.message : t('settings.backup.repertoire.errors.export');
  } finally {
    repertoireBusy.value = false;
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

  repertoireBusy.value = true;
  repertoireError.value = '';
  try {
    const raw = await file.text();
    const result = await importMusicRepertoireFile(raw);
    window.alert(
      t('settings.backup.repertoire.importSuccess', {
        songs: result.songsImported,
        verses: result.versesImported,
      }),
    );
    triggerWorshipRefresh();
  } catch (e) {
    repertoireError.value =
      e instanceof Error ? e.message : t('settings.backup.repertoire.errors.import');
  } finally {
    repertoireBusy.value = false;
  }
}

onMounted(() => {
  void loadCategories();
});
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-4">
      <p class="text-sm text-lp-muted">{{ t('settings.backup.panelIntro') }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg bg-lp-primary px-4 py-2 text-sm font-medium text-white"
          @click="backupOpen = true"
        >
          {{ t('settings.backup.openBackup') }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-lp-surface px-4 py-2 text-sm text-lp-muted"
          @click="restoreOpen = true"
        >
          {{ t('settings.backup.openRestore') }}
        </button>
      </div>
    </section>

    <section
      class="space-y-3 rounded-lg border border-lp-surface bg-lp-background/40 p-4"
    >
      <div>
        <h3 class="text-sm font-semibold text-lp-text">
          {{ t('settings.backup.repertoire.title') }}
        </h3>
        <p class="mt-1 text-sm text-lp-muted">
          {{ t('settings.backup.repertoire.intro') }}
        </p>
      </div>

      <div
        v-if="repertoireError"
        class="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
      >
        {{ repertoireError }}
      </div>

      <div class="lp-panel-field-row max-w-md">
        <label class="lp-panel-label" for="repertoire-category">{{
          t('settings.backup.repertoire.category')
        }}</label>
        <select
          id="repertoire-category"
          v-model="exportCategoryId"
          class="rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text"
        >
        <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)">
          {{ cat.descricao ?? cat.nome ?? `Categoria ${cat.id}` }}
        </option>
      </select>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-lp-surface px-3 py-2 text-sm text-lp-text transition hover:bg-lp-surface/60 disabled:opacity-50"
          :disabled="repertoireBusy || !exportCategoryId"
          @click="exportCategory"
        >
          <Download class="h-4 w-4" aria-hidden="true" />
          {{ t('settings.backup.repertoire.exportCategory') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-lp-surface px-3 py-2 text-sm text-lp-text transition hover:bg-lp-surface/60 disabled:opacity-50"
          :disabled="repertoireBusy"
          @click="exportAll"
        >
          <Download class="h-4 w-4" aria-hidden="true" />
          {{ t('settings.backup.repertoire.exportAll') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-lp-surface px-3 py-2 text-sm text-lp-text transition hover:bg-lp-surface/60 disabled:opacity-50"
          :disabled="repertoireBusy"
          @click="openImportPicker"
        >
          <Upload class="h-4 w-4" aria-hidden="true" />
          {{ t('settings.backup.repertoire.import') }}
        </button>
        <input
          ref="importInputRef"
          type="file"
          accept="application/json,.json"
          class="hidden"
          @change="onImportFile"
        />
      </div>
    </section>

    <BackupModal v-model:open="backupOpen" />
    <RestoreModal v-model:open="restoreOpen" />
  </div>
</template>
