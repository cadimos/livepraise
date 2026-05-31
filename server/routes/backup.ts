import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import multer from 'multer';
import {
  applyRestore,
  createBackupZip,
  destGroupHasData,
  groupsNeedingOverwrite,
  inspectBackupZip,
  normalizeGroupIds,
  BACKUP_GROUPS,
  BackupError,
  estimateGroupBytes,
  type BackupGroupId,
} from '../backup/index.js';
import { getLivepraiseHome } from '../config/paths.js';
import { requireAdminAccess } from '../middleware/auth.js';
import { allowCors, jsonError } from '../middleware/common.js';

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 1024 * 1024 * 1024 },
});

function handleBackupError(res: Response, err: unknown): void {
  if (err instanceof BackupError) {
    const status =
      err.code === 'confirm_required'
        ? 409
        : err.code === 'migration_newer' || err.code === 'invalid_zip'
          ? 400
          : err.code === 'permission_denied'
            ? 403
            : 500;
    jsonError(res, status, err.message, err.code);
    return;
  }
  const code = (err as Error & { code?: string })?.code;
  if (code === 'confirm_overwrite_required') {
    jsonError(res, 409, (err as Error).message, 'confirm_required');
    return;
  }
  if ((err as Error).message?.includes('versão mais recente')) {
    jsonError(res, 400, (err as Error).message, 'migration_newer');
    return;
  }
  console.error('[backup]', err);
  jsonError(res, 500, 'Falha na operação de backup.');
}

function writeOperatorUiDir(
  files: { name: string; content: string }[],
): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-operator-ui-'));
  for (const file of files) {
    fs.writeFileSync(path.join(dir, file.name), file.content, 'utf8');
  }
  return dir;
}

export function createBackupRouter(): Router {
  const api = Router();
  api.use(requireAdminAccess);

  api.post('/preview', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    try {
      const groups = normalizeGroupIds(req.body?.groups);
      if (groups.length === 0) {
        throw new BackupError('Seleccione pelo menos um grupo.', 'invalid_groups');
      }
      const estimates = groups.map((id) => ({
        id,
        bytes: estimateGroupBytes(id),
      }));
      res.json({
        status: 'Sucesso',
        estimates,
        totalBytes: estimates.reduce((s, e) => s + e.bytes, 0),
      });
    } catch (err) {
      handleBackupError(res, err);
    }
  });

  api.post('/create', async (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    let operatorUiDir: string | undefined;
    try {
      const groups = normalizeGroupIds(req.body?.groups);
      if (groups.length === 0) {
        throw new BackupError('Seleccione pelo menos um grupo.', 'invalid_groups');
      }
      const operatorUiFiles = (req.body?.operatorUiFiles ?? []) as {
        name: string;
        content: string;
      }[];
      if (operatorUiFiles.length > 0) {
        operatorUiDir = writeOperatorUiDir(operatorUiFiles);
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="livepraise-backup.zip"',
      );

      const result = await createBackupZip({
        groups,
        outputStream: res,
        operatorUiDir,
      });
      res.setHeader('X-Livepraise-Backup-Groups', result.groups.join(','));
      res.setHeader('X-Livepraise-Backup-Bytes', String(result.bytes));
    } catch (err) {
      if (!res.headersSent) handleBackupError(res, err);
    } finally {
      if (operatorUiDir) fs.rmSync(operatorUiDir, { recursive: true, force: true });
    }
  });

  return api;
}

export function createRestoreRouter(): Router {
  const api = Router();
  api.use(requireAdminAccess);

  api.post('/inspect', upload.single('file'), async (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const file = req.file;
    if (!file) {
      jsonError(res, 400, 'Ficheiro .zip obrigatório.');
      return;
    }
    try {
      const inspected = await inspectBackupZip(file.path);
      res.json({
        status: 'Sucesso',
        manifest: inspected.manifest,
        presentGroups: inspected.groupsPresent,
        absentGroups: inspected.groupsAbsent,
        allGroups: Object.keys(BACKUP_GROUPS),
        tempZipPath: file.path,
      });
    } catch (err) {
      fs.unlink(file.path, () => {});
      handleBackupError(res, err);
    }
  });

  api.post('/overwrite-check', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    try {
      const groups = normalizeGroupIds(req.body?.groups);
      const home = req.body?.targetHome as string | undefined;
      const targets = groups.filter((g) => destGroupHasData(g, home));
      res.json({ status: 'Sucesso', groups: targets });
    } catch (err) {
      handleBackupError(res, err);
    }
  });

  api.post('/apply', async (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const zipPath = String(req.body?.zipPath ?? '').trim();
    if (!zipPath || !fs.existsSync(zipPath)) {
      jsonError(res, 400, 'Caminho do backup inválido.');
      return;
    }
    try {
      const groups = normalizeGroupIds(req.body?.groups);
      if (groups.length === 0) {
        throw new BackupError('Seleccione pelo menos um grupo.', 'invalid_groups');
      }
      const confirmOverwrite = Boolean(
        req.body?.confirmOverwrite ?? req.body?.overwriteAck,
      );
      const result = await applyRestore({
        zipPath,
        groups,
        confirmOverwrite,
        targetHome: req.body?.targetHome
          ? String(req.body.targetHome)
          : undefined,
      });
      fs.unlink(zipPath, () => {});
      res.json({
        status: 'Sucesso',
        appliedGroups: result.restoredGroups,
        databaseRestored: result.databaseRestored,
        operatorUiFiles: result.operatorUiFiles,
        needsRelogin: result.sessionsInvalidated,
      });
    } catch (err) {
      handleBackupError(res, err);
    }
  });

  return api;
}
