#!/usr/bin/env node
/**
 * Smoke CAD-107: playlist — tiles altura fixa 35vh (paridade v0.0.8),
 * sem scroll vertical interno; faixa com scroll horizontal apenas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const panelPath = path.join(appRoot, 'apps/operator/src/components/ChromeTabPanel.vue');
const stylePath = path.join(appRoot, 'apps/operator/src/assets/style.css');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const panel = fs.readFileSync(panelPath, 'utf8');
const style = fs.readFileSync(stylePath, 'utf8');

assert(panel.includes('playlist-verses-track'), 'faixa playlist presente');
assert(panel.includes('overflow-y-hidden'), 'faixa sem scroll vertical');
assert(panel.includes('items-stretch'), 'tiles com altura fixa uniforme');
assert(panel.includes('playlist-verse-tile'), 'classe de tile dedicada');
assert(!panel.includes('overflow-y-auto'), 'tiles sem overflow-y-auto');
assert(!panel.match(/max-h-/), 'tiles sem max-height Tailwind');
assert(!panel.includes('items-start'), 'sem altura por conteúdo (items-start)');

assert(style.includes('.playlist-verse-tile'), 'CSS do tile');
assert(style.includes('height: 35vh'), 'tile altura fixa 35vh');
assert(style.includes('overflow: hidden'), 'tile/pre clip sem scroll interno');
assert(style.includes('overflow-y: hidden'), 'track com overflow-y hidden explícito');
assert(style.includes('flex: 1 1 0'), 'texto do verso encolhe dentro do tile flex');

console.log('Smoke CAD-107 OK (playlist tiles 35vh + faixa horizontal)');
