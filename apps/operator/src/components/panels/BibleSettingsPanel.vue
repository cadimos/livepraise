<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import {
  BIBLE_SEARCH_HISTORY_MAX_LIMIT,
  BIBLE_SEARCH_HISTORY_MIN_LIMIT,
} from '@shared/bible-search-history';
import { usePreferences } from '../../composables/usePreferences';

const { t } = useI18n();
const {
  prefs,
  setBibleSearchHistoryEnabled,
  setBibleSearchHistoryLimit,
  clearBibleSearchHistory,
} = usePreferences();

function onLimitChange(event: Event) {
  setBibleSearchHistoryLimit(Number((event.target as HTMLInputElement).value));
}

function onEnabledChange(event: Event) {
  setBibleSearchHistoryEnabled((event.target as HTMLInputElement).checked);
}
</script>

<template>
  <div class="flex flex-col gap-4 text-sm">
    <p class="text-lp-muted">{{ t('settings.bible.intro') }}</p>

    <label class="flex items-center gap-2">
      <input
        type="checkbox"
        class="rounded border-lp-surface"
        :checked="prefs.bibleSearchHistoryEnabled"
        @change="onEnabledChange"
      />
      <span class="font-medium text-lp-text">{{ t('settings.bible.searchHistoryEnabled') }}</span>
    </label>

    <label class="flex flex-col gap-1.5" :class="{ 'opacity-50': !prefs.bibleSearchHistoryEnabled }">
      <span class="font-medium text-lp-text">{{ t('settings.bible.searchHistoryLimit') }}</span>
      <div class="flex items-center gap-3">
        <input
          type="number"
          :min="BIBLE_SEARCH_HISTORY_MIN_LIMIT"
          :max="BIBLE_SEARCH_HISTORY_MAX_LIMIT"
          step="1"
          class="w-20 rounded border border-lp-surface bg-lp-background px-2 py-1.5 tabular-nums text-lp-text"
          :value="prefs.bibleSearchHistoryLimit"
          :disabled="!prefs.bibleSearchHistoryEnabled"
          @change="onLimitChange"
        />
        <span class="text-lp-muted">{{ t('settings.bible.searchHistoryLimitUnit') }}</span>
      </div>
      <p class="text-xs text-lp-muted">{{ t('settings.bible.searchHistoryLimitHint') }}</p>
    </label>

    <div class="flex items-center gap-3">
      <button
        type="button"
        class="rounded border border-lp-surface px-3 py-1.5 text-lp-text transition hover:bg-lp-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!prefs.bibleSearchHistory.length"
        @click="clearBibleSearchHistory"
      >
        {{ t('settings.bible.clearSearchHistory') }}
      </button>
    </div>
  </div>
</template>
