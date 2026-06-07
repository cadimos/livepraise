<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { AlertTriangle, Plus, X } from '@lucide/vue';
import { usePreferences, type ChromeTab } from '../composables/usePreferences';
import { useQueueDrag } from '../composables/useQueueDrag';

const { t } = useI18n();
const { prefs, setActiveTab, removeChromeTab, addBlankChromeTab } = usePreferences();
const { onDragOver, handleDropOnTab } = useQueueDrag();

const blankTabCount = computed(
  () => prefs.value.chromeTabs.filter((tab) => !tab.songId && !(tab.items?.length)).length,
);

function createBlankTab(): ChromeTab {
  const n = blankTabCount.value + 1;
  return addBlankChromeTab(t('tabs.blankLabel', { n }));
}

function onNewBlankDrop(event: DragEvent): void {
  const tab = createBlankTab();
  handleDropOnTab(event, tab.id);
}
</script>

<template>
  <div
    class="flex shrink-0 items-end gap-0.5 overflow-x-auto border-t border-lp-surface bg-lp-surface/80 px-1.5 py-1"
    role="tablist"
    :aria-label="t('tabs.playlist')"
  >
    <div
      v-for="tab in prefs.chromeTabs"
      :key="tab.id"
      class="group flex max-w-[14rem] items-center gap-0.5 rounded-t-md border border-b-0 px-2 py-1 text-xs transition"
      :class="
        prefs.activeTabId === tab.id
          ? tab.missing
            ? 'border-amber-500/70 bg-amber-950/30 text-lp-text shadow-sm'
            : 'border-lp-primary/60 bg-lp-surface text-lp-text shadow-sm'
          : tab.missing
            ? 'border-amber-600/40 bg-amber-950/20 text-amber-100/90 hover:bg-amber-950/30'
            : 'border-transparent bg-lp-background/60 text-lp-muted hover:bg-lp-surface/50'
      "
      @dragover="onDragOver"
      @drop="handleDropOnTab($event, tab.id)"
    >
      <button type="button" class="min-h-7 min-w-0 flex-1 truncate text-left" @click="setActiveTab(tab.id)">
        <AlertTriangle
          v-if="tab.missing"
          class="mr-0.5 inline h-3.5 w-3.5 shrink-0 text-amber-400"
          aria-hidden="true"
        />
        {{ tab.label }}
        <span v-if="tab.items?.length" class="ml-1 text-xs text-lp-muted">({{ tab.items.length }})</span>
      </button>
      <button
        type="button"
        class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-base leading-none text-lp-muted hover:bg-lp-surface hover:text-lp-text"
        :aria-label="t('tabs.close')"
        @click.stop="removeChromeTab(tab.id)"
      >
        <X class="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>

    <button
      type="button"
      class="inline-flex min-h-7 shrink-0 items-center gap-1 rounded-t-md border border-dashed border-lp-surface px-2 py-1 text-xs text-lp-muted transition hover:border-lp-primary/50 hover:bg-lp-surface/50 hover:text-lp-text"
      :title="t('tabs.newBlank')"
      @click="createBlankTab()"
      @dragover="onDragOver"
      @drop="onNewBlankDrop"
    >
      <Plus class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {{ t('tabs.newBlank') }}
    </button>

    <p v-if="!prefs.chromeTabs.length" class="px-2 py-1 text-xs text-lp-muted">
      {{ t('tabs.empty') }}
    </p>
  </div>
</template>
