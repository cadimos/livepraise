<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Pencil, Plus } from '@lucide/vue';
import {
  migrateTabVerses,
  isYoutubeOnlinePlayback,
  queueItemTileRelativePath,
  summarizeLabel,
  youtubeQueueVideoId,
  type QueueItem,
} from '@shared/queue-items';
import { insertIndexFromPointer } from '@shared/list-reorder';
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
const {
  prefs,
  addQueueItem,
  removeQueueItem,
  updateQueueItem,
  moveQueueItemBy,
} = usePreferences();
const addModalOpen = ref(false);
/** Posição de inserção sinalizada durante o arrasto (`length` = fim da fila). */
const dropInsertIndex = ref<number | null>(null);

const queueMenuOpen = ref(false);
const queueMenuX = ref(0);
const queueMenuY = ref(0);
const queueMenuTabId = ref<string | null>(null);
const queueMenuItemId = ref<string | null>(null);
const queueMenuItem = ref<QueueItem | null>(null);
const queueMenuItemLabel = ref('');
const editingTabId = ref<string | null>(null);
const editingItemId = ref<string | null>(null);
const editingItemKind = ref<'music' | 'bible' | null>(null);
const editingVerseText = ref('');
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
  for (const item of activeItems.value) {
    item.active = false;
  }
}

