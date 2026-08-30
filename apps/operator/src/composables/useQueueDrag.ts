import {
  parseQueueDragPayload,
  QUEUE_DRAG_MIME,
  QUEUE_REORDER_MIME,
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

/**
 * Durante `dragover` o DataTransfer está em modo protegido e `getData()` devolve
 * sempre string vazia — só a lista de tipos é legível. A intenção do arrasto viaja
 * por isso num tipo MIME marcador em vez do payload.
 */
function hasType(dataTransfer: DataTransfer, type: string): boolean {
  return Array.prototype.includes.call(dataTransfer.types, type) as boolean;
}

export function useQueueDrag() {
  const {
    setActiveTab,
    addQueueItem,
    getTabItems,
    moveQueueItemInTab,
    moveQueueItemToIndex,
  } = usePreferences();

  function onDragStart(event: DragEvent, payload: QueueDragPayload): void {
    const dt = event.dataTransfer;
    if (!dt) return;
    dt.setData(QUEUE_DRAG_MIME, serializeQueueDragPayload(payload));
    if (payload.sourceItemId) dt.setData(QUEUE_REORDER_MIME, payload.sourceItemId);
    // `copyMove` cobre ambos os efeitos, pelo que qualquer `dropEffect` que o
    // destino escolha é compatível e o evento `drop` chega a disparar.
    dt.effectAllowed = 'copyMove';
  }

  function onDragOver(event: DragEvent): void {
    const dt = event.dataTransfer;
    if (!dt || !hasType(dt, QUEUE_DRAG_MIME)) return;
    event.preventDefault();
    dt.dropEffect = hasType(dt, QUEUE_REORDER_MIME) ? 'move' : 'copy';
  }

  function handleDropOnTab(event: DragEvent, tabId: string): void {
    const dt = event.dataTransfer;
    if (dt && !hasType(dt, QUEUE_DRAG_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    const payload = readQueueDragPayload(dt);
    if (!payload) return;

    setActiveTab(tabId);

    if (payload.sourceItemId && payload.sourceTabId) {
      if (payload.sourceTabId === tabId) {
        const items = getTabItems(tabId);
        if (!items) return;
        moveQueueItemToIndex(tabId, payload.sourceItemId, items.length);
      } else {
        moveQueueItemInTab(payload.sourceTabId, payload.sourceItemId, tabId);
      }
      return;
    }

    addQueueItem(tabId, queueItemFromPayload(payload));
  }

  /** `insertIndex` é a posição *antes* do item nesse índice (`length` = fim da fila). */
  function handleDropOnQueueStrip(
    event: DragEvent,
    tabId: string,
    insertIndex: number,
  ): void {
    const dt = event.dataTransfer;
    if (dt && !hasType(dt, QUEUE_DRAG_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    const payload = readQueueDragPayload(dt);
    if (!payload) return;

    setActiveTab(tabId);

    if (payload.sourceItemId && payload.sourceTabId) {
      if (payload.sourceTabId === tabId) {
        moveQueueItemToIndex(tabId, payload.sourceItemId, insertIndex);
      } else {
        moveQueueItemInTab(
          payload.sourceTabId,
          payload.sourceItemId,
          tabId,
          insertIndex,
        );
      }
      return;
    }

    addQueueItem(tabId, queueItemFromPayload(payload), insertIndex);
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
