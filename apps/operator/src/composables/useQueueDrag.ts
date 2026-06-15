import {
  parseQueueDragPayload,
  QUEUE_DRAG_MIME,
  queueItemFromPayload,
  serializeQueueDragPayload,
  type QueueDragPayload,
  type QueueItem,
} from '@shared/queue-items';
import { usePreferences } from './usePreferences';

function readQueueDragPayload(dataTransfer: DataTransfer | null): QueueDragPayload | null {
  if (!dataTransfer) return null;
  const raw = dataTransfer.getData(QUEUE_DRAG_MIME);
  return parseQueueDragPayload(raw || null);
}

export function useQueueDrag() {
  const {
    prefs,
    setActiveTab,
    addQueueItem,
    moveQueueItemInTab,
    reorderQueueItemsInTab,
  } = usePreferences();

  function onDragStart(event: DragEvent, payload: QueueDragPayload): void {
    const dt = event.dataTransfer;
    if (!dt) return;
    dt.setData(QUEUE_DRAG_MIME, serializeQueueDragPayload(payload));
    dt.effectAllowed = payload.sourceItemId ? 'move' : 'copy';
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
    const dt = event.dataTransfer;
    if (!dt) return;
    const payload = readQueueDragPayload(dt);
    dt.dropEffect = payload?.sourceItemId ? 'move' : 'copy';
  }

  function handleDropOnTab(event: DragEvent, tabId: string): void {
    event.preventDefault();
    event.stopPropagation();
    const payload = readQueueDragPayload(event.dataTransfer);
    if (!payload) return;

    setActiveTab(tabId);

    if (payload.sourceItemId && payload.sourceTabId) {
      const tab = prefs.value.chromeTabs.find((t) => t.id === tabId);
      if (!tab?.items) return;
      if (payload.sourceTabId === tabId) {
        const fromIndex = tab.items.findIndex((i) => i.id === payload.sourceItemId);
        if (fromIndex >= 0 && fromIndex !== tab.items.length - 1) {
          reorderQueueItemsInTab(tabId, fromIndex, tab.items.length - 1);
        }
      } else {
        moveQueueItemInTab(payload.sourceTabId, payload.sourceItemId, tabId);
      }
      return;
    }

    addQueueItem(tabId, queueItemFromPayload(payload));
  }

  function handleDropOnQueueStrip(
    event: DragEvent,
    tabId: string,
    dropIndex: number,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    const payload = readQueueDragPayload(event.dataTransfer);
    if (!payload) return;

    setActiveTab(tabId);

    if (payload.sourceItemId && payload.sourceTabId) {
      const tab = prefs.value.chromeTabs.find((t) => t.id === tabId);
      if (!tab?.items) return;
      if (payload.sourceTabId === tabId) {
        const fromIndex = tab.items.findIndex((i) => i.id === payload.sourceItemId);
        if (fromIndex < 0) return;
        const clamped = Math.max(0, Math.min(dropIndex, tab.items.length - 1));
        if (fromIndex !== clamped) {
          reorderQueueItemsInTab(tabId, fromIndex, clamped);
        }
      } else {
        moveQueueItemInTab(
          payload.sourceTabId,
          payload.sourceItemId,
          tabId,
          dropIndex,
        );
      }
      return;
    }

    addQueueItem(tabId, queueItemFromPayload(payload), dropIndex);
  }

  function onQueueItemDragStart(
    event: DragEvent,
    tabId: string,
    item: QueueItem,
  ): void {
    onDragStart(event, {
      kind: item.kind,
      label: item.label,
      text: item.text,
      verseId: item.verseId,
      songId: item.songId,
      songName: item.songName,
      artist: item.artist,
      bibleFile: item.bibleFile,
      bookId: item.bookId,
      bookName: item.bookName,
      chapter: item.chapter,
      verseNum: item.verseNum,
      mediaPath: item.mediaPath,
      thumbPath: item.thumbPath,
      sourceItemId: item.id,
      sourceTabId: tabId,
    });
  }

  return {
    onDragStart,
    onDragOver,
    handleDropOnTab,
    handleDropOnQueueStrip,
    onQueueItemDragStart,
  };
}
