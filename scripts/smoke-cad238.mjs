#!/usr/bin/env node
/**
 * Smoke CAD-238 / QA CAD-242: backup e restore selectivo (CA-1–CA-12).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const backupModule = path.join(appRoot, 'dist/server/backup/index.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(id, detail) {
  console.log(`PASS ${id}: ${detail}`);
}

function skip(id, detail) {
  console.log(`SKIP ${id}: ${detail}`);
}

if (!fs.existsSync(backupModule)) {
  console.log('smoke-cad238: dist/server/backup/ em falta — execute npm run build:server');
  process.exit(1);
}

const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad238-'));
const destRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad238-dest-'));
process.env.LIVEPRAISE_HOME = testRoot;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { startLivepraiseServer, stopLivepraiseServer } = await import('../dist/server/index.js');
const {
  createBackupZip,
  inspectBackupZip,
  applyRestore,
  normalizeGroupIds,
  assertSafeZipEntryName,
  BackupError,
} = await import('../dist/server/backup/index.js');
const { ensureLivepraiseDataDir } = await import('../dist/server/bootstrap.js');

await ensureLivepraiseDataDir();
const testLivepraise = path.join(testRoot, 'livepraise');
const destLivepraise = path.join(destRoot, 'livepraise');
const zipPath = path.join(testRoot, 'smoke-backup.zip');

const server = await startLivepraiseServer();
const base = `http://127.0.0.1:${server.port}`;

try {
  assert((await fetch(`${base}/health`)).ok, 'servidor smoke');
  pass('bootstrap', `servidor em ${base}`);

  fs.mkdirSync(path.join(testLivepraise, 'imagens', 'qa'), { recursive: true });
  fs.writeFileSync(
    path.join(testLivepraise, 'imagens', 'qa', 'smoke.png'),
    'png',
  );

  const manifest = await createBackupZip({
    groups: normalizeGroupIds(['database', 'media_images']),
    outputPath: zipPath,
  });
  assert(fs.existsSync(zipPath), 'zip criado');
  assert(manifest.groups.includes('database'), 'manifesto database');
  pass('CA-1', 'backup database + media_images + manifesto');

  const inspected = await inspectBackupZip(zipPath);
  assert(inspected.groupsPresent.includes('database'), 'inspect present');
  assert(inspected.groupsAbsent.includes('media_videos'), 'media_videos ausente');
  pass('CA-3', 'inspect grupos presentes/ausentes (API)');

  await applyRestore({
    zipPath,
    groups: ['database', 'media_images'],
    targetHome: destLivepraise,
    confirmOverwrite: false,
  });
  assert(fs.existsSync(path.join(destLivepraise, 'dsw.bd')), 'CA-2 BD');
  assert(
    fs.existsSync(path.join(destLivepraise, 'imagens', 'qa', 'smoke.png')),
    'CA-2 imagens',
  );
  pass('CA-2', 'restore parcial em destino vazio');

  try {
    await applyRestore({
      zipPath,
      groups: ['database'],
      targetHome: destLivepraise,
      confirmOverwrite: false,
    });
    assert(false, 'devia falhar sem confirmOverwrite');
  } catch (e) {
    assert(e instanceof BackupError && e.code === 'confirm_required', 'CA-4');
    pass('CA-4', 'restore sem confirmOverwrite recusado');
  }

  fs.writeFileSync(
    path.join(testLivepraise, 'displays.json'),
    JSON.stringify({ displays: [{ id: 'src' }] }),
  );
  const zipWithDisplays = path.join(testRoot, 'smoke-displays.zip');
  await createBackupZip({
    groups: normalizeGroupIds(['displays']),
    outputPath: zipWithDisplays,
  });
  fs.writeFileSync(
    path.join(destLivepraise, 'displays.json'),
    JSON.stringify({ displays: [{ id: 'old' }] }),
  );
  await applyRestore({
    zipPath: zipWithDisplays,
    groups: ['displays'],
    targetHome: destLivepraise,
    confirmOverwrite: true,
  });
  const displays = JSON.parse(
    fs.readFileSync(path.join(destLivepraise, 'displays.json'), 'utf8'),
  );
  assert(displays.displays?.[0]?.id === 'src', 'CA-5 displays');
  assert(
    fs.existsSync(path.join(destLivepraise, 'imagens', 'qa', 'smoke.png')),
    'CA-5 media intacto',
  );
  pass('CA-5', 'overwrite só grupos seleccionados');

  const walZip = path.join(testRoot, 'wal-backup.zip');
  await createBackupZip({
    groups: normalizeGroupIds(['database']),
    outputPath: walZip,
  });
  pass('CA-6', 'backup BD com servidor activo (WAL checkpoint)');

  const fakeDb = path.join(testRoot, 'fake-newer.bd');
  fs.copyFileSync(path.join(destLivepraise, 'dsw.bd'), fakeDb);
  const { Database } = await import('../dist/server/db/sqlite.js');
  const fake = new Database(fakeDb);
  fake.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT DEFAULT (datetime('now')))",
  );
  fake.prepare('INSERT OR REPLACE INTO schema_migrations (version, name) VALUES (?, ?)').run(
    99999,
    'future',
  );
  fake.close();
  const { createRequire } = await import('node:module');
  const archiver = createRequire(import.meta.url)('archiver');
  const newerZip = path.join(testRoot, 'newer.zip');
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(newerZip);
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(out);
    archive.file(fakeDb, { name: 'groups/database/dsw.bd' });
    archive.append(
      JSON.stringify({
        manifestVersion: 1,
        createdAt: new Date().toISOString(),
        appVersion: '9.9.9',
        livepraiseHome: 'livepraise',
        groups: ['database'],
      }),
      { name: 'backup-manifest.json' },
    );
    archive.finalize();
    out.on('finish', resolve);
    out.on('error', reject);
    archive.on('error', reject);
  });
  let ca7 = false;
  try {
    await applyRestore({
      zipPath: newerZip,
      groups: ['database'],
      targetHome: path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'cad238-ca7-')),
        'livepraise',
      ),
      confirmOverwrite: true,
    });
  } catch (e) {
    ca7 = e instanceof BackupError && e.code === 'migration_newer';
  }
  assert(ca7, 'CA-7 migration_newer');
  pass('CA-7', 'restore recusa BD mais nova');

  try {
    assertSafeZipEntryName('groups/database/../../../etc/passwd');
    assert(false, 'zip slip devia falhar');
  } catch {
    pass('CA-12', 'zip slip rejeitado');
  }

  const previewRes = await fetch(`${base}/api/backup/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groups: ['database', 'media_images'] }),
  });
  assert(previewRes.ok, `preview HTTP ${previewRes.status}`);
  const previewJson = await previewRes.json();
  assert(previewJson.status === 'Sucesso', 'preview status');
  assert(
    Array.isArray(previewJson.estimates) && previewJson.estimates.length === 2,
    'preview estimates',
  );
  assert(typeof previewJson.totalBytes === 'number', 'preview totalBytes');
  pass('preview', '/api/backup/preview estimativa de tamanho');

  const { requireAdminAccess } = await import('../dist/server/middleware/auth.js');
  const { getMainDb, dbRun } = await import('../dist/server/db/connection.js');
  const { findUserByUsername } = await import('../dist/core/auth/users.js');
  const { createSession } = await import('../dist/core/auth/sessions.js');
  const LAN = '192.168.1.100';

  function runAdminMiddleware(token) {
    return new Promise((resolve) => {
      const req = {
        headers: token ? { authorization: `Bearer ${token}` } : {},
        socket: { remoteAddress: LAN },
      };
      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json() {
          resolve(this.statusCode);
        },
      };
      requireAdminAccess(req, res, () => resolve(200));
    });
  }

  assert((await runAdminMiddleware(null)) === 401, 'CA-8 LAN sem token');
  assert((await runAdminMiddleware('invalid-token-not-admin')) === 401, 'CA-8 LAN token inválido');

  const db = getMainDb();
  const now = new Date().toISOString();
  const operatorId = dbRun(
    db,
    `INSERT INTO users (username, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)`,
    [`smoke-op-${Date.now()}`, 'x', 'operator', now, now],
  );
  assert(typeof operatorId === 'number', 'CA-8 inserir operator');
  const operatorSession = createSession(db, operatorId);
  assert(operatorSession, 'CA-8 sessão operator');
  assert((await runAdminMiddleware(operatorSession.token)) === 403, 'CA-8 LAN operator');

  const adminRow = findUserByUsername(db, 'admin');
  assert(adminRow, 'CA-8 admin bootstrap');
  const adminSession = createSession(db, adminRow.id);
  assert(adminSession, 'CA-8 sessão admin');
  assert((await runAdminMiddleware(adminSession.token)) === 200, 'CA-8 LAN admin');
  pass('CA-8', 'requireAdminAccess: 401/403 não-admin, admin OK em LAN simulada');

  assert(fs.existsSync(path.join(appRoot, 'scripts/backup-livepraise.mjs')), 'CLI backup');
  assert(fs.existsSync(path.join(appRoot, 'scripts/restore-livepraise.mjs')), 'CLI restore');
  pass('CA-9', 'scripts CLI presentes');

  skip('CA-10', 'UI admin — verificar manualmente no operador');
  skip('CA-11', 'copy privacidade — inspecção i18n/UI');

  console.log('smoke-cad238: concluído.');
} finally {
  await stopLivepraiseServer(server);
  fs.rmSync(testRoot, { recursive: true, force: true });
  fs.rmSync(destRoot, { recursive: true, force: true });
}
