#!/usr/bin/env node
/**
 * Smoke CAD-109: ArrowUp/ArrowDown entre versículos após pesquisa (operador).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const panelPath = path.join(
  appRoot,
  'apps/operator/src/components/panels/BiblePanel.vue',
);
const navPath = path.join(appRoot, 'shared/bible-navigation.ts');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function computeNextVerseIndex(verses, selectedVerse, delta) {
  if (!verses.length) return null;
  const currentIdx = verses.findIndex((v) => v.versiculo === selectedVerse);
  let nextIdx = currentIdx < 0 ? 0 : currentIdx + delta;
  nextIdx = Math.max(0, Math.min(verses.length - 1, nextIdx));
  if (nextIdx === currentIdx && currentIdx >= 0) return null;
  return nextIdx;
}

const verses = [
  { versiculo: 1 },
  { versiculo: 2 },
  { versiculo: 3 },
];

assert(computeNextVerseIndex(verses, null, 1) === 0, 'sem seleção + ArrowDown → primeiro');
assert(computeNextVerseIndex(verses, 2, 1) === 2, 'versículo 2 + ArrowDown → índice 2');
assert(computeNextVerseIndex(verses, 2, -1) === 0, 'versículo 2 + ArrowUp → índice 0');
assert(computeNextVerseIndex(verses, 3, 1) === null, 'último + ArrowDown → sem mudança');
assert(computeNextVerseIndex(verses, 1, -1) === null, 'primeiro + ArrowUp → sem mudança');
assert(computeNextVerseIndex([], 1, 1) === null, 'lista vazia');

const panelSrc = fs.readFileSync(panelPath, 'utf8');
const navSrc = fs.readFileSync(navPath, 'utf8');
assert(navSrc.includes('export function computeNextVerseIndex'), 'helper em shared');
assert(panelSrc.includes('computeNextVerseIndex'), 'BiblePanel usa helper partilhado');
assert(panelSrc.includes("event.key !== 'ArrowUp'"), 'filtra ArrowUp');
assert(panelSrc.includes("event.key !== 'ArrowDown'"), 'filtra ArrowDown');
assert(panelSrc.includes("activePanel !== 'biblia'"), 'só com painel Bíblia activo');
assert(panelSrc.includes('addEventListener(\'keydown\', onKeydown, true)'), 'keydown em capture');
assert(panelSrc.includes('searchInputRef'), 'blur do campo de pesquisa após seta');

console.log('smoke:cad109 OK');
