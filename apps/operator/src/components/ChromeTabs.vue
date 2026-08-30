<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { AlertTriangle, Plus, X } from '@lucide/vue';
import { insertIndexFromPointer } from '@shared/list-reorder';
import { usePreferences, type ChromeTab } from '../composables/usePreferences';
import { useQueueDrag } from '../composables/useQueueDrag';
import { useTabDrag } from '../composables/useTabDrag';

const { t } = useI18n();
const {
  prefs,
  setActiveTab,
  removeChromeTab,
  addBlankChromeTab,
  moveChromeTabBy,
} = usePreferences();
const { onDragOver, handleDropOnTab } = useQueueDrag();
const { onTabDragStart, isTabDrag, onTabDragOver, handleTabDrop } = useTabDrag();

/** Posição de inserção sinalizada ao arrastar abas (`length` = fim). */
const dropInsertIndex = ref<number | null>(null);

const blankTabCount = computed(
  () => prefs.value.chromeTabs.filter((tab) => !tab.songId && !(tab.items?.length)).length,
);

function createBlankTab(): ChromeTab {
  const n = blankTabCount.value + 1;
  return addBlankChromeTab(t('tabs.blankLabel', { n }));
}

function onNewBlankDrop(event: DragEvent): void {
  if (isTabDrag(event)) {
    handleTabDrop(event, prefs.value.chromeTabs.length);
    dropInsertIndex.value = null;
    return;
  }
  const tab = createBlankTab();
  handleDropOnTab(event, tab.id);
}

function onNewBlankDragOver(event: DragEvent): void {
  if (onTabDragOver(event)) {
    dropInsertIndex.value = prefs.value.chromeTabs.length;
    return;
  }
  onDragOver(event);
}

/** Metade esquerda da aba insere antes dela, metade direita insere depois. */
function tabInsertIndex(event: DragEvent, index: number): number {
  const el = event.currentTarget as HTMLElement | null;
  if (!el) return index;
  const rect = el.getBoundingClientRect();
  return insertIndexFromPointer(index, event.clientX, rect.left, rect.width);
}

function onTabDragOverAt(event: DragEvent, index: number): void {
  if (onTabDragOver(event)) {
    event.stopPropagation();
    dropInsertIndex.value = tabInsertIndex(event, index);
    return;
  }
  onDragOver(event);
}

function onTabDropAt(event: DragEvent, index: number, tabId: string): void {
  if (handleTabDrop(event, tabInsertIndex(event, index))) {
    dropInsertIndex.value = null;
    return;
  }
  handleDropOnTab(event, tabId);
}

function onDragEnd(): void {
  dropInsertIndex.value = null;
}

function onTabListDragLeave(event: DragEvent): void {
  const list = event.currentTarget as HTMLElement | null;
  const next = event.relatedTarget as Node | null;
  if (list && next && list.contains(next)) return;
  dropInsertIndex.value = null;
}

onMounted(() => {
  window.addEventListener('dragend', onDragEnd);
});

onUnmounted(() => {
  window.removeEventListener('dragend', onDragEnd);
});

/** Alt+←/→ reordena a aba focada; alternativa ao arrasto. */
function onTabKeydown(event: KeyboardEvent, tabId: string): void {
  if (!event.altKey || event.ctrlKey || event.shiftKey) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  event.stopPropagation();
  moveChromeTabBy(tabId, event.key === 'ArrowRight' ? 1 : -1);
}
</script>

<template>
  <div
    class="flex shrink-0 items-end gap-0.5 overflow-x-auto border-t border-lp-surface bg-lp-surface/80 px-1.5 py-1"
    role="tablist"
    :aria-label="t('tabs.playlist')"
    @dragleave="onTabListDragLeave"
  >
    <div
      v-for="(tab, index) in prefs.chromeTabs"
      :key="tab.id"
      class="group relative flex max-w-[14rem] items-center gap-0.5 rounded-t-md border border-b-0 px-2 py-1 text-xs transition"
      draggable="true"
      :class="[
        prefs.activeTabId === tab.id
          ? tab.missing
            ? 'border-amber-500/70 bg-amber-950/30 text-lp-text shadow-xs'
            : 'border-lp-primary/60 bg-lp-surface text-lp-text shadow-xs'
          : tab.missing
            ? 'border-amber-600/40 bg-amber-950/20 text-amber-100/90 hover:bg-amber-950/30'
            : 'border-transparent bg-lp-background/60 text-lp-muted hover:bg-lp-surface/50',
        dropInsertIndex === index ? 'playlist-tab--drop-before' : '',
        index === prefs.chromeTabs.length - 1
          && dropInsertIndex === prefs.chromeTabs.length
          ? 'playlist-tab--drop-after'
          : '',
      ]"
      @dragstart="onTabDragStart($event, tab.id)"
      @dragend="onDragEnd"
      @dragover="onTabDragOverAt($event, index)"
      @drop="onTabDropAt($event, index, tab.id)"
    >
      <button
        type="button"
        class="min-h-7 min-w-0 flex-1 cursor-grab truncate text-left active:cursor-grabbing"
        :title="t('tabs.reorderHint')"
        @click="setActiveTab(tab.id)"
        @keydown="onTabKeydown($event, tab.id)"
      >
        <AlertTriangle
          v-if="tab.missing"
          class="mr-0.5 inline h-3.5 w-3.5 shrink-0 text-amber-400"
          aria-hidden="true"
        />
        {{ tab.label }}
        <span
          v-if="tab.items?.length"
          class="ml-1 text-xs text-lp-muted"
        >({{ tab.items.length }})</span>
      </button>
      <button
        type="button"
        class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-base leading-none text-lp-muted hover:bg-lp-surface hover:text-lp-text"
        :aria-label="t('tabs.close')"
        data-no-tab-drag
        @click.stop="removeChromeTab(tab.id)"
      >
        <X
          class="h-3.5 w-3.5"
          aria-hidden="true"
        />
      </button>
    </div>

    <button
      type="button"
      class="relative inline-flex min-h-7 shrink-0 items-center gap-1 rounded-t-md border border-dashed border-lp-surface px-2 py-1 text-xs text-lp-muted transition hover:border-lp-primary/50 hover:bg-lp-surface/50 hover:text-lp-text"
      :class="
        !prefs.chromeTabs.length && dropInsertIndex === 0
          ? 'playlist-tab--drop-before'
          : ''
      "
      :title="t('tabs.newBlank')"
      @click="createBlankTab()"
      @dragover="onNewBlankDragOver"
      @drop="onNewBlankDrop"
    >
      <Plus
        class="h-3.5 w-3.5 shrink-0"
        aria-hidden="true"
      />
      {{ t('tabs.newBlank') }}
    </button>

    <p
      v-if="!prefs.chromeTabs.length"
      class="px-2 py-1 text-xs text-lp-muted"
    >
      {{ t('tabs.empty') }}
    </p>
  </div>
</template>
