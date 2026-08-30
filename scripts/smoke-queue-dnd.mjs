#!/usr/bin/env node
/**
 * Smoke da reordenação da fila de projeção por drag-and-drop.
 *
 * Cobre o que os testes unitários não conseguem alcançar: o contrato do
 * DataTransfer do navegador. O `drop` só dispara se o `dropEffect` escolhido no
 * `dragover` for compatível com o `effectAllowed` definido no `dragstart`, e
 * durante o `dragover` o payload não é legível — apenas a lista de tipos. Uma
 * regressão nessa cadeia não altera nada visível no código, mas deixa a fila
 * impossível de reordenar.
 *
 * Requer Chrome/Chromium. Sem ele, o smoke é ignorado em vez de falhar.
 */
import {
  assert,
  cleanupSmokeHome,
  configureSmokeEnv,
  createSmokeHome,
  loadLivepraiseServer,
  pass,
  resolveAppRoot,
} from './lib/smoke-helpers.mjs';
import { attachToPage, findChrome, launchChrome } from './lib/cdp-client.mjs';

if (!findChrome()) {
  console.log('smoke-queue-dnd: IGNORADO (Chrome/Chromium não encontrado; defina CHROME_PATH)');
  process.exit(0);
}

const appRoot = resolveAppRoot(import.meta.url);
const testHome = createSmokeHome('livepraise-smoke-queue-dnd-');
configureSmokeEnv({ home: testHome, appRoot, port: '0' });
const { startLivepraiseServer, stopLivepraiseServer } = await loadLivepraiseServer(appRoot);

function seedTab(id, label, itemLabels) {
  return {
    id,
    label,
    items: itemLabels.map((text, index) => ({
      id: `${id}-${index}`,
      kind: 'music',
      label: text,
      text,
    })),
  };
}

const SEED = {
  activePanel: 'louvor',
  chromeTabs: [
    seedTab('tab-a', 'Fila A', ['A', 'B', 'C', 'D']),
    seedTab('tab-b', 'Fila B', ['E', 'F']),
    seedTab('tab-c', 'Fila C', ['G']),
  ],
  activeTabId: 'tab-a',
};

/** Rótulos dos tiles arrastáveis, na ordem em que aparecem na faixa. */
const TILE_ORDER = `
  Array.from(document.querySelectorAll('.playlist-verses-track > li'))
    .filter((li) => li.getAttribute('draggable') === 'true')
    .map((li) => li.querySelector('pre').textContent.replace(/\\s+/g, ' ').trim())
    .join('|')
`;

const TAB_ORDER = `
  Array.from(document.querySelectorAll('[role="tablist"] > div'))
    .map((el) => el.querySelector('button').textContent.replace(/\\s+/g, ' ').trim())
    .join('|')
`;

/** Barra de inserção ativa, se houver, e o tile a que está encostada. */
const DROP_INDICATOR = `
  Array.from(document.querySelectorAll('.playlist-verse-tile--drop-before, .playlist-verse-tile--drop-after'))
    .map((el) => el.className.match(/playlist-verse-tile--drop-\\w+/)[0]
      + ':' + el.querySelector('pre').textContent.replace(/\\s+/g, ' ').trim())
    .join('|')
`;

const tileAt = (i) =>
  `Array.from(document.querySelectorAll('.playlist-verses-track > li'))`
  + `.filter((li) => li.getAttribute('draggable') === 'true')[${i}]`;
const tabAt = (i) => `document.querySelectorAll('[role="tablist"] > div')[${i}]`;

