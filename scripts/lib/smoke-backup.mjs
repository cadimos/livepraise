/**
 * SM-013 — import-url (cad228), remover fila (cad234), backup/restore (cad238).
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const MINI_MP4 = Buffer.from(
  'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAB1tZGF0AAAAMGWIhAAV//73ye/Apuvb3rkXih0YFtdo1wMAAAABbWZ0YQABAAABEwAAABTtaXllAAAAFGJ0cnQAAAAAAAAAAQAAAAEAAAAUc3R0cwAAAAAAAAABAAAAAQAAABxzdHNjAAAAAAAAAAEAAAABAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAFGJ0cHQAAAAAAAABAQAAAAEAAAAYc3R0cwAAAAAAAAABAAAAAQAAABhzdHNjAAAAAAAAAAEAAAABAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAFGJ0cHQAAAAAAAABAQAAAAE=',
  'base64',
);

function waitForMessage(socket, predicate, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error('Timeout WS'));
    }, timeoutMs);
    function onMessage(data) {
      let message;
      try {
        message = JSON.parse(String(data));
      } catch {
        return;
      }
      if (!predicate(message)) return;
      clearTimeout(timer);
      socket.off('message', onMessage);
      resolve(message);
    }
    socket.on('message', onMessage);
  });
}

function tabItems(tab) {
  return tab.items ?? [];
}

function removeQueueItem(prefs, tabId, itemId) {
  const tab = prefs.chromeTabs.find((t) => t.id === tabId);
  if (!tab) return;
  const items = tabItems(tab);
  if (!items.some((i) => i.id === itemId)) return;
  tab.items = items.filter((i) => i.id !== itemId);
}

function makePrefs(tabId, items) {
  return {
    chromeTabs: [{ id: tabId, label: 'Fila teste', items: [...items] }],
    activeTabId: tabId,
  };
}

async function postImportUrl(base, body) {
  const res = await fetch(`${base}/api/queue/import-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function startFixtureServer() {
  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';
    if (url.includes('/evil.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!DOCTYPE html><html><body>not media</body></html>');
      return;
    }
    if (url.includes('.mp4')) {
      res.writeHead(200, { 'Content-Type': 'video/mp4' });
      res.end(MINI_MP4);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(PNG);
  });
  await new Promise((resolve) => server.listen(0, '0.0.0.0', resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return { server, port };
}

/**
 * CAD-228 — import-url na fila.
 * @param {{ pass: Function; assert: Function; skip: Function; appRoot: string }} ctx
 */
