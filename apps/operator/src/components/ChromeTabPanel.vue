<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Plus } from '@lucide/vue';
import { migrateTabVerses, isYoutubeOnlinePlayback, queueItemTileRelativePath, youtubeQueueVideoId, type QueueItem } from '@shared/queue-items';
import { usePreferences } from '../composables/usePreferences';
import QueueAddMediaModal from './QueueAddMediaModal.vue';
import { useQueueDrag } from '../composables/useQueueDrag';
import { useYoutubeImportPolling } from '../composables/useYoutubeImportPolling';
import { useLiveSocket } from '../composables/useLiveSocket';
import { useShortcuts } from '../composables/useShortcuts';
import { mediaUrl } from '../composables/useApi';
import {
  nextMusicTextInTab,
  musicProjectionFooter,
  projectQueueItem,
} from '../utils/queue-projection';
import { youtubeWatchUrl } from '@shared/youtube';
import {
  patchQueueItemFromYoutubeJob,
  postYoutubeImportEmbed,
  postYoutubeImportRetry,
  postYoutubeImportStart,
  queueItemFromYoutubeJobResponse,
} from '../utils/queue-import-api';

useYoutubeImportPolling();

const emit = defineEmits<{
  preview: [html: string];
  previewBg: [url: string];
}>();

const { t } = useI18n();
const { prefs, addQueueItem, removeQueueItem, updateQueueItem } = usePreferences();
const addModalOpen = ref(false);
const dragOverIndex = ref<number | null>(null);

const queueMenuOpen = ref(false);
const queueMenuX = ref(0);
const queueMenuY = ref(0);
const queueMenuTabId = ref<string | null>(null);
const queueMenuItemId = ref<string | null>(null);
const queueMenuItem = ref<QueueItem | null>(null);
const queueMenuItemLabel = ref('');
const { sendAction } = useLiveSocket();
const { matches: matchesShortcut } = useShortcuts();
const { onDragOver, handleDropOnQueueStrip, onQueueItemDragStart } = useQueueDrag();

const queueMenuYoutubeRetry = computed(() => {
  const item = queueMenuItem.value;
  return item?.youtubeImportPhase === 'failed' && Boolean(item.youtubeImportJobId);
});

const queueMenuYoutubeOnline = computed(() => {
  const item = queueMenuItem.value;
  if (!item || item.kind !== 'video' || item.mediaPath) return false;
  return item.youtubeImportPhase === 'failed' && Boolean(item.youtubeImportJobId);
});

const queueMenuYoutubeDownloadLocal = computed(() => {
  const item = queueMenuItem.value;
  if (!item || item.kind !== 'video' || item.mediaPath) return false;
  return isYoutubeOnlinePlayback(item);
});

const activeTab = computed(() =>
  prefs.value.chromeTabs.find((tab) => tab.id === prefs.value.activeTabId) ?? null,
);

const isBlankQueue = computed(
  () => activeTab.value != null && activeTab.value.songId == null,
);

function onItemsAdded(items: QueueItem[]): void {
  const tab = activeTab.value;
  if (!tab) return;
  for (const item of items) {
    addQueueItem(tab.id, item);
  }
}

const activeItems = computed(() => {
  const tab = activeTab.value;
  if (!tab) return [];
  if (!tab.items?.length && tab.verses?.length) {
    return migrateTabVerses(tab.verses);
  }
  return tab.items ?? [];
});

function clearActiveFlags(): void {
  const tab = activeTab.value;
  if (!tab) return;
  for (const item of tab.items) {
    item.active = false;
  }
}

function projectItem(item: QueueItem, index: number): void {
  const tab = activeTab.value;
  if (!tab) return;
  const footer = musicProjectionFooter(item, tab);
  const nextMusic = nextMusicTextInTab(tab.items, index);
  projectQueueItem(
    sendAction,
    item,
    footer,
    nextMusic,
    (html) => emit('preview', html),
    (url) => emit('previewBg', url),
  );
}

function onItemClick(item: QueueItem, index: number): void {
  const tab = activeTab.value;
  if (!tab) return;
  clearActiveFlags();
  item.active = true;
  projectItem(item, index);
}

function onItemKeydown(event: KeyboardEvent, item: QueueItem, index: number): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  onItemClick(item, index);
}

