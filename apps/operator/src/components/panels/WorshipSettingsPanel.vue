<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { usePreferences } from '../../composables/usePreferences';

const { t } = useI18n();
const { prefs, setMaxEstofreLines } = usePreferences();

function onMaxEstofreLinesInput(event: Event) {
  setMaxEstofreLines(Number((event.target as HTMLInputElement).value));
}
</script>

<template>
  <div class="flex flex-col gap-4 text-sm">
    <p class="text-lp-muted">{{ t('settings.worship.intro') }}</p>

    <label class="flex flex-col gap-1.5">
      <span class="font-medium text-lp-text">{{ t('settings.worship.maxEstofreLines') }}</span>
      <div class="flex items-center gap-3">
        <input
          type="number"
          min="2"
          max="12"
          step="1"
          class="w-20 rounded border border-lp-surface bg-lp-background px-2 py-1.5 tabular-nums text-lp-text"
          :value="prefs.maxEstofreLines"
          @change="onMaxEstofreLinesInput"
        />
        <span class="text-lp-muted">{{ t('settings.worship.maxEstofreLinesUnit') }}</span>
      </div>
      <p class="text-xs text-lp-muted">{{ t('settings.worship.maxEstofreLinesHint') }}</p>
    </label>
  </div>
</template>
