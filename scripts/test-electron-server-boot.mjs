#!/usr/bin/env node
/**
 * Simula o arranque do servidor como no processo principal do Electron empacotado.
 * Uso: LIVEPRAISE_APP_ROOT=.../resources/app npx electron scripts/test-electron-server-boot.mjs
 */
import { app } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const appRoot = process.env.LIVEPRAISE_APP_ROOT;
if (!appRoot) {
  console.error('Defina LIVEPRAISE_APP_ROOT (ex.: release-builds/win-unpacked/resources/app)');
  process.exit(1);
}

process.env.LIVEPRAISE_NO_AUTO_SERVER = '1';

app.whenReady().then(async () => {
  try {
    const entry = path.join(appRoot, 'dist/server/index.js');
    const mod = await import(pathToFileURL(entry).href);
    await mod.startLivepraiseServer(3000);
    const r = await fetch('http://127.0.0.1:3000/health');
    const j = await r.json();
    console.log('health cad194=', j.features?.cad194);
    await mod.stopLivepraiseServer();
    process.exitCode = j.features?.cad194 === true ? 0 : 2;
  } catch (err) {
    console.error('FAIL', err);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