function onKeydown(event: KeyboardEvent): void {
  if (!activeItems.value.length) return;
  const target = event.target as HTMLElement | null;
  if (target?.matches('input, textarea, select')) return;

  const prev = matchesShortcut(event, 'stanza_prev');
  const next = matchesShortcut(event, 'stanza_next');
  if (!prev && !next) return;

  const currentIdx = activeItems.value.findIndex((v) => v.active);
  let nextIdx = currentIdx < 0 ? 0 : currentIdx;

  if (next) {
    nextIdx = Math.min(activeItems.value.length - 1, nextIdx + 1);
  } else {
    nextIdx = Math.max(0, nextIdx - 1);
  }

  if (nextIdx === currentIdx && currentIdx >= 0) return;

  const item = activeItems.value[nextIdx];
  if (!item) return;

  event.preventDefault();
  onItemClick(item, nextIdx);
}

function itemTileSrc(item: QueueItem): string | null {
  const previewId = youtubeQueueVideoId(item);
  if (previewId) {
    return `https://img.youtube.com/vi/${previewId}/mqdefault.jpg`;
  }
  const rel = queueItemTileRelativePath(item);
  return rel ? mediaUrl(rel) : null;
}

function youtubeImportStatusLabel(item: QueueItem): string {
  if (item.youtubeImportPhase === 'processing') {
    return t('queueItem.youtubeProcessing');
  }
  if (item.youtubeImportAttempt && item.youtubeImportAttempt > 0) {
    return t('queueItem.youtubeDownloadingAttempt', {
      attempt: item.youtubeImportAttempt,
      max: item.youtubeImportMaxAttempts ?? 3,
    });
  }
  return t('queueItem.youtubeDownloading');
}

async function onYoutubeUseOnline(item: QueueItem): Promise<void> {
  const tab = activeTab.value;
  if (!tab || !item.youtubeImportJobId) return;
  try {
    const data = await postYoutubeImportEmbed(item.youtubeImportJobId);
    updateQueueItem(tab.id, item.id, patchQueueItemFromYoutubeJob(data));
  } catch {
    /* omitido */
  }
}

async function onYoutubeRetry(item: QueueItem): Promise<void> {
  const tab = activeTab.value;
  if (!tab || !item.youtubeImportJobId) return;
  try {
    const data = await postYoutubeImportRetry(item.youtubeImportJobId);
    updateQueueItem(tab.id, item.id, patchQueueItemFromYoutubeJob(data));
  } catch {
    /* omitido */
  }
}

function queueVideoCategory(): string {
  const cat = prefs.value.videoCategory?.trim();
  return cat || 'default';
}

async function onYoutubeDownloadLocal(item: QueueItem): Promise<void> {
  const tab = activeTab.value;
  const videoId = youtubeQueueVideoId(item);
  if (!tab || !videoId) return;
  try {
    const data = await postYoutubeImportStart({
      url: youtubeWatchUrl(videoId),
      category: queueVideoCategory(),
    });
    updateQueueItem(
      tab.id,
      item.id,
      queueItemFromYoutubeJobResponse(data, item.id),
    );
  } catch {
    /* omitido */
  }
}

function itemBadgeLabel(item: QueueItem): string {
  if (isYoutubeOnlinePlayback(item)) {
    return t('queueItem.online');
  }
  return itemKindLabel(item.kind);
}

function itemKindLabel(kind: QueueItem['kind']): string {
  switch (kind) {
    case 'music':
      return t('tabs.kindMusic');
    case 'bible':
      return t('tabs.kindBible');
    case 'image':
      return t('tabs.kindImage');
    case 'video':
      return t('tabs.kindVideo');
    case 'blank':
      return t('tabs.kindBlank');
    default:
      return kind;
  }
}

function onMenuYoutubeRetry(): void {
  const item = queueMenuItem.value;
  const tabId = queueMenuTabId.value;
  closeQueueMenu();
  if (!item || !tabId) return;
  void onYoutubeRetry(item);
}

function onMenuYoutubeOnline(): void {
  const item = queueMenuItem.value;
  closeQueueMenu();
  if (!item) return;
  void onYoutubeUseOnline(item);
}

function onMenuYoutubeDownloadLocal(): void {
  const item = queueMenuItem.value;
  closeQueueMenu();
  if (!item) return;
  void onYoutubeDownloadLocal(item);
}

function onStripDragOver(event: DragEvent, index: number): void {
  onDragOver(event);
  dragOverIndex.value = index;
}

function onStripDrop(event: DragEvent, index: number): void {
  const tab = activeTab.value;
  if (!tab) return;
  handleDropOnQueueStrip(event, tab.id, index);
  dragOverIndex.value = null;
}

