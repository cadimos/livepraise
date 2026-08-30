-- Estado global opcional da fila compartilhada entre operadores.

CREATE TABLE IF NOT EXISTS operator_queue_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  revision INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT,
  updated_by TEXT
);

INSERT OR IGNORE INTO operator_queue_state (id, enabled, revision, payload)
VALUES (1, 0, 0, '[]');
