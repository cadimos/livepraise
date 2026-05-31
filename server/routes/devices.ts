import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  getExternalDevice,
  isExternalDisplayProfile,
  listExternalDevices,
  patchExternalDevice,
  touchExternalDevice,
} from '../../core/devices/external-devices.js';
import type { DisplayScreenSize } from '../../shared/types/live.js';
import { getMainDb } from '../db/connection.js';
import { jsonError } from '../middleware/common.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROFILE_HINT =
  'profile inválido (live|vocal|stage|player|projection)';

function parseDeviceId(raw: string): string | null {
  const id = raw.trim();
  return UUID_RE.test(id) ? id : null;
}

function parseScreenSizeBody(raw: unknown): DisplayScreenSize | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== 'object' || raw === null || !('preset' in raw)) {
    return undefined;
  }
  return raw as DisplayScreenSize;
}

export function createDevicesRouter(): Router {
  const api = Router();
  const db = getMainDb();

  api.get('/', (_req: Request, res: Response) => {
    res.json({ status: 'successo', devices: listExternalDevices(db) });
  });

  api.get('/:deviceId', (req: Request, res: Response) => {
    const deviceId = parseDeviceId(String(req.params.deviceId ?? ''));
    if (!deviceId) {
      jsonError(res, 400, 'deviceId inválido (UUID v4 esperado)');
      return;
    }

    const profileRaw = String(req.query.profile ?? '').trim();
    let device = getExternalDevice(db, deviceId);

    if (!device && profileRaw) {
      if (!isExternalDisplayProfile(profileRaw)) {
        jsonError(res, 400, PROFILE_HINT);
        return;
      }
      device = touchExternalDevice(db, deviceId, profileRaw);
    } else if (device && profileRaw && isExternalDisplayProfile(profileRaw)) {
      device = touchExternalDevice(db, deviceId, profileRaw);
    } else if (device) {
      db.prepare(
        `UPDATE external_devices SET last_seen_at = datetime('now') WHERE device_id = ?`,
      ).run(deviceId);
      device = getExternalDevice(db, deviceId)!;
    }

    if (!device) {
      jsonError(
        res,
        404,
        'Dispositivo não registado; envie ?profile=live|vocal|stage|player|projection',
      );
      return;
    }

    res.json({ status: 'successo', device });
  });

  api.patch('/:deviceId', (req: Request, res: Response) => {
    const deviceId = parseDeviceId(String(req.params.deviceId ?? ''));
    if (!deviceId) {
      jsonError(res, 400, 'deviceId inválido (UUID v4 esperado)');
      return;
    }

    const profileRaw = String(req.body.profile ?? req.query.profile ?? '').trim();
    if (profileRaw) {
      if (!isExternalDisplayProfile(profileRaw)) {
        jsonError(res, 400, PROFILE_HINT);
        return;
      }
      touchExternalDevice(db, deviceId, profileRaw);
    }

    const patch: {
      showChords?: boolean;
      label?: string | null;
      screenSize?: DisplayScreenSize | null;
    } = {};
    if (req.body.showChords !== undefined) {
      patch.showChords = Boolean(req.body.showChords);
    }
    if (req.body.label !== undefined) {
      patch.label =
        req.body.label === null || req.body.label === ''
          ? null
          : String(req.body.label);
    }
    const screenSize = parseScreenSizeBody(req.body.screenSize);
    if (screenSize === undefined && req.body.screenSize !== undefined) {
      jsonError(res, 400, 'screenSize inválido');
      return;
    }
    if (screenSize !== undefined) {
      patch.screenSize = screenSize;
    }

    const updated = patchExternalDevice(db, deviceId, patch);
    if (!updated) {
      jsonError(
        res,
        404,
        'Dispositivo não encontrado; registe primeiro via GET com profile',
      );
      return;
    }

    res.json({ status: 'successo', device: updated });
  });

  return api;
}

/** Gera UUID v4 para testes/smoke quando localStorage não está disponível. */
export function newDeviceId(): string {
  return randomUUID();
}
