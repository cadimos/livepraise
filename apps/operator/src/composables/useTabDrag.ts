import {
  parseTabDragPayload,
  serializeTabDragPayload,
  TAB_DRAG_MIME,
} from '@shared/queue-items';
import { usePreferences } from './usePreferences';

function hasTabDragType(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  return Array.prototype.includes.call(dataTransfer.types, TAB_DRAG_MIME) as boolean;
}

/** Reordenação das abas da playlist (cada aba é uma música/fila). */
export function useTabDrag() {
  const { moveChromeTabToIndex } = usePreferences();

  function onTabDragStart(event: DragEvent, tabId: string): void {
    const dt = event.dataTransfer;
    if (!dt) return;
    dt.setData(TAB_DRAG_MIME, serializeTabDragPayload({ tabId }));
    dt.effectAllowed = 'copyMove';
  }

  function isTabDrag(event: DragEvent): boolean {
    return hasTabDragType(event.dataTransfer);
  }

  function onTabDragOver(event: DragEvent): boolean {
    const dt = event.dataTransfer;
    if (!hasTabDragType(dt)) return false;
    event.preventDefault();
    dt!.dropEffect = 'move';
    return true;
  }

  /** `insertIndex` é a posição *antes* da aba nesse índice (`length` = fim). */
  function handleTabDrop(event: DragEvent, insertIndex: number): boolean {
    const dt = event.dataTransfer;
    if (!hasTabDragType(dt)) return false;
    event.preventDefault();
    event.stopPropagation();
    const payload = parseTabDragPayload(dt!.getData(TAB_DRAG_MIME) || null);
    if (!payload) return true;
    moveChromeTabToIndex(payload.tabId, insertIndex);
    return true;
  }

  return { onTabDragStart, isTabDrag, onTabDragOver, handleTabDrop };
}
