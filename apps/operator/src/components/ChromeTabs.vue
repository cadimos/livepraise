<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { AlertTriangle, X } from '@lucide/vue';
import { usePreferences } from '../composables/usePreferences';

const { t } = useI18n();
const { prefs, setActiveTab, removeChromeTab } = usePreferences();
</script>

<template>
  <div
    class="flex shrink-0 items-end gap-1 overflow-x-auto border-t border-lp-surface bg-lp-surface/80 px-2 py-1.5"
    role="tablist"
    :aria-label="t('tabs.playlist')"
  >
    <div
      v-for="tab in prefs.chromeTabs"
      :key="tab.id"
      class="group flex max-w-[14rem] items-center gap-1 rounded-t-lg border border-b-0 px-3 py-1.5 text-sm transition"
      :class="
        prefs.activeTabId === tab.id
          ? tab.missing
            ? 'border-amber-500/70 bg-amber-950/30 text-lp-text shadow-sm'
            : 'border-lp-primary/60 bg-lp-surface text-lp-text shadow-sm'
          : tab.missing
            ? 'border-amber-600/40 bg-amber-950/20 text-amber-100/90 hover:bg-amber-950/30'
            : 'border-transparent bg-lp-background/60 text-lp-muted hover:bg-lp-surface/50'
      "
    >
      <button type="button" class="min-h-11 min-w-0 flex-1 truncate text-left" @click="setActiveTab(tab.id)">
        <AlertTriangle
          v-if="tab.missing"
          class="mr-0.5 inline h-4 w-4 shrink-0 text-amber-400"
          aria-hidden="true"
        />
        {{ tab.label }}
      </button>
      <button
        type="button"
        class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-base leading-none text-lp-muted hover:bg-lp-surface hover:text-lp-text"
        :aria-label="t('tabs.close')"
        @click.stop="removeChromeTab(tab.id)"
      >
        <X class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
    <p v-if="!prefs.chromeTabs.length" class="px-2 py-1.5 text-xs text-lp-muted">
      {{ t('tabs.empty') }}
    </p>
  </div>
</template>
