#!/usr/bin/env node
/**
 * Smoke CAD-136: A11y projeção, stage-return e automação axe-core no operador.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relPath) {
  return fs.readFileSync(path.join(appRoot, relPath), 'utf8');
}

function assertNoBadOpacity(css, selector) {
  const block = css.match(new RegExp(`${selector.replace('#', '\\#')}[^{]*\\{[^}]*\\}`, 's'));
  assert(block, `${selector} presente em CSS`);
  assert(!/opacity:\s*0\.[0-6]/i.test(block[0]), `${selector} sem opacidade degradante`);
}

// --- estáticos: stage-return (B3, B4) ---
const stageCss = read('apps/stage-return/stage-return.css');
assert(stageCss.includes('color: #94a3b8'), 'stage-return labels com contraste AA');
assertNoBadOpacity(stageCss, '#last-action');
assert(stageCss.includes('prefers-reduced-motion'), 'stage-return respeita reduced-motion');

// --- estáticos: projector + external-display (B4, B6, C1) ---
const projectorCss = read('apps/projector/projector.css');
const externalCss = read('web/external-display/external-display.css');
for (const css of [projectorCss, externalCss]) {
  assert(css.includes('#text-scrim'), 'scrim de texto presente');
  assert(css.includes('data-bg-tone'), 'contraste dinâmico por luminância');
  assertNoBadOpacity(css, '#last-action');
  assert(!/#conteudo[^}]*\.rodape[^}]*opacity/i.test(css), 'rodapé sem opacity');
  assert(!/#conteudo[^}]*\.label[^}]*opacity/i.test(css), 'label sem opacity');
  assert(css.includes('prefers-reduced-motion'), 'reduced-motion presente');
}

assert(read('apps/projector/index.html').includes('id="text-scrim"'), 'projector HTML com scrim');
assert(read('web/external-display/index.html').includes('id="text-scrim"'), 'external-display HTML com scrim');
assert(fs.existsSync(path.join(appRoot, 'apps/projector/src/projection-contrast.ts')), 'projection-contrast TS');
assert(fs.existsSync(path.join(appRoot, 'web/external-display/projection-contrast.js')), 'projection-contrast JS');

const operatorStyle = read('apps/operator/src/assets/style.css');
assert(operatorStyle.includes('prefers-reduced-motion'), 'operador respeita reduced-motion');

// --- axe-core no shell do operador (D1) ---
const operatorIndex = path.join(appRoot, 'dist/apps/operator/index.html');
assert(fs.existsSync(operatorIndex), 'build:operator deve gerar dist/apps/operator/index.html');

const indexHtml = fs.readFileSync(operatorIndex, 'utf8');
const assetLinks = indexHtml.match(/href="(\.\/assets\/[^"]+\.css)"/);
assert(assetLinks, 'CSS compilado referenciado no index do operador');

const operatorCssPath = path.join(
  appRoot,
  'dist/apps/operator',
  assetLinks[1].replace(/^\.\//, ''),
);
assert(fs.existsSync(operatorCssPath), 'CSS compilado do operador existe');
const operatorCss = fs.readFileSync(operatorCssPath, 'utf8');

const fixture = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Live Praise Operator A11y Fixture</title>
  <style>${operatorCss}</style>
</head>
<body class="bg-lp-background text-lp-text">
  <header class="flex items-center justify-between bg-lp-action-bar px-4 py-2 text-lp-background">
    <span>Live Praise</span>
    <button type="button" class="rounded px-3 py-1">Acção</button>
  </header>
  <main class="p-4">
    <p class="text-lp-muted lp-panel-label">Painel</p>
    <button type="button" class="rounded bg-lp-primary px-3 py-2 text-lp-background">Projetar</button>
  </main>
</body>
</html>`;

const dom = new JSDOM(fixture, { url: 'http://localhost/', runScripts: 'outside-only' });
const { window } = dom;
const { document } = window;

const axeSource = fs.readFileSync(
  path.join(appRoot, 'node_modules/axe-core/axe.min.js'),
  'utf8',
);
window.eval(axeSource);

const results = await window.axe.run(document, {
  runOnly: {
    type: 'rule',
    values: ['document-title', 'html-has-lang', 'landmark-one-main', 'page-has-heading-one'],
  },
});

const serious = results.violations.filter((v) =>
  ['serious', 'critical'].includes(v.impact),
);
assert(
  serious.length === 0,
  `axe-core: ${serious.map((v) => `${v.id} (${v.nodes.length})`).join(', ') || 'sem violações sérias'}`,
);

console.log('smoke:cad136 OK');
console.log(`  axe: ${results.passes.length} regras OK, ${results.violations.length} violações`);