function onStripDragLeave(): void {
  dragOverIndex.value = null;
}

function closeQueueMenu(): void {
  queueMenuOpen.value = false;
  queueMenuTabId.value = null;
  queueMenuItemId.value = null;
  queueMenuItem.value = null;
  queueMenuItemLabel.value = '';
}

function onQueueItemContextMenu(event: MouseEvent, tabId: string, item: QueueItem): void {
  event.preventDefault();
  const maxX = Math.max(0, window.innerWidth - 224);
  const maxY = Math.max(0, window.innerHeight - 48);
  queueMenuX.value = Math.min(event.clientX, maxX);
  queueMenuY.value = Math.min(event.clientY, maxY);
  queueMenuTabId.value = tabId;
  queueMenuItemId.value = item.id;
  queueMenuItem.value = item;
  queueMenuItemLabel.value = item.label;
  queueMenuOpen.value = true;
}

function queueMenuAriaLabel(): string {
  const label =
    queueMenuItemLabel.value.length > 40
      ? `${queueMenuItemLabel.value.slice(0, 40)}…`
      : queueMenuItemLabel.value;
  return t('queueItem.removeFromQueueAria', { label });
}

function onRemoveFromQueue(): void {
  const tabId = queueMenuTabId.value;
  const itemId = queueMenuItemId.value;
  closeQueueMenu();
  if (!tabId || !itemId) return;
  removeQueueItem(tabId, itemId);
}

function onQueueDocumentClick(): void {
  closeQueueMenu();
}

function onQueueDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeQueueMenu();
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  document.addEventListener('click', onQueueDocumentClick);
  document.addEventListener('keydown', onQueueDocumentKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  document.removeEventListener('click', onQueueDocumentClick);
  document.removeEventListener('keydown', onQueueDocumentKeydown);
});
</script>

