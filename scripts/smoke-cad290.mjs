#!/usr/bin/env node
/**
 * CAD-290 — QA layout 3 zonas (CA-1–CA-9).
 * Validação automatizada: CSS partilhado (CAD-288) + layout computado (jsdom) + regressão estática.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

function record(id, ok, note = '') {
  results.push({ id, ok, note });
  assert(ok, `${id}: ${note || 'assertion failed'}`);
}

function stripCssImports(css) {
  return css.replace(/@import[^;]+;/g, '').trim();
}

function loadSurface({ extraCss = '', bodyAttrs = '', stageStyle = 'width:1280px;height:720px;', html }) {
  const layoutCss = read('shared/projection-layout.css');
  const surfaceCss = extraCss ? stripCssImports(read(extraCss)) : '';
  const dom = new JSDOM(
    `<!DOCTYPE html><html><head>
      <style>${layoutCss}\n${surfaceCss}</style>
    </head><body ${bodyAttrs}>
      <div id="stage" style="position:relative;${stageStyle}overflow:hidden;">
        ${html}
      </div>
    </body></html>`,
    { resources: 'usable', pretendToBeVisual: true },
  );
  return dom.window.document;
}

function cs(doc, selector) {
  const el = doc.querySelector(selector);
  assert(el, `missing ${selector}`);
  return doc.defaultView.getComputedStyle(el);
}

// --- CAD-288 gate (CA Must: CSS partilhado) ---
const shared = read('shared/projection-layout.css');
record('CAD-288-gate', shared.includes('grid-template-rows'), 'grid 3 zonas no módulo partilhado');

for (const css of [
  'apps/projector/projector.css',
  'web/live/live.css',
  'web/external-display/external-display.css',
]) {
  const body = read(css);
  record(
    'CA-6-import',
    body.includes('projection-layout.css'),
    `${css} importa layout partilhado`,
  );
}

// --- CA-1 Bíblia ---
{
  const doc = loadSurface({
    html: `<div id="conteudo">
      <div class="titulo">Mateus 5:1</div>
      <div class="content"><span>Vendo Jesus as multidões...</span></div>
      <div class="rodape"></div>
    </div>`,
  });
  const titulo = cs(doc, '#conteudo .titulo');
  const content = cs(doc, '#conteudo .content');
  const rodape = cs(doc, '#conteudo .rodape');
  record('CA-1', titulo.display !== 'none' && content.textAlign === 'left', 'referência visível; corpo à esquerda');
  record('CA-4', rodape.display === 'none', '.rodape vazio oculto (bíblia)');
}

// --- CA-2 Louvor centrado; CA-3 rodapé inferior-esquerdo ---
for (const [label, w, h] of [
  ['16:9', 1280, 720],
  ['1080p', 1920, 1080],
]) {
  const doc = loadSurface({
    stageStyle: `width:${w}px;height:${h}px;`,
    html: `<div id="conteudo">
      <div class="titulo"></div>
      <div class="content"><span>Grandes são, Senhor</span></div>
      <div class="rodape">Salmos 92 (Artista)</div>
    </div>`,
  });
  const titulo = cs(doc, '#conteudo .titulo');
  const content = cs(doc, '#conteudo .content');
  const rodape = cs(doc, '#conteudo .rodape');
  record(
    'CA-2',
    titulo.display === 'none' && content.textAlign === 'center',
    `letra centrada; .titulo sem faixa (${label})`,
  );
  record(
    'CA-3',
    rodape.display !== 'none' && rodape.textAlign === 'left',
    `rodapé inferior-esquerdo legível (${label})`,
  );
}

// --- CA-5 Paridade prévia vs projetor (mesmo HTML, regras equivalentes) ---
{
  const bibleHtml = `<div class="titulo">João 3:16</div>
    <div class="content"><span>Porque Deus amou o mundo...</span></div>
    <div class="rodape"></div>`;
  const projector = loadSurface({ html: `<div id="conteudo">${bibleHtml}</div>` });
  const preview = loadSurface({
    stageStyle: 'width:320px;height:180px;',
    html: `<div class="projection-preview-frame" style="width:320px;height:180px;container-type:size;">
      <div class="conteudo">${bibleHtml}</div>
    </div>`,
  });
  const pContent = cs(projector, '#conteudo .content');
  const vContent = cs(preview, '.conteudo .content');
  const pGrid = cs(projector, '#conteudo').display;
  const vGrid = cs(preview, '.conteudo').display;
  record(
    'CA-5',
    pGrid === 'grid' &&
      vGrid === 'grid' &&
      pContent.textAlign === vContent.textAlign &&
      pContent.textAlign === 'left',
    'prévia e projetor: grid + alinhamento corpo iguais',
  );
}

// --- CA-6 live/external paridade estrutural com projetor ---
for (const css of ['web/live/live.css', 'web/external-display/external-display.css']) {
  const doc = loadSurface({
    extraCss: css,
    html: `<div id="conteudo">
      <div class="titulo"></div>
      <div class="content"><span>Live</span></div>
      <div class="rodape">Meta</div>
    </div>`,
  });
  record(
    'CA-6',
    cs(doc, '#conteudo').display === 'grid' && cs(doc, '#conteudo .content').textAlign === 'center',
    `${css}: grid + louvor centrado`,
  );
}

// --- CA-7 footerAlert + rodapé (body.footer-alert-active no projetor) ---
{
  const doc = loadSurface({
    bodyAttrs: 'class="footer-alert-active"',
    html: `<div id="conteudo">
      <div class="titulo"></div>
      <div class="content"><span>Letra</span></div>
      <div class="rodape">Créditos</div>
    </div>`,
  });
  const conteudo = cs(doc, '#conteudo');
  const rodape = cs(doc, '#conteudo .rodape');
  record(
    'CA-7',
    rodape.display !== 'none' && conteudo.paddingBottom.includes('calc'),
    'rodapé visível + padding-bottom com reserva footerAlert',
  );
}

// --- CA-8 ajustarTela: zonas dentro da área útil (#stage + grid flexível) ---
{
  const doc = loadSurface({
    extraCss: 'apps/projector/projector.css',
    bodyAttrs: 'data-screen-align="centro"',
    stageStyle: 'width:960px;height:540px;',
    html: `<div id="conteudo">
      <div class="titulo">Ref</div>
      <div class="content"><span>Corpo</span></div>
      <div class="rodape"></div>
    </div>`,
  });
  const conteudo = cs(doc, '#conteudo');
  const contentMin = cs(doc, '#conteudo .content').minHeight;
  const stageCss = read('apps/projector/projector.css');
  const zeroMin = (v) => v === '0' || v === '0px';
  record(
    'CA-8',
    conteudo.display === 'grid' &&
      conteudo.height === '100%' &&
      zeroMin(conteudo.minHeight) &&
      zeroMin(contentMin) &&
      stageCss.includes('#stage'),
    'grid 100%×min-height:0 no #conteudo/.content; #stage definido no projetor',
  );
}

// --- CA-9 regressão estática (ações e superfícies) ---
{
  const liveTs = read('shared/types/live.ts');
  for (const action of ['background', 'video', 'youtube', 'removeConteudo']) {
    record('CA-9', liveTs.includes(`'${action}'`), `LIVE_ACTIONS inclui ${action}`);
  }
  const projector = read('apps/projector/src/projector.ts');
  record('CA-9', projector.includes("case 'removeConteudo'"), 'projector trata removeConteudo');
  record('CA-9', read('apps/projector/projector.css').includes('#text-scrim'), 'scrim/contraste presente');
}

// --- CA-6 hub: /live + external vocal recebem viewMusica/viewBiblia ---
{
  const { WebSocket } = await import('ws');
  const fs = await import('node:fs');
  const os = await import('node:os');
  const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad290-'));
  process.env.LIVEPRAISE_HOME = testHome;
  process.env.LIVEPRAISE_APP_ROOT = root;
  process.env.LIVEPRAISE_PORT = '0';

  const { startLivepraiseServer, stopLivepraiseServer } = await import(
    '../dist/server/index.js'
  );

  const bibleHtml =
    '<div class="titulo">João 3:16</div><div class="content"><span>Deus amou o mundo</span></div><div class="rodape"></div>';
  const musicHtml =
    '<div class="titulo"></div><div class="content"><span>Letra central</span></div><div class="rodape">Salmo (Artista)</div>';
  const musicRetornoHtml =
    '<div class="retorno-musica"><section class="atual"><p class="label">Agora</p><div class="texto">Letra actual</div></section><section class="proximo"><p class="label">Próximo</p><div class="texto">Próximo verso</div></section><p class="rodape">Salmo (Artista)</p></div>';
  const bibleRetornoHtml =
    '<div class="retorno-biblia"><p class="ref">João 3:16</p><div class="texto">Deus amou o mundo</div></div>';

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

  async function joinClient(base, profile, deviceSuffix) {
    const socket = new WebSocket(base);
    await new Promise((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });
    socket.send(
      JSON.stringify({
        type: 'join',
        role: 'external-display',
        name: profile,
        deviceId: `22222222-2222-4222-8222-2222222222${deviceSuffix}`,
        profile,
      }),
    );
    await waitForMessage(socket, (m) => m.type === 'joined');
    return socket;
  }

  const { port } = await startLivepraiseServer(0);
  const base = `ws://127.0.0.1:${port}/ws/live`;

  try {
    const operator = new WebSocket(base);
    await new Promise((resolve, reject) => {
      operator.once('open', resolve);
      operator.once('error', reject);
    });
    operator.send(JSON.stringify({ type: 'join', role: 'operator', name: 'cad290' }));
    await waitForMessage(operator, (m) => m.type === 'joined');

    const liveClient = await joinClient(base, 'live', '01');
    const vocalClient = await joinClient(base, 'vocal', '02');

    const liveBiblia = waitForMessage(
      liveClient,
      (m) => m.type === 'live-action' && m.action?.acao === 'viewBiblia',
    );
    const vocalBiblia = waitForMessage(
      vocalClient,
      (m) => m.type === 'live-action' && m.action?.acao === 'viewBibliaRetorno',
    );
    operator.send(
      JSON.stringify({
        type: 'live-action',
        action: { acao: 'viewBibliaRetorno', valor: bibleRetornoHtml },
      }),
    );
    operator.send(
      JSON.stringify({ type: 'live-action', action: { acao: 'viewBiblia', valor: bibleHtml } }),
    );
    const [lb, vb] = await Promise.all([liveBiblia, vocalBiblia]);
    record(
      'CA-6',
      lb.action.valor.includes('class="content"') && vb.action.valor.includes('João'),
      'hub entrega viewBiblia a live e viewBibliaRetorno a vocal',
    );

    const liveMusica = waitForMessage(
      liveClient,
      (m) => m.type === 'live-action' && m.action?.acao === 'viewMusica',
    );
    const vocalMusica = waitForMessage(
      vocalClient,
      (m) => m.type === 'live-action' && m.action?.acao === 'viewMusicaRetorno',
    );
    operator.send(
      JSON.stringify({
        type: 'live-action',
        action: { acao: 'viewMusicaRetorno', valor: musicRetornoHtml },
      }),
    );
    operator.send(
      JSON.stringify({ type: 'live-action', action: { acao: 'viewMusica', valor: musicHtml } }),
    );
    const [lm, vm] = await Promise.all([liveMusica, vocalMusica]);
    record(
      'CA-6',
      lm.action.valor.includes('rodape') && vm.action.valor.includes('Letra actual'),
      'hub entrega viewMusica a live e viewMusicaRetorno a vocal',
    );

    liveClient.close();
    vocalClient.close();
    operator.close();
  } finally {
    await stopLivepraiseServer();
  }
}

console.log('smoke-cad290: OK');
for (const r of results) {
  console.log(`  ${r.id}: PASS${r.note ? ` — ${r.note}` : ''}`);
}
