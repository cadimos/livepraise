<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import BackupModal from '../BackupModal.vue';
import RestoreModal from '../RestoreModal.vue';

const { t } = useI18n();
const backupOpen = ref(false);
const restoreOpen = ref(false);
</script>

<template>
  <div class="space-y-4">
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
    <BackupModal v-model:open="backupOpen" />
    <RestoreModal v-model:open="restoreOpen" />
  </div>
</template>