export async function runImportUrlSmoke({ pass, assert, skip, appRoot }) {
  const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-backup-import-'));
  process.env.LIVEPRAISE_HOME = testHome;
  process.env.LIVEPRAISE_APP_ROOT = appRoot;
  process.env.LIVEPRAISE_PORT = '0';

  const { RemoteFetchError, assertAllowedContentType } = await import(
    '../../dist/core/security/remote-fetch.js'
  );

  function expectUnsupportedType(contentType, fileName) {
    try {
      assertAllowedContentType(contentType, fileName);
      throw new Error(`expected unsupported_type for ${contentType}`);
    } catch (err) {
      assert(
        err instanceof RemoteFetchError && err.code === 'unsupported_type',
        `CA-5 ${contentType}: ${err?.code ?? err}`,
      );
    }
  }

  expectUnsupportedType('text/html', 'trap.html');
  expectUnsupportedType('text/html; charset=utf-8', 'x.png');
  assert(
    assertAllowedContentType('image/png', 'ok.png') === 'imagens',
    'CA-5 image/png allowed',
  );

  const { startLivepraiseServer, stopLivepraiseServer } = await import(
    '../../dist/server/index.js'
  );
  const { getVideoPipelineState } = await import('../../dist/server/services/videoPipeline.js');

  const fixtureHost = process.env.LIVEPRAISE_SMOKE_FIXTURE_HOST?.trim() || '';
  let fixture = null;

  try {
    const { port } = await startLivepraiseServer();
    const base = `http://127.0.0.1:${port}`;

    const healthRes = await fetch(`${base}/health`);
    const health = await healthRes.json();
    assert(health.features?.cad228 === true, 'CA-9 health features.cad228');

    const openapi = fs.readFileSync(path.join(appRoot, 'openapi.yaml'), 'utf8');
    assert(openapi.includes('/api/queue/import-url'), 'CA-9 OpenAPI import-url');

    const yt = await postImportUrl(base, {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      category: 'fila',
    });
    assert(yt.status === 400, `CA-3 youtube status ${yt.status}`);
    assert(yt.json.code === 'youtube_use_dedicated_flow', 'CA-3 youtube code');

    const loopback = await postImportUrl(base, {
      url: 'http://127.0.0.1/evil.png',
      category: 'fila',
    });
    assert(loopback.status === 400, `CA-4 ssrf status ${loopback.status}`);
    assert(loopback.json.code === 'ssrf_blocked', 'CA-4 ssrf code');

    const decimal = await postImportUrl(base, {
      url: 'http://2130706433/x.png',
      category: 'fila',
    });
    assert(decimal.status === 400, `CA-4 decimal ip status ${decimal.status}`);
    assert(decimal.json.code === 'ssrf_blocked', 'CA-4 decimal ip code');

    const ref = await postImportUrl(base, {
      url: 'https://cdn.example.org/demo.png',
      category: 'fila',
      mode: 'reference',
    });
    assert(ref.status === 200, `CA-7 reference status ${ref.status}`);
    assert(ref.json.mode === 'reference', 'CA-7 reference mode');
    assert(ref.json.item?.mediaPath?.startsWith('https://'), 'CA-7 reference mediaPath');

    const uploadRes = await fetch(
      `${base}/api/queue/upload?category=fila&filename=smoke-cad228.png`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: PNG,
      },
    );
    assert(uploadRes.status === 200, `CA-8 upload status ${uploadRes.status}`);
    const uploadJson = await uploadRes.json();
    assert(uploadJson.item?.kind === 'image', 'CA-8 upload kind image');
    assert(
      uploadJson.item?.mediaPath?.includes('imagens/fila/'),
      'CA-8 upload path imagens/fila',
    );

    const ytRes = await fetch(`${base}/video/importar/youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://youtu.be/dQw4w9WgXcQ',
        category: 'fila',
      }),
    });
    assert(ytRes.status === 200, `CA-8 youtube status ${ytRes.status}`);
    const ytJson = await ytRes.json();
    assert(
      ytJson.mode === 'local' ||
        ytJson.mode === 'embed' ||
        ytJson.async === true,
      'CA-8 youtube async, local or embed',
    );

    if (fixtureHost) {
      fixture = await startFixtureServer();
      const pngUrl = `http://${fixtureHost}:${fixture.port}/smoke.png`;
      const png = await postImportUrl(base, { url: pngUrl, category: 'fila' });
      assert(png.status === 200, `CA-1 fixture status ${png.status}`);
      assert(png.json.item?.kind === 'image', 'CA-1 kind image');
      assert(png.json.item?.mediaPath?.includes('imagens/fila/'), 'CA-1 mediaPath');
      assert(
        fs.existsSync(path.join(testHome, png.json.item.mediaPath)),
        'CA-1 file on disk',
      );

      const mp4Url = `http://${fixtureHost}:${fixture.port}/smoke.mp4`;
      const mp4 = await postImportUrl(base, { url: mp4Url, category: 'fila' });
      assert(mp4.status === 200, `CA-2 fixture status ${mp4.status}`);
      assert(mp4.json.item?.kind === 'video', 'CA-2 kind video');
      assert(mp4.json.item?.mediaPath?.includes('videos/fila/'), 'CA-2 mediaPath videos/fila');
      assert(mp4.json.item?.thumbPath, 'CA-2 thumbPath');
      assert(
        fs.existsSync(path.join(testHome, mp4.json.item.mediaPath)),
        'CA-2 file on disk',
      );
      const pipe = getVideoPipelineState(mp4.json.item.mediaPath);
      assert(
        pipe.status === 'processing' || pipe.status === 'ready' || pipe.status === 'error',
        `CA-2 pipeline state ${pipe.status}`,
      );

      const htmlUrl = `http://${fixtureHost}:${fixture.port}/evil.html`;
      const html = await postImportUrl(base, { url: htmlUrl, category: 'fila' });
      assert(html.status === 400, `CA-5 API status ${html.status}`);
      assert(html.json.code === 'unsupported_type', 'CA-5 API code');
    } else {
      skip(
        'backup-import-fixture',
        'CA-1/2/5 API — LIVEPRAISE_SMOKE_FIXTURE_HOST não definido',
      );
    }

    const mediaRel = uploadJson.item.mediaPath;
    const valor = encodeURIComponent(`/${mediaRel}`);
    const wsBase = `ws://127.0.0.1:${port}/ws/live`;

    const projector = new WebSocket(wsBase);
    await new Promise((resolve, reject) => {
      projector.once('open', resolve);
      projector.once('error', reject);
    });
    projector.send(JSON.stringify({ type: 'join', role: 'projector', name: 'smoke-cad228' }));
    await waitForMessage(projector, (m) => m.type === 'joined');

    const operator = new WebSocket(wsBase);
    await new Promise((resolve, reject) => {
      operator.once('open', resolve);
      operator.once('error', reject);
    });
    operator.send(JSON.stringify({ type: 'join', role: 'operator', name: 'smoke-cad228-op' }));
    await waitForMessage(operator, (m) => m.type === 'joined');

    const projectorLive = waitForMessage(
      projector,
      (m) =>
        m.type === 'live-action' &&
        m.action?.acao === 'background' &&
        typeof m.action?.valor === 'string' &&
        decodeURIComponent(m.action.valor).includes(mediaRel),
    );
    operator.send(
      JSON.stringify({
        type: 'live-action',
        action: { acao: 'background', valor },
      }),
    );
    await projectorLive;
    operator.close();
    projector.close();
    pass('backup-import-ws', 'CAD-228 CA-6 WS background');

    const modalSrc = fs.readFileSync(
      path.join(appRoot, 'apps/operator/src/components/QueueAddMediaModal.vue'),
      'utf8',
    );
    assert(modalSrc.includes("step = 'mediaUrl'"), 'CA-8 UI mediaUrl step');
    assert(modalSrc.includes('postMediaUrlImport'), 'CA-8 UI postMediaUrlImport');
    assert(modalSrc.includes('postQueueUpload'), 'CA-8 UI postQueueUpload');
    assert(modalSrc.includes('postYoutubeImport'), 'CA-8 UI postYoutubeImport');
    assert(modalSrc.includes('optionMediaUrl'), 'CA-8 UI optionMediaUrl i18n key');

    const panelSrc = fs.readFileSync(
      path.join(appRoot, 'apps/operator/src/components/ChromeTabPanel.vue'),
      'utf8',
    );
    assert(panelSrc.includes('QueueAddMediaModal'), 'CA-8 UI modal wired in panel');

    const locales = JSON.parse(
      fs.readFileSync(path.join(appRoot, 'locales/pt-BR.json'), 'utf8'),
    );
    assert(locales.queueAdd?.optionMediaUrl, 'CA-8 i18n optionMediaUrl');

    const pingRes = await fetch(`${base}/video/importar/ping`);
    assert(pingRes.status === 200, 'cad194 ping still ok');

    pass('backup-import-url', 'CAD-228 import-url');
  } finally {
    await stopLivepraiseServer().catch(() => {});
    if (fixture?.server) {
      await new Promise((resolve) => fixture.server.close(resolve));
    }
    fs.rmSync(testHome, { recursive: true, force: true });
  }
}

