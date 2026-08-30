#!/usr/bin/env node
import { Database } from '../../dist/server/db/sqlite.js';
import {
  getOperatorQueueState,
  updateOperatorQueueState,
} from '../../dist/core/operator-queue/store.js';
import { sanitizeOperatorQueueTabs } from '../../dist/shared/types/operator-queue.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tabs = sanitizeOperatorQueueTabs([
  {
    id: 'tab-1',
    label: 'Culto',
    items: [{
      id: 'item-1',
      kind: 'music',
      label: 'Verso 1',
      text: 'Santo, santo',
      active: true,
      youtubeImportJobId: 'efemero',
    }],
  },
]);
assert(tabs?.length === 1, 'sanitiza snapshot válido');
assert(!('active' in tabs[0].items[0]), 'remove seleção local do item');
assert(!('youtubeImportJobId' in tabs[0].items[0]), 'remove estado efémero');
assert(sanitizeOperatorQueueTabs([{ id: '', label: 'X', items: [] }]) === null, 'rejeita tab sem id');

const db = new Database(':memory:');
db.exec(`
  CREATE TABLE operator_queue_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    enabled INTEGER NOT NULL DEFAULT 0,
    revision INTEGER NOT NULL DEFAULT 0,
    payload TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT,
    updated_by TEXT
  );
  INSERT INTO operator_queue_state (id) VALUES (1);
`);

const initial = getOperatorQueueState(db);
assert(!initial.enabled && initial.revision === 0, 'estado inicial desabilitado');

const enabled = updateOperatorQueueState(db, {
  expectedRevision: 0,
  enabled: true,
  tabs,
  updatedBy: 'admin',
});
assert(enabled.ok, 'habilita fila');
assert(enabled.state.enabled && enabled.state.revision === 1, 'incrementa revisão');
assert(enabled.state.tabs[0]?.items[0]?.text === 'Santo, santo', 'persiste conteúdo');

const conflict = updateOperatorQueueState(db, {
  expectedRevision: 0,
  enabled: true,
  tabs: [],
  updatedBy: 'operador-atrasado',
});
assert(!conflict.ok && conflict.reason === 'conflict', 'rejeita revisão antiga');
assert(conflict.state.tabs.length === 1, 'conflito devolve estado autoritativo');

const disabled = updateOperatorQueueState(db, {
  expectedRevision: 1,
  enabled: false,
  updatedBy: 'admin',
});
assert(disabled.ok && !disabled.state.enabled, 'desabilita fila');
assert(disabled.state.tabs.length === 1, 'desabilitar conserva último snapshot');

db.close();
console.log('OK — operator queue store, sanitização e conflitos');
