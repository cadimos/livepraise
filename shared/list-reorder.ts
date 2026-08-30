/**
 * Reordenação de listas para drag-and-drop (fila de projeção e abas da playlist).
 *
 * Duas semânticas de índice convivem no drag-and-drop e confundir-se entre elas é
 * a origem clássica do erro de uma posição:
 *
 * - **índice final** (`toIndex`): posição que o elemento movido ocupa depois da
 *   remoção. Domínio válido: `0 … length - 1`.
 * - **índice de inserção** (`insertIndex`): posição *antes* do elemento que
 *   atualmente ocupa esse índice, com a lista ainda intacta. Domínio válido:
 *   `0 … length`, onde `length` significa "no fim".
 */

/** Move um elemento para o índice final `toIndex`. Devolve a lista original se nada muda. */
export function moveListItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return items;
  if (fromIndex < 0 || fromIndex >= items.length) return items;
  if (toIndex < 0 || toIndex >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved!);
  return next;
}

/** Converte um índice de inserção no índice final do elemento movido. */
export function insertIndexToMoveIndex(fromIndex: number, insertIndex: number): number {
  return insertIndex > fromIndex ? insertIndex - 1 : insertIndex;
}

/** Move um elemento para um índice de inserção (`length` = fim da lista). */
export function moveListItemToInsertIndex<T>(
  items: T[],
  fromIndex: number,
  insertIndex: number,
): T[] {
  if (fromIndex < 0 || fromIndex >= items.length) return items;
  const clamped = Math.max(0, Math.min(insertIndex, items.length));
  return moveListItem(items, fromIndex, insertIndexToMoveIndex(fromIndex, clamped));
}

/**
 * Índice de inserção derivado da posição do cursor sobre o elemento `index`:
 * metade inicial insere antes, metade final insere depois.
 */
export function insertIndexFromPointer(
  index: number,
  pointer: number,
  start: number,
  size: number,
): number {
  if (size <= 0) return index;
  return pointer - start >= size / 2 ? index + 1 : index;
}