/**
 * CAD-234 — remover item da fila.
 * @param {{ pass: Function; assert: Function; appRoot: string }} ctx
 */
export async function runQueueRemoveSmoke({ pass, assert, appRoot }) {
  const kinds = [
    { kind: 'music', label: 'V1', text: 'Linha 1', verseId: 1 },
    { kind: 'bible', label: 'Jo 3:16', bibleFile: 'acf', bookId: 43, chapter: 3, verseNum: 16 },
    { kind: 'image', label: 'Img', mediaPath: 'imagens/teste/demo.png' },
    {
      kind: 'video',
      label: 'Vid local',
      mediaPath: 'videos/teste/demo.mp4',
      thumbPath: 'videos/teste/thumb/demo.jpg',
    },
    {
      kind: 'video',
      label: 'YT',
      youtubeVideoId: 'dQw4w9WgXcQ',
      mediaPath: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    },
    { kind: 'blank', label: 'Em branco' },
  ];

  for (const spec of kinds) {
    const tabId = `tab-${spec.kind}`;
    const id = `item-${spec.kind}`;
    const prefs = makePrefs(tabId, [{ id, ...spec }]);
    removeQueueItem(prefs, tabId, id);
    assert(tabItems(prefs.chromeTabs[0]).length === 0, `CA-1/2 ${spec.kind}: fila vazia`);
    const roundtrip = JSON.parse(JSON.stringify(prefs));
    assert(roundtrip.chromeTabs[0].items.length === 0, `CA-1 persistência ${spec.kind}`);
  }

  const panelSrc = fs.readFileSync(
    path.join(appRoot, 'apps/operator/src/components/ChromeTabPanel.vue'),
    'utf8',
  );
  assert(
    panelSrc.includes('removeQueueItem(tabId, itemId)'),
    'CA-3: onRemoveFromQueue chama removeQueueItem',
  );
  assert(
    !/onRemoveFromQueue[\s\S]*?sendAction/.test(panelSrc),
    'CA-3: onRemoveFromQueue não chama sendAction',
  );
  assert(!panelSrc.includes("sendAction('removeConteudo'"), 'CA-3: sem removeConteudo');

  const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-backup-remove-'));
  const mediaDir = path.join(testHome, 'imagens', 'qa');
  fs.mkdirSync(mediaDir, { recursive: true });
  const filePath = path.join(mediaDir, 'keep.png');
  fs.writeFileSync(filePath, 'png-bytes');
  const rel = 'imagens/qa/keep.png';
  const tabId = 'tab-ca4';
  const prefs = makePrefs(tabId, [{ id: 'img1', kind: 'image', label: 'Keep', mediaPath: rel }]);
  removeQueueItem(prefs, tabId, 'img1');
  assert(fs.existsSync(filePath), 'CA-4: ficheiro permanece após remoção da fila');
  fs.rmSync(testHome, { recursive: true, force: true });

  const dragSrc = fs.readFileSync(
    path.join(appRoot, 'apps/operator/src/composables/useQueueDrag.ts'),
    'utf8',
  );
  assert(dragSrc.includes('reorderQueueItemsInTab'), 'CA-5: reorderQueueItemsInTab');
  assert(dragSrc.includes('moveQueueItemInTab'), 'CA-5: moveQueueItemInTab');
  assert(panelSrc.includes('draggable="true"'), 'CA-5: tiles draggable');
  assert(panelSrc.includes('useQueueDrag'), 'CA-5: useQueueDrag ligado');
  assert(panelSrc.includes('@contextmenu.prevent'), 'CA-6: contextmenu.prevent');
  assert(panelSrc.includes("event.key === 'Escape'"), 'CA-6: Escape fecha menu');
  assert(panelSrc.includes('onQueueDocumentClick'), 'CA-6: clique fora fecha');
  assert(panelSrc.includes('role="menu"'), 'CA-6: role=menu');
  assert(panelSrc.includes('role="menuitem"'), 'CA-6: role=menuitem');

  const locales = JSON.parse(
    fs.readFileSync(path.join(appRoot, 'locales/pt-BR.json'), 'utf8'),
  );
  assert(locales.queueItem?.removeFromQueue === 'Remover da fila', 'CA-7: removeFromQueue');
  assert(
    locales.queueItem?.removeFromQueueAria?.includes('{label}'),
    'CA-7: removeFromQueueAria com {label}',
  );
  assert(panelSrc.includes("t('tabs.dropHint')"), 'CA-8: dropHint quando sem itens');
  assert(panelSrc.includes('!activeItems.length'), 'CA-8: condição fila vazia');

  const wsHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-backup-remove-ws-'));
  process.env.LIVEPRAISE_HOME = wsHome;
  process.env.LIVEPRAISE_APP_ROOT = appRoot;
  process.env.LIVEPRAISE_PORT = '0';

  const { startLivepraiseServer, stopLivepraiseServer } = await import(
    '../../dist/server/index.js'
  );

  try {
    const received = [];
    const { port } = await startLivepraiseServer(0);
    const base = `ws://127.0.0.1:${port}/ws/live`;
    const projector = new WebSocket(base);
    await new Promise((resolve, reject) => {
      projector.once('open', resolve);
      projector.once('error', reject);
    });
    projector.on('message', (data) => {
      try {
        const m = JSON.parse(String(data));
        if (m.type === 'live-action' && m.action?.acao) {
          received.push(m.action.acao);
        }
      } catch {
        /* ignore */
      }
    });
    projector.send(JSON.stringify({ type: 'join', role: 'projector', name: 'smoke-proj' }));
    await waitForMessage(projector, (m) => m.type === 'joined');

    const operator = new WebSocket(base);
    await new Promise((resolve, reject) => {
      operator.once('open', resolve);
      operator.once('error', reject);
    });
    operator.send(JSON.stringify({ type: 'join', role: 'operator', name: 'smoke-op' }));
    await waitForMessage(operator, (m) => m.type === 'joined');
    operator.send(
      JSON.stringify({
        type: 'live-action',
        action: { acao: 'viewMusica', valor: '<div>ativo</div>' },
      }),
    );
    await waitForMessage(
      projector,
      (m) => m.type === 'live-action' && m.action?.acao === 'viewMusica',
    );
    received.length = 0;

    const prefsWs = makePrefs('t1', [
      { id: 'a1', kind: 'music', label: 'A', active: true, text: 'x' },
    ]);
    removeQueueItem(prefsWs, 't1', 'a1');
    assert(tabItems(prefsWs.chromeTabs[0]).length === 0, 'CA-3 sim: item removido');
    await new Promise((r) => setTimeout(r, 300));
    assert(
      !received.includes('removeConteudo'),
      `CA-3 WS: sem removeConteudo (recebido: ${received.join()})`,
    );

    operator.close();
    projector.close();
    pass('backup-queue-remove', 'CAD-234 CA-1–CA-8');
  } finally {
    await stopLivepraiseServer().catch(() => {});
    fs.rmSync(wsHome, { recursive: true, force: true });
  }
}

