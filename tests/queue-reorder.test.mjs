#!/usr/bin/env node
/**
 * Regressão: reordenação da fila de projeção e das abas da playlist.
 *
 * Cobre as duas semânticas de índice (final vs. inserção) e o marcador MIME que
 * permite ao destino distinguir "reordenar" de "adicionar" durante `dragover`.
 */
import {
  insertIndexFromPointer,
  insertIndexToMoveIndex,
  moveListItem,
  moveListItemToInsertIndex,
} from '../dist/shared/list-reorder.js';
import {
  moveQueueItemToInsertIndex,
  parseTabDragPayload,
  QUEUE_DRAG_MIME,
  QUEUE_REORDER_MIME,
  reorderQueueItems,
  serializeTabDragPayload,
} from '../dist/shared/queue-items.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertOrder(items, expected, message) {
  const actual = items.map((item) => item.id).join(',');
  assert(actual === expected, `${message}: esperado [${expected}], obtido [${actual}]`);
}

function queue(...ids) {
  return ids.map((id) => ({ id, kind: 'music', label: id }));
}

/* --- índice final (moveListItem / reorderQueueItems) --- */

assertOrder(moveListItem(queue('a', 'b', 'c', 'd'), 0, 2), 'b,c,a,d', 'move para índice 2');
assertOrder(moveListItem(queue('a', 'b', 'c', 'd'), 3, 0), 'd,a,b,c', 'move do fim para o início');
assertOrder(moveListItem(queue('a', 'b', 'c'), 1, 1), 'a,b,c', 'índice igual não muda');

const stable = queue('a', 'b', 'c');
assert(moveListItem(stable, 1, 1) === stable, 'sem alteração devolve a mesma referência');
assert(moveListItem(stable, -1, 0) === stable, 'índice de origem inválido é ignorado');
assert(moveListItem(stable, 0, 3) === stable, 'índice final fora do domínio é ignorado');
assertOrder(reorderQueueItems(queue('a', 'b', 'c'), 2, 0), 'c,a,b', 'reorderQueueItems delega');

/* --- índice de inserção --- */

assert(insertIndexToMoveIndex(0, 0) === 0, 'inserir na própria posição');
assert(insertIndexToMoveIndex(0, 1) === 0, 'inserir logo após a origem não move');
assert(insertIndexToMoveIndex(0, 2) === 1, 'inserção à direita compensa a remoção');
assert(insertIndexToMoveIndex(3, 1) === 1, 'inserção à esquerda mantém o índice');

// Soltar sobre o item C (índice 2) coloca A imediatamente antes de C.
assertOrder(
  moveQueueItemToInsertIndex(queue('a', 'b', 'c', 'd'), 0, 2),
  'b,a,c,d',
  'inserir antes do terceiro item',
);
// Soltar na metade direita de C (inserção 3) coloca A depois de C.
assertOrder(
  moveQueueItemToInsertIndex(queue('a', 'b', 'c', 'd'), 0, 3),
  'b,c,a,d',
  'inserir depois do terceiro item',
);
assertOrder(
  moveQueueItemToInsertIndex(queue('a', 'b', 'c', 'd'), 0, 4),
  'b,c,d,a',
  'inserir no fim da fila',
);
assertOrder(
  moveQueueItemToInsertIndex(queue('a', 'b', 'c', 'd'), 3, 0),
  'd,a,b,c',
  'inserir no início da fila',
);
assertOrder(
  moveQueueItemToInsertIndex(queue('a', 'b', 'c'), 1, 99),
  'a,c,b',
  'inserção acima do tamanho é limitada ao fim',
);

const untouched = queue('a', 'b', 'c');
assert(
  moveQueueItemToInsertIndex(untouched, 1, 1) === untouched,
  'inserir na própria posição devolve a mesma referência',
);
assert(
  moveQueueItemToInsertIndex(untouched, 1, 2) === untouched,
  'inserir imediatamente à direita devolve a mesma referência',
);

/* --- abas da playlist usam a mesma primitiva --- */

const tabs = [{ id: 't1' }, { id: 't2' }, { id: 't3' }];
assertOrder(moveListItemToInsertIndex(tabs, 2, 0), 't3,t1,t2', 'aba para o início');
assertOrder(moveListItemToInsertIndex(tabs, 0, 3), 't2,t3,t1', 'aba para o fim');

/* --- índice de inserção a partir do ponteiro --- */

assert(insertIndexFromPointer(2, 10, 0, 100) === 2, 'metade inicial insere antes');
assert(insertIndexFromPointer(2, 90, 0, 100) === 3, 'metade final insere depois');
assert(insertIndexFromPointer(2, 50, 0, 100) === 3, 'centro exato insere depois');
assert(insertIndexFromPointer(2, 160, 120, 80) === 3, 'offset do elemento é respeitado');
assert(insertIndexFromPointer(4, 0, 0, 0) === 4, 'elemento sem largura não desloca');

/* --- payload de arrasto das abas --- */

const tabPayload = parseTabDragPayload(serializeTabDragPayload({ tabId: 'tab-7' }));
assert(tabPayload?.tabId === 'tab-7', 'ida e volta do payload de aba');
assert(parseTabDragPayload(null) === null, 'payload vazio rejeitado');
assert(parseTabDragPayload('{}') === null, 'payload sem tabId rejeitado');
assert(parseTabDragPayload('nao-json') === null, 'payload inválido rejeitado');

/* --- MIME marcador de reordenação --- */

assert(QUEUE_REORDER_MIME !== QUEUE_DRAG_MIME, 'marcador de reordenação é um tipo distinto');
assert(
  QUEUE_REORDER_MIME.startsWith('application/x-livepraise-'),
  'marcador usa o prefixo da aplicação',
);

console.log('queue-reorder: OK');
