#!/usr/bin/env node
/**
 * Smoke CAD-122: exportar/importar playlist — formato versionado, API resolve, UI operador.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PLAYLIST_FORMAT,
  PLAYLIST_FORMAT_VERSION,
  buildPlaylistExport,
  buildImportTabsFromExport,
  mapResolveBySongId,
  parsePlaylistExport,
} from '../dist/shared/playlist-transfer.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad122-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';
process.env.LIVEPRAISE_BOOTSTRAP_PASSWORD = 'smoke-cad122-pass';

const actionBarPath = path.join(appRoot, 'apps/operator/src/components/ActionBar.vue');
const chromeTabsPath = path.join(appRoot, 'apps/operator/src/components/ChromeTabs.vue');
const sharedPath = path.join(appRoot, 'shared/playlist-transfer.ts');
const playlistRoutePath = path.join(appRoot, 'server/routes/playlist.ts');
const localePath = path.join(appRoot, 'locales/pt-BR.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(fs.existsSync(sharedPath), 'shared/playlist-transfer.ts');
assert(fs.existsSync(playlistRoutePath), 'server/routes/playlist.ts');

const actionBarSrc = fs.readFileSync(actionBarPath, 'utf8');
assert(actionBarSrc.includes('exportPlaylistFile'), 'menu exportar playlist na ActionBar');
assert(actionBarSrc.includes('importPlaylistFile'), 'menu importar playlist na ActionBar');
assert(actionBarSrc.includes('DropdownMenu'), 'menu dropdown na barra');
assert(actionBarSrc.includes("t('actions.playlist')"), 'rótulo menu Playlist');
assert(actionBarSrc.includes('type="file"'), 'file picker de importação');

const chromeTabsSrc = fs.readFileSync(chromeTabsPath, 'utf8');
assert(!chromeTabsSrc.includes('exportPlaylistFile'), 'export fora da faixa de abas');

const locale = JSON.parse(fs.readFileSync(localePath, 'utf8'));
assert(locale.actions?.playlistExport, 'locale actions.playlistExport');
assert(locale.tabs?.missingSong, 'locale tabs.missingSong');

const exported = buildPlaylistExport([
  {
    label: 'Hino A',
    songId: 1,
    songName: 'Hino A',
    artist: 'Autor',
    verses: [{ id: 10, text: 'Linha 1' }],
  },
  {
    label: 'Hino B',
    songId: 999,
    verses: [{ id: 20, text: 'Órfão' }],
  },
]);
assert(exported.format === PLAYLIST_FORMAT, 'formato export');
assert(exported.version === PLAYLIST_FORMAT_VERSION, 'versão export');
assert(exported.items.length === 2, 'dois itens exportados');

const roundtrip = parsePlaylistExport(JSON.stringify(exported));
assert(roundtrip.items[0].order === 0, 'ordem preservada no parse');

const resolved = mapResolveBySongId([
  { id: 1, exists: true, nome: 'Hino A', nome2: 'Hino A', artista: 'Autor' },
  { id: 999, exists: false },
]);
const versesBySongId = new Map([[1, [{ id: 11, text: 'Da BD' }]]]);
const imported = buildImportTabsFromExport(
  roundtrip,
  resolved,
  versesBySongId,
  'Música ausente',
);
assert(imported.length === 2, 'dois tabs importados');
assert(!imported[0].missing && imported[0].verses[0].text === 'Da BD', 'música existente usa versos da BD');
assert(imported[1].missing && imported[1].missingMessage === 'Música ausente', 'órfão marcado');

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

try {
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  const createRes = await fetch(`${base}/musica`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cat: '1',
      nome: 'Smoke CAD-122',
      artista: 'Teste',
      compositor: '',
    }),
  });
  const created = await createRes.json();
  assert(createRes.ok && created.id, 'criar música para resolve');

  const resolveRes = await fetch(`${base}/playlist/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songIds: [created.id, 424242] }),
  });
  const resolveData = await resolveRes.json();
  assert(resolveRes.ok, 'POST /playlist/resolve');
  assert(resolveData.items?.length === 2, 'resolve devolve todos os ids');
  assert(
    resolveData.items.find((i) => i.id === created.id)?.exists === true,
    'música local existe',
  );
  assert(
    resolveData.items.find((i) => i.id === 424242)?.exists === false,
    'música ausente sinalizada',
  );

  console.log('Smoke CAD-122 OK (playlist export/import + resolve API + UI)');
} finally {
  await stopLivepraiseServer();
  fs.rmSync(testHome, { recursive: true, force: true });
}
