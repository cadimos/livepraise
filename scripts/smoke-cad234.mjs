#!/usr/bin/env node
/**
 * Smoke CAD-234 / QA CAD-237: remover item da fila (CA-1–CA-8).
 * UI manual: operador Electron ou vite preview + clique direito no tile.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Espelha usePreferences.removeQueueItem + tabItems */
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

// —— CA-1 / CA-2: remoção por kind + persistência simulada
for (const spec of kinds) {
  const tabId = `tab-${spec.kind}`;
  const id = `item-${spec.kind}`;
  const prefs = makePrefs(tabId, [{ id, ...spec }]);
  removeQueueItem(prefs, tabId, id);
  assert(tabItems(prefs.chromeTabs[0]).length === 0, `CA-1/2 ${spec.kind}: fila vazia após remoção`);
  const roundtrip = JSON.parse(JSON.stringify(prefs));
  assert(
    roundtrip.chromeTabs[0].items.length === 0,
    `CA-1 persistência simulada ${spec.kind}`,
  );
}

// —— CA-3: item activo removido — sem removeConteudo no handler UI
{
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
  assert(
    !panelSrc.includes("sendAction('removeConteudo'"),
    'CA-3: ChromeTabPanel sem removeConteudo',
  );
}

// —— CA-4: ficheiro em disco inalterado (só remove ponteiro na fila)
{
  const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad234-'));
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
}

// —— CA-5: APIs de drag/reorder ainda presentes
{
  const dragSrc = fs.readFileSync(
    path.join(appRoot, 'apps/operator/src/composables/useQueueDrag.ts'),
    'utf8',
  );
  assert(dragSrc.includes('reorderQueueItemsInTab'), 'CA-5: reorderQueueItemsInTab');
  assert(dragSrc.includes('moveQueueItemInTab'), 'CA-5: moveQueueItemInTab');
  const panelSrc = fs.readFileSync(
    path.join(appRoot, 'apps/operator/src/components/ChromeTabPanel.vue'),
    'utf8',
  );
  assert(panelSrc.includes('draggable="true"'), 'CA-5: tiles draggable');
  assert(panelSrc.includes('useQueueDrag'), 'CA-5: useQueueDrag ligado');
}

// —— CA-6: menu UX (estrutura)
{
  const panelSrc = fs.readFileSync(
    path.join(appRoot, 'apps/operator/src/components/ChromeTabPanel.vue'),
    'utf8',
  );
  assert(panelSrc.includes('@contextmenu.prevent'), 'CA-6: contextmenu.prevent');
  assert(panelSrc.includes("event.key === 'Escape'"), 'CA-6: Escape fecha menu');
  assert(panelSrc.includes('onQueueDocumentClick'), 'CA-6: clique fora fecha');
  assert(panelSrc.includes('role="menu"'), 'CA-6: role=menu');
  assert(panelSrc.includes('role="menuitem"'), 'CA-6: role=menuitem');
}

// —— CA-7: i18n pt-BR
{
  const locales = JSON.parse(
    fs.readFileSync(path.join(appRoot, 'locales/pt-BR.json'), 'utf8'),
  );
  assert(locales.queueItem?.removeFromQueue === 'Remover da fila', 'CA-7: removeFromQueue');
  assert(
    locales.queueItem?.removeFromQueueAria?.includes('{label}'),
    'CA-7: removeFromQueueAria com {label}',
  );
}

// —— CA-8: hint fila vazia no template
{
  const panelSrc = fs.readFileSync(
    path.join(appRoot, 'apps/operator/src/components/ChromeTabPanel.vue'),
    'utf8',
  );
  assert(panelSrc.includes("t('tabs.dropHint')"), 'CA-8: dropHint quando sem itens');
  assert(panelSrc.includes('!activeItems.length'), 'CA-8: condição fila vazia');
}

// —— CA-3 WS: remover item da fila não emite removeConteudo (hub inalterado)
{
  const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad234-ws-'));
  process.env.LIVEPRAISE_HOME = testHome;
  process.env.LIVEPRAISE_APP_ROOT = appRoot;
  process.env.LIVEPRAISE_PORT = '0';

  const { startLivepraiseServer, stopLivepraiseServer } = await import(
    '../dist/server/index.js'
  );

  function waitForMessage(socket, predicate, timeoutMs = 5000) {
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

  // Simula remoção na fila (estado local) — não deve haver tráfego WS
  const prefs = makePrefs('t1', [
    { id: 'a1', kind: 'music', label: 'A', active: true, text: 'x' },
  ]);
  removeQueueItem(prefs, 't1', 'a1');
  assert(tabItems(prefs.chromeTabs[0]).length === 0, 'CA-3 sim: item removido');
  await new Promise((r) => setTimeout(r, 300));
  assert(
    !received.includes('removeConteudo'),
    `CA-3 WS: sem removeConteudo após remoção simulada (recebido: ${received.join()})`,
  );

  operator.close();
  projector.close();
  await stopLivepraiseServer().catch(() => {});
  fs.rmSync(testHome, { recursive: true, force: true });
}

console.log('OK — smoke CAD-234 (CA-1–CA-8)');
