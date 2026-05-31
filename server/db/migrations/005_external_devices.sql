-- Monitores externos (browser): /vocal, /stage, /player (CAD-129)

CREATE TABLE IF NOT EXISTS external_devices (
  device_id TEXT PRIMARY KEY,
  profile TEXT NOT NULL CHECK (profile IN ('vocal', 'stage', 'player')),
  show_chords INTEGER NOT NULL DEFAULT 1,
  label TEXT,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_external_devices_profile ON external_devices (profile);
CREATE INDEX IF NOT EXISTS idx_external_devices_last_seen ON external_devices (last_seen_at);