<template>
  <section
    v-if="activeTab"
    class="shrink-0 border-t border-lp-surface bg-lp-background/80"
    @dragover="onDragOver"
    @drop="handleDropOnQueueStrip($event, activeTab.id, activeItems.length)"
  >
    <div class="px-3 pb-2 pt-1">
      <p
        v-if="activeTab.missing"
        class="mb-2 rounded border border-amber-500/50 bg-amber-950/40 px-2 py-1.5 text-xs text-amber-100"
        role="status"
      >
        {{ activeTab.missingMessage ?? t('tabs.missingSong') }}
      </p>
      <p
        v-if="!activeItems.length"
        class="mb-2 rounded border border-dashed border-lp-surface px-2 py-3 text-center text-xs text-lp-muted"
      >
        {{ t('tabs.dropHint') }}
      </p>
      <ul
        class="playlist-verses-track flex flex-nowrap items-stretch gap-2 overflow-x-auto overflow-y-hidden pb-4"
      >
        <li
          v-if="isBlankQueue"
          role="button"
          tabindex="0"
          class="playlist-verse-tile flex w-[10rem] shrink-0 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-lp-surface bg-lp-surface/40 text-lp-muted transition hover:border-lp-primary/50 hover:text-lp-text"
          :aria-label="t('queueAdd.addCard')"
          @click="addModalOpen = true"
          @keydown.enter.prevent="addModalOpen = true"
          @keydown.space.prevent="addModalOpen = true"
        >
          <Plus
            class="h-8 w-8 text-lp-primary"
            aria-hidden="true"
          />
          <span class="mt-2 px-2 text-center text-xs">{{ t('queueAdd.addCard') }}</span>
        </li>
        <li
          v-for="(item, index) in activeItems"
          :key="item.id"
          role="button"
          tabindex="0"
          draggable="true"
          class="playlist-verse-tile relative w-[10rem] shrink-0 cursor-grab rounded-md border-2 text-sm transition active:cursor-grabbing"
          :class="
            item.active
              ? 'border-lp-primary bg-lp-primary/20 text-lp-text shadow-[0_3px_0_0_var(--lp-color-primary)]'
              : dragOverIndex === index
                ? 'border-lp-primary/70 bg-lp-primary/10 text-lp-text'
                : 'border-lp-surface bg-lp-surface text-lp-muted hover:border-lp-primary/40 hover:text-lp-text'
          "
          :aria-pressed="item.active"
          :aria-label="item.label"
          @click="onItemClick(item, index)"
          @contextmenu.prevent="onQueueItemContextMenu($event, activeTab.id, item)"
          @keydown="onItemKeydown($event, item, index)"
          @dragstart="onQueueItemDragStart($event, activeTab.id, item)"
          @dragover.prevent="onStripDragOver($event, index)"
          @dragleave="onStripDragLeave"
          @drop.stop="onStripDrop($event, index)"
        >
          <span
            class="absolute right-1 top-1 rounded bg-lp-background/80 px-1 text-[10px] uppercase tracking-wide text-lp-muted"
            :class="isYoutubeOnlinePlayback(item) ? 'text-sky-300' : ''"
          >
            {{ itemBadgeLabel(item) }}
          </span>
          <template v-if="item.kind === 'image' || item.kind === 'video'">
            <img
              v-if="itemTileSrc(item)"
              :src="itemTileSrc(item)!"
              alt=""
              class="h-20 w-full object-cover p-1 pt-5"
              draggable="false"
            >
            <p
              v-else
              class="p-2 pt-6 text-xs"
            >
              {{ item.label }}
            </p>
            <div
              v-if="item.youtubeImportJobId && item.youtubeImportPhase !== 'failed'"
              class="absolute inset-x-0 bottom-0 space-y-1 bg-black/75 p-2 pt-6"
            >
              <p class="text-[10px] leading-tight text-slate-200">
                {{ youtubeImportStatusLabel(item) }}
              </p>
              <div class="h-1.5 overflow-hidden rounded-full bg-slate-700">
                <div
                  class="h-full rounded-full bg-lp-primary transition-all duration-300"
                  :style="{ width: `${Math.max(4, item.youtubeImportProgress ?? 0)}%` }"
                />
              </div>
              <p class="text-[10px] tabular-nums text-slate-300">
                {{ item.youtubeImportProgress ?? 0 }}%
              </p>
            </div>
            <div
              v-else-if="item.youtubeImportPhase === 'failed'"
              class="absolute inset-x-0 bottom-0 bg-black/75 px-2 py-1 pt-5"
            >
              <p class="text-[10px] leading-snug text-rose-200">
                {{ t('queueItem.youtubeFailedShort') }}
              </p>
            </div>
          </template>
          <template v-else-if="item.kind === 'blank'">
            <p class="p-2 pt-6 text-center text-xs italic text-lp-muted">
              {{ t('tabs.kindBlank') }}
            </p>
          </template>
          <template v-else>
            <pre class="playlist-verse-text whitespace-pre-wrap p-2 pt-5 font-sans text-sm leading-snug">{{
              item.text ?? item.label
            }}</pre>
          </template>
        </li>
      </ul>
    </div>
    <QueueAddMediaModal
      v-model:open="addModalOpen"
      :tab-id="activeTab?.id ?? null"
      @added="onItemsAdded"
    />
    <ul
      v-if="queueMenuOpen"
      class="fixed z-[60] min-w-[14rem] rounded-md border border-lp-surface bg-lp-background py-1 text-sm text-lp-text shadow-lg"
      :style="{ left: `${queueMenuX}px`, top: `${queueMenuY}px` }"
      role="menu"
      @click.stop
    >
      <li v-if="queueMenuYoutubeDownloadLocal">
        <button
          type="button"
          class="w-full px-3 py-2 text-left hover:bg-lp-surface"
          role="menuitem"
          @click="onMenuYoutubeDownloadLocal"
        >
          {{ t('queueItem.youtubeDownloadLocal') }}
        </button>
      </li>
      <li v-if="queueMenuYoutubeRetry">
        <button
          type="button"
          class="w-full px-3 py-2 text-left hover:bg-lp-surface"
          role="menuitem"
          @click="onMenuYoutubeRetry"
        >
          {{ t('queueItem.youtubeRetry') }}
        </button>
      </li>
      <li v-if="queueMenuYoutubeOnline">
        <button
          type="button"
          class="w-full px-3 py-2 text-left hover:bg-lp-surface"
          role="menuitem"
          @click="onMenuYoutubeOnline"
        >
          {{ t('queueItem.youtubeUseOnline') }}
        </button>
      </li>
      <li>
        <button
          type="button"
          class="w-full px-3 py-2 text-left hover:bg-lp-surface"
          role="menuitem"
          :aria-label="queueMenuAriaLabel()"
          @click="onRemoveFromQueue"
        >
          {{ t('queueItem.removeFromQueue') }}
        </button>
      </li>
    </ul>
  </section>
</template>