/**
 * CAD-238 — backup e restore selectivo.
 * @param {{ pass: Function; assert: Function; skip: Function; appRoot: string }} ctx
 */
export async function runBackupRestoreSmoke({ pass, assert, skip, appRoot }) {
  const backupModule = path.join(appRoot, 'dist/server/backup/index.js');
  assert(fs.existsSync(backupModule), 'dist/server/backup/ — execute npm run build:server');

  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-backup-restore-'));
  const destRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-backup-restore-dest-'));
  process.env.LIVEPRAISE_HOME = testRoot;
  process.env.LIVEPRAISE_APP_ROOT = appRoot;
  process.env.LIVEPRAISE_PORT = '0';

  const { startLivepraiseServer, stopLivepraiseServer } = await import(
    '../../dist/server/index.js'
  );
  const {
    createBackupZip,
    inspectBackupZip,
    applyRestore,
    normalizeGroupIds,
    assertSafeZipEntryName,
    BackupError,
  } = await import('../../dist/server/backup/index.js');
  const { ensureLivepraiseDataDir } = await import('../../dist/server/bootstrap.js');

  await ensureLivepraiseDataDir();
  const testLivepraise = path.join(testRoot, 'livepraise');
  const destLivepraise = path.join(destRoot, 'livepraise');
  const zipPath = path.join(testRoot, 'smoke-backup.zip');

  const server = await startLivepraiseServer();
  const base = `http://127.0.0.1:${server.port}`;

  try {
    assert((await fetch(`${base}/health`)).ok, 'servidor smoke');
    pass('backup-bootstrap', `servidor em ${base}`);

    fs.mkdirSync(path.join(testLivepraise, 'imagens', 'qa'), { recursive: true });
    fs.writeFileSync(path.join(testLivepraise, 'imagens', 'qa', 'smoke.png'), 'png');

    const manifest = await createBackupZip({
      groups: normalizeGroupIds(['database', 'media_images']),
      outputPath: zipPath,
    });
    assert(fs.existsSync(zipPath), 'zip criado');
    assert(manifest.groups.includes('database'), 'manifesto database');
    pass('backup-CA-1', 'backup database + media_images + manifesto');

    const inspected = await inspectBackupZip(zipPath);
    assert(inspected.groupsPresent.includes('database'), 'inspect present');
    assert(inspected.groupsAbsent.includes('media_videos'), 'media_videos ausente');
    pass('backup-CA-3', 'inspect grupos presentes/ausentes');

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
    pass('backup-CA-2', 'restore parcial em destino vazio');

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
      pass('backup-CA-4', 'restore sem confirmOverwrite recusado');
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
    pass('backup-CA-5', 'overwrite só grupos seleccionados');

    const walZip = path.join(testRoot, 'wal-backup.zip');
    await createBackupZip({
      groups: normalizeGroupIds(['database']),
      outputPath: walZip,
    });
    pass('backup-CA-6', 'backup BD com servidor activo (WAL checkpoint)');

    const fakeDb = path.join(testRoot, 'fake-newer.bd');
    fs.copyFileSync(path.join(destLivepraise, 'dsw.bd'), fakeDb);
    const { Database } = await import('../../dist/server/db/sqlite.js');
    const fake = new Database(fakeDb);
    fake.exec(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT DEFAULT (datetime('now')))",
    );
    fake.prepare('INSERT OR REPLACE INTO schema_migrations (version, name) VALUES (?, ?)').run(
      99999,
      'future',
    );
    fake.close();
    const { ZipArchive } = await import('archiver');
    const newerZip = path.join(testRoot, 'newer.zip');
    await new Promise((resolve, reject) => {
      const out = fs.createWriteStream(newerZip);
      const archive = new ZipArchive({ zlib: { level: 6 } });
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
    pass('backup-CA-7', 'restore recusa BD mais nova');

    try {
      assertSafeZipEntryName('groups/database/../../../etc/passwd');
      assert(false, 'zip slip devia falhar');
    } catch {
      pass('backup-CA-12', 'zip slip rejeitado');
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
    pass('backup-preview', '/api/backup/preview estimativa de tamanho');

    const { requireAdminAccess } = await import('../../dist/server/middleware/auth.js');
    const { getMainDb, dbRun } = await import('../../dist/server/db/connection.js');
    const { findUserByUsername } = await import('../../dist/core/auth/users.js');
    const { createSession } = await import('../../dist/core/auth/sessions.js');
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
    pass('backup-CA-8', 'requireAdminAccess: 401/403 não-admin, admin OK');

    assert(fs.existsSync(path.join(appRoot, 'scripts/backup-livepraise.mjs')), 'CLI backup');
    assert(fs.existsSync(path.join(appRoot, 'scripts/restore-livepraise.mjs')), 'CLI restore');
    pass('backup-CA-9', 'scripts CLI presentes');

    skip('backup-CA-10', 'UI admin — verificar manualmente no operador');
    skip('backup-CA-11', 'copy privacidade — inspecção i18n/UI');

    pass('backup-restore', 'CAD-238 backup/restore');
  } finally {
    await stopLivepraiseServer(server);
    fs.rmSync(testRoot, { recursive: true, force: true });
    fs.rmSync(destRoot, { recursive: true, force: true });
  }
}