const center = (rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
const at = (rect, fraction) => ({
  x: rect.x + rect.width * fraction,
  y: rect.y + rect.height / 2,
});

let chrome;
let page;
let server;

try {
  server = await startLivepraiseServer(0);
  assert(server.port, 'servidor sem porta');
  const operatorUrl = `http://127.0.0.1:${server.port}/operator/`;

  chrome = await launchChrome();
  page = await attachToPage(chrome.port);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Log.enable');

  const consoleErrors = [];
  page.on('Log.entryAdded', (p) => {
    if (p.entry.level === 'error') consoleErrors.push(p.entry.text);
  });
  page.on('Runtime.exceptionThrown', (p) => {
    consoleErrors.push(p.exceptionDetails?.text ?? 'exceção sem texto');
  });

  async function resetQueue() {
    await page.navigate(operatorUrl);
    await page.evaluate(`
      (() => {
        const raw = localStorage.getItem('livepraise.operator.prefs');
        const prefs = raw ? JSON.parse(raw) : {};
        Object.assign(prefs, ${JSON.stringify(SEED)});
        localStorage.setItem('livepraise.operator.prefs', JSON.stringify(prefs));
      })()
    `);
    await page.navigate(operatorUrl);
  }

  await resetQueue();
  assert(
    (await page.evaluate(TILE_ORDER)) === 'A|B|C|D',
    'fila inicial deveria ser A|B|C|D',
  );
  pass('Q-0', 'fila semeada com 4 itens em 3 abas');

  // Q-1: soltar na metade direita de C insere depois de C.
  {
    const src = await page.rectOf(tileAt(0));
    const dst = await page.rectOf(tileAt(2));
    const data = await page.nativeDrag(center(src), at(dst, 0.8));
    const order = await page.evaluate(TILE_ORDER);
    assert(order === 'B|C|A|D', `esperado B|C|A|D, obtido ${order}`);
    const mimes = (data?.items ?? []).map((item) => item.mimeType);
    assert(
      mimes.includes('application/x-livepraise-queue-reorder'),
      `dataTransfer sem marcador de reordenação: ${mimes.join(',')}`,
    );
    pass('Q-1', 'arrasto para a metade direita insere depois do alvo');
  }

  // Q-2: soltar na metade esquerda insere antes.
  {
    const src = await page.rectOf(tileAt(3));
    const dst = await page.rectOf(tileAt(0));
    await page.nativeDrag(center(src), at(dst, 0.2));
    const order = await page.evaluate(TILE_ORDER);
    assert(order === 'D|B|C|A', `esperado D|B|C|A, obtido ${order}`);
    pass('Q-2', 'arrasto para a metade esquerda insere antes do alvo');
  }

  // Q-3: uma única barra de inserção, que acompanha o lado do cursor.
  {
    const src = await page.rectOf(tileAt(0));
    const dst = await page.rectOf(tileAt(2));
    const [left, right] = await page.dragOverAndInspect(
      center(src),
      [at(dst, 0.2), at(dst, 0.9)],
      () => page.evaluate(DROP_INDICATOR),
    );
    assert(
      left === 'playlist-verse-tile--drop-before:C',
      `indicador na metade esquerda: ${left}`,
    );
    assert(
      right === 'playlist-verse-tile--drop-before:A',
      `indicador na metade direita: ${right}`,
    );
    pass('Q-3', 'barra de inserção única e do lado correto');
  }

  // Q-4: as abas da playlist reordenam-se com o seu próprio tipo MIME.
  {
    await resetQueue();
    const src = await page.rectOf(tabAt(0));
    const dst = await page.rectOf(tabAt(2));
    const data = await page.nativeDrag(center(src), at(dst, 0.85));
    const order = await page.evaluate(TAB_ORDER);
    assert(
      order.startsWith('Fila B') && order.includes('Fila A'),
      `ordem das abas inesperada: ${order}`,
    );
    assert(order.indexOf('Fila A') > order.indexOf('Fila C'), `Fila A não foi para o fim: ${order}`);
    const mimes = (data?.items ?? []).map((item) => item.mimeType);
    assert(
      mimes.includes('application/x-livepraise-tab-drag'),
      `arrasto de aba sem o seu tipo MIME: ${mimes.join(',')}`,
    );
    pass('Q-4', 'aba arrastada para o fim da barra');
  }

  // Q-5: a nova ordem sobrevive ao reload (localStorage).
  {
    const before = await page.evaluate(TAB_ORDER);
    await page.navigate(operatorUrl);
    const after = await page.evaluate(TAB_ORDER);
    assert(before === after, `ordem perdida no reload: ${before} → ${after}`);
    pass('Q-5', 'ordem persiste no reload');
  }

  // Q-6: adicionar itens novos (arrasto de um painel) não regrediu.
  {
    await resetQueue();
    const dst = await page.rectOf(tileAt(1));
    const accepted = await page.evaluate(`
      (() => {
        const target = ${tileAt(1)};
        const dt = new DataTransfer();
        dt.setData('application/x-livepraise-queue-drag', JSON.stringify({
          kind: 'music', label: 'NOVO', text: 'NOVO', verseId: 999,
        }));
        const options = {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX: ${Math.round(dst.x + dst.width * 0.2)},
          clientY: ${Math.round(dst.y + dst.height / 2)},
        };
        const over = new DragEvent('dragover', options);
        target.dispatchEvent(over);
        target.dispatchEvent(new DragEvent('drop', options));
        return over.defaultPrevented;
      })()
    `);
    assert(accepted === true, 'dragover deveria aceitar um item novo');
    await new Promise((r) => setTimeout(r, 300));
    const order = await page.evaluate(TILE_ORDER);
    assert(order === 'A|NOVO|B|C|D', `esperado A|NOVO|B|C|D, obtido ${order}`);
    pass('Q-6', 'item novo entra na posição apontada');
  }

  // Q-7: arrastos alheios não são aceites como alvo.
  {
    const accepted = await page.evaluate(`
      (() => {
        const dt = new DataTransfer();
        dt.setData('text/plain', 'texto qualquer');
        const over = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt });
        ${tileAt(0)}.dispatchEvent(over);
        return over.defaultPrevented;
      })()
    `);
    assert(accepted === false, 'arrasto sem payload da fila não deveria ser aceite');
    pass('Q-7', 'arrasto alheio é recusado');
  }

  assert(consoleErrors.length === 0, `erros de consola: ${consoleErrors.join(' ;; ')}`);
  pass('Q-8', 'sem erros de consola');

  console.log('smoke-queue-dnd: OK');
} catch (error) {
  // O servidor instala um handler de `unhandledRejection` que apenas registra o
  // erro, pelo que uma falha aqui sairia silenciosa com código 0.
  console.error(`smoke-queue-dnd FALHOU: ${error instanceof Error ? error.stack : error}`);
  process.exitCode = 1;
} finally {
  page?.close();
  chrome?.close();
  if (server) await stopLivepraiseServer();
  cleanupSmokeHome(testHome);
}
