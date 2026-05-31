-- CAD-119: papel de conta `admin` (distinto de `operator`).

PRAGMA foreign_keys = OFF;

CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('operator', 'remote', 'admin')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO users_new (id, username, password_hash, role, active, created_at, updated_at)
SELECT
  id,
  username,
  password_hash,
  CASE
    WHEN username = 'admin' COLLATE NOCASE AND role = 'operator' THEN 'admin'
    ELSE role
  END,
  active,
  created_at,
  updated_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

PRAGMA foreign_keys = ON;
