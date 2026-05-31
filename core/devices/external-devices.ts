import type { Database } from '../../server/db/connection.js';
import type { DisplayScreenSize } from '../../shared/types/live.js';

export type ExternalDisplayProfile =
  | 'live'
  | 'vocal'
  | 'stage'
  | 'player'
  | 'projection';

export interface ExternalDeviceRow {
  device_id: string;
  profile: ExternalDisplayProfile;
  show_chords: number;
  label: string | null;
  screen_size: string | null;
  last_seen_at: string;
}

export interface ExternalDevice {
  deviceId: string;
  profile: ExternalDisplayProfile;
  showChords: boolean;
  label: string | null;
  screenSize: DisplayScreenSize | null;
  lastSeenAt: string;
}

const PROFILES = new Set<string>([
  'live',
  'vocal',
  'stage',
  'player',
  'projection',
]);

export function isExternalDisplayProfile(
  value: string,
): value is ExternalDisplayProfile {
  return PROFILES.has(value);
}

function parseScreenSize(raw: string | null): DisplayScreenSize | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DisplayScreenSize>;
    if (!parsed || typeof parsed !== 'object' || !parsed.preset) return null;
    return parsed as DisplayScreenSize;
  } catch {
    return null;
  }
}

function serializeScreenSize(
  screenSize: DisplayScreenSize | null | undefined,
): string | null {
  if (!screenSize) return null;
  return JSON.stringify(screenSize);
}

function rowToDevice(row: ExternalDeviceRow): ExternalDevice {
  return {
    deviceId: row.device_id,
    profile: row.profile,
    showChords: row.show_chords !== 0,
    label: row.label,
    screenSize: parseScreenSize(row.screen_size),
    lastSeenAt: row.last_seen_at,
  };
}

export function getExternalDevice(
  db: Database,
  deviceId: string,
): ExternalDevice | null {
  const row = db
    .prepare(
      `SELECT device_id, profile, show_chords, label, screen_size, last_seen_at
       FROM external_devices WHERE device_id = ?`,
    )
    .get(deviceId) as ExternalDeviceRow | undefined;
  return row ? rowToDevice(row) : null;
}

export function listExternalDevices(db: Database): ExternalDevice[] {
  const rows = db
    .prepare(
      `SELECT device_id, profile, show_chords, label, screen_size, last_seen_at
       FROM external_devices ORDER BY last_seen_at DESC`,
    )
    .all() as unknown as ExternalDeviceRow[];
  return rows.map(rowToDevice);
}

export function touchExternalDevice(
  db: Database,
  deviceId: string,
  profile: ExternalDisplayProfile,
): ExternalDevice {
  const existing = getExternalDevice(db, deviceId);
  if (existing) {
    db.prepare(
      `UPDATE external_devices
       SET last_seen_at = datetime('now'), profile = ?
       WHERE device_id = ?`,
    ).run(profile, deviceId);
    return getExternalDevice(db, deviceId)!;
  }

  db.prepare(
    `INSERT INTO external_devices (device_id, profile, show_chords, label, screen_size, last_seen_at)
     VALUES (?, ?, 1, NULL, NULL, datetime('now'))`,
  ).run(deviceId, profile);

  return getExternalDevice(db, deviceId)!;
}

export function patchExternalDevice(
  db: Database,
  deviceId: string,
  patch: {
    showChords?: boolean;
    label?: string | null;
    screenSize?: DisplayScreenSize | null;
  },
): ExternalDevice | null {
  const existing = getExternalDevice(db, deviceId);
  if (!existing) return null;

  const showChords =
    patch.showChords === undefined ? existing.showChords : patch.showChords;
  const label =
    patch.label === undefined ? existing.label : patch.label?.trim() || null;
  const screenSize =
    patch.screenSize === undefined ? existing.screenSize : patch.screenSize;

  db.prepare(
    `UPDATE external_devices
     SET show_chords = ?, label = ?, screen_size = ?, last_seen_at = datetime('now')
     WHERE device_id = ?`,
  ).run(showChords ? 1 : 0, label, serializeScreenSize(screenSize), deviceId);

  return getExternalDevice(db, deviceId);
}