function projectItem(item: QueueItem, index: number): void {
  const tab = activeTab.value;
  if (!tab) return;
  const footer = musicProjectionFooter(item, tab);
  const nextMusic = nextMusicTextInTab(activeItems.value, index);
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

function isEditableTextItem(item: QueueItem): boolean {
  return item.kind === 'music' || item.kind === 'bible';
}

function editItemTitle(item: QueueItem): string {
  return item.kind === 'bible'
    ? t('queueItem.editBibleVerse')
    : t('queueItem.editVerse');
}

function editItemAriaLabel(item: QueueItem): string {
  const key =
    item.kind === 'bible'
      ? 'queueItem.editBibleVerseAria'
      : 'queueItem.editVerseAria';
  return t(key, { label: item.label });
}

const editorTitle = computed(() =>
  editingItemKind.value === 'bible'
    ? t('queueItem.editBibleVerse')
    : t('queueItem.editVerse'),
);

const editorHint = computed(() =>
  editingItemKind.value === 'bible'
    ? t('queueItem.editBibleVerseHint')
    : t('queueItem.editVerseHint'),
);

const editorTextLabel = computed(() =>
  editingItemKind.value === 'bible'
    ? t('queueItem.bibleVerseText')
    : t('queueItem.verseText'),
);

function startEditingVerse(tabId: string, item: QueueItem): void {
  if (!isEditableTextItem(item)) return;
  editingTabId.value = tabId;
  editingItemId.value = item.id;
  editingItemKind.value = item.kind;
  editingVerseText.value = item.text ?? '';
}

function closeVerseEditor(): void {
  editingTabId.value = null;
  editingItemId.value = null;
  editingItemKind.value = null;
  editingVerseText.value = '';
}

function saveEditedVerse(): void {
  const tabId = editingTabId.value;
  const itemId = editingItemId.value;
  const text = editingVerseText.value.trim();
  if (!tabId || !itemId || !text) return;
  updateQueueItem(
    tabId,
    itemId,
    editingItemKind.value === 'music'
      ? { text, label: summarizeLabel(text) }
      : { text },
  );
  closeVerseEditor();
}

/** Alt+←/→ desloca o item projetado; alternativa ao arrasto. */
function onReorderKeydown(event: KeyboardEvent): boolean {
  if (!event.altKey || event.ctrlKey || event.shiftKey) return false;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false;
  const tab = activeTab.value;
  if (!tab) return false;
  const current = activeItems.value.find((item) => item.active);
  if (!current) return false;
  const delta = event.key === 'ArrowRight' ? 1 : -1;
  event.preventDefault();
  moveQueueItemBy(tab.id, current.id, delta);
  return true;
}

function onKeydown(event: KeyboardEvent): void {
  if (!activeItems.value.length) return;
  const target = event.target as HTMLElement | null;
  if (target?.matches('input, textarea, select')) return;

  const prev = matchesShortcut(event, 'stanza_prev');
  const next = matchesShortcut(event, 'stanza_next');
  if (!prev && !next) {
    onReorderKeydown(event);
    return;
  }

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

/** Metade esquerda do tile insere antes dele, metade direita insere depois. */
function tileInsertIndex(event: DragEvent, index: number): number {
  const tile = event.currentTarget as HTMLElement | null;
  if (!tile) return index;
  const rect = tile.getBoundingClientRect();
  return insertIndexFromPointer(index, event.clientX, rect.left, rect.width);
}

function onTileDragOver(event: DragEvent, index: number): void {
  onDragOver(event);
  if (!event.defaultPrevented) return;
  // Sem isto o handler da secção sobrepõe-se e o alvo passa a ser sempre o fim.
  event.stopPropagation();
  dropInsertIndex.value = tileInsertIndex(event, index);
}

function onTileDrop(event: DragEvent, index: number): void {
  const tab = activeTab.value;
  if (!tab) return;
  const insertIndex = tileInsertIndex(event, index);
  handleDropOnQueueStrip(event, tab.id, insertIndex);
  dropInsertIndex.value = null;
}

function onTrackDragOver(event: DragEvent): void {
  onDragOver(event);
  if (!event.defaultPrevented) return;
  dropInsertIndex.value = activeItems.value.length;
}

function onTrackDrop(event: DragEvent): void {
  const tab = activeTab.value;
  if (!tab) return;
  handleDropOnQueueStrip(event, tab.id, activeItems.value.length);
  dropInsertIndex.value = null;
}

function onDragEnd(): void {
  dropInsertIndex.value = null;
}

function onTrackDragLeave(event: DragEvent): void {
  const track = event.currentTarget as HTMLElement | null;
  const next = event.relatedTarget as Node | null;
  if (track && next && track.contains(next)) return;
  dropInsertIndex.value = null;
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

function onMenuEditVerse(): void {
  const item = queueMenuItem.value;
  const tabId = queueMenuTabId.value;
  closeQueueMenu();
  if (!item || !tabId) return;
  startEditingVerse(tabId, item);
}

const queueMenuIndex = computed(() => {
  const itemId = queueMenuItemId.value;
  if (!itemId) return -1;
  return activeItems.value.findIndex((item) => item.id === itemId);
});

const queueMenuCanMoveLeft = computed(() => queueMenuIndex.value > 0);
const queueMenuCanMoveRight = computed(
  () => queueMenuIndex.value >= 0 && queueMenuIndex.value < activeItems.value.length - 1,
);

function onMoveQueueItem(delta: number): void {
  const tabId = queueMenuTabId.value;
  const itemId = queueMenuItemId.value;
  closeQueueMenu();
  if (!tabId || !itemId) return;
  moveQueueItemBy(tabId, itemId, delta);
}

function onQueueDocumentClick(): void {
  closeQueueMenu();
}

function onQueueDocumentKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  closeQueueMenu();
  closeVerseEditor();
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  // Arrastos iniciados noutros painéis (ou cancelados com Esc) não passam pelos
  // tiles, pelo que o indicador precisa de ser limpo a partir da janela.
  window.addEventListener('dragend', onDragEnd);
  document.addEventListener('click', onQueueDocumentClick);
  document.addEventListener('keydown', onQueueDocumentKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('dragend', onDragEnd);
  document.removeEventListener('click', onQueueDocumentClick);
  document.removeEventListener('keydown', onQueueDocumentKeydown);
});
</script>

<template>
  <section
    v-if="activeTab"
    class="shrink-0 border-t border-lp-surface bg-lp-background/80"
    @dragover="onTrackDragOver"
    @drop="onTrackDrop"
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
        @dragleave="onTrackDragLeave"
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
          :class="[
            item.active
              ? 'border-lp-primary bg-lp-primary/20 text-lp-text shadow-[0_3px_0_0_var(--lp-color-primary)]'
              : 'border-lp-surface bg-lp-surface text-lp-muted hover:border-lp-primary/40 hover:text-lp-text',
            dropInsertIndex === index ? 'playlist-verse-tile--drop-before' : '',
            index === activeItems.length - 1 && dropInsertIndex === activeItems.length
              ? 'playlist-verse-tile--drop-after'
              : '',
          ]"
          :aria-pressed="item.active"
          :aria-label="item.label"
          @click="onItemClick(item, index)"
          @contextmenu.prevent="onQueueItemContextMenu($event, activeTab.id, item)"
          @keydown="onItemKeydown($event, item, index)"
          @dragstart="onQueueItemDragStart($event, activeTab.id, item)"
          @dragover="onTileDragOver($event, index)"
          @dragend="onDragEnd"
          @drop.stop="onTileDrop($event, index)"
        >
          <button
            v-if="isEditableTextItem(item)"
            type="button"
            class="absolute left-1 top-1 z-10 rounded bg-lp-background/80 p-1 text-lp-muted transition hover:bg-lp-primary/30 hover:text-lp-text"
            :title="editItemTitle(item)"
            :aria-label="editItemAriaLabel(item)"
            draggable="false"
            @click.stop="startEditingVerse(activeTab.id, item)"
            @pointerdown.stop
            @keydown.stop
          >
            <Pencil
              class="h-3.5 w-3.5"
              aria-hidden="true"
            />
          </button>
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
      <li v-if="queueMenuItem && isEditableTextItem(queueMenuItem)">
        <button
          type="button"
          class="w-full px-3 py-2 text-left hover:bg-lp-surface"
          role="menuitem"
          @click="onMenuEditVerse"
        >
          {{ editItemTitle(queueMenuItem) }}
        </button>
      </li>
      <li v-if="queueMenuCanMoveLeft">
        <button
          type="button"
          class="w-full px-3 py-2 text-left hover:bg-lp-surface"
          role="menuitem"
          @click="onMoveQueueItem(-1)"
        >
          {{ t('queueItem.moveLeft') }}
        </button>
      </li>
      <li v-if="queueMenuCanMoveRight">
        <button
          type="button"
          class="w-full px-3 py-2 text-left hover:bg-lp-surface"
          role="menuitem"
          @click="onMoveQueueItem(1)"
        >
          {{ t('queueItem.moveRight') }}
        </button>
      </li>
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
    <div
      v-if="editingItemId"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      @click.self="closeVerseEditor"
    >
      <form
        class="w-full max-w-2xl rounded-xl border border-lp-surface bg-lp-background p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        :aria-label="editorTitle"
        @submit.prevent="saveEditedVerse"
      >
        <h2 class="mb-1 text-lg font-semibold text-lp-text">
          {{ editorTitle }}
        </h2>
        <p class="mb-4 text-sm text-lp-muted">
          {{ editorHint }}
        </p>
        <textarea
          v-model="editingVerseText"
          class="min-h-56 w-full resize-y rounded-lg border border-lp-surface bg-lp-surface/40 p-3 font-mono text-sm text-lp-text outline-none focus:border-lp-primary"
          :aria-label="editorTextLabel"
          autofocus
        />
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-lp-surface px-4 py-2 text-sm text-lp-muted hover:bg-lp-surface"
            @click="closeVerseEditor"
          >
            {{ t('queueItem.cancelEdit') }}
          </button>
          <button
            type="submit"
            class="rounded-lg bg-lp-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!editingVerseText.trim()"
          >
            {{ t('queueItem.saveEdit') }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
