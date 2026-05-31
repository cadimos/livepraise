-- Projetor remoto (/projector) e tamanho de tela por dispositivo externo

CREATE TABLE external_devices_new (
  device_id TEXT PRIMARY KEY,
  profile TEXT NOT NULL CHECK (profile IN ('live', 'vocal', 'stage', 'player', 'projection')),
  show_chords INTEGER NOT NULL DEFAULT 1,
  label TEXT,
  screen_size TEXT,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO external_devices_new (device_id, profile, show_chords, label, screen_size, last_seen_at)
  SELECT device_id, profile, show_chords, label, NULL, last_seen_at
  FROM external_devices;

DROP TABLE external_devices;

ALTER TABLE external_devices_new RENAME TO external_devices;

CREATE INDEX IF NOT EXISTS idx_external_devices_profile ON external_devices (profile);
CREATE INDEX IF NOT EXISTS idx_external_devices_last_seen ON external_devices (last_seen_at);
