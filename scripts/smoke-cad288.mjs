#!/usr/bin/env node
/**
 * CAD-288 — layout 3 zonas: CSS partilhado importado em todas as superfícies.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const shared = read('shared/projection-layout.css');
assert(shared.includes('grid-template-rows'), 'shared: grid 3 zonas');
assert(shared.includes('.conteudo'), 'shared: suporte prévia .conteudo');
assert(shared.includes('.projection-preview-frame'), 'shared: container prévia');
assert(shared.includes('.conteudo.footer-alert-active'), 'shared: reserva footerAlert prévia');

for (const css of [
  'apps/projector/projector.css',
  'web/live/live.css',
  'web/external-display/external-display.css',
]) {
  const body = read(css);
  assert(body.startsWith('@import'), `${css}: @import no topo`);
  assert(body.includes('projection-layout.css'), `${css}: import partilhado`);
  const conteudoBlock = body.match(/#conteudo\s*\{[^}]*\}/s)?.[0] ?? '';
  assert(!/display:\s*flex/.test(conteudoBlock), `${css}: #conteudo sem display:flex legado`);
}

for (const vue of [
  'apps/operator/src/components/PreviewPanel.vue',
  'apps/operator/src/components/PreviewOutputTile.vue',
]) {
  const body = read(vue);
  assert(body.includes('projection-preview-frame'), `${vue}: frame prévia`);
  assert(
    body.includes("@shared/projection-layout.css") || body.includes('projection-layout.css'),
    `${vue}: import CSS partilhado`,
  );
  assert(body.includes('footer-alert-active'), `${vue}: classe reserva alerta`);
  assert(!body.includes('[&_.rodape]:bg-black/60'), `${vue}: sem pill rodapé Tailwind`);
}

console.log('smoke-cad288: OK');
