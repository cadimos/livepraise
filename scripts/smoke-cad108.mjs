#!/usr/bin/env node
/**
 * Smoke CAD-108: persistir pesquisa entre abas — queries e seleção bíblica em localStorage.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relPath) {
  return fs.readFileSync(path.join(appRoot, relPath), 'utf8');
}

const prefs = read('apps/operator/src/composables/usePreferences.ts');
const bible = read('apps/operator/src/components/panels/BiblePanel.vue');
const worship = read('apps/operator/src/components/panels/WorshipPanel.vue');
const images = read('apps/operator/src/components/panels/ImagesPanel.vue');
const videos = read('apps/operator/src/components/panels/VideosPanel.vue');

assert(prefs.includes("STORAGE_KEY = 'livepraise.operator.prefs'"), 'chave localStorage definida');
assert(prefs.includes('localStorage.setItem'), 'persistência em localStorage');
assert(prefs.includes('worshipSearchQuery'), 'campo worshipSearchQuery');
assert(prefs.includes('bibleSearchQuery'), 'campo bibleSearchQuery');
assert(prefs.includes('imageSearchQuery'), 'campo imageSearchQuery');
assert(prefs.includes('videoSearchQuery'), 'campo videoSearchQuery');
assert(prefs.includes('bibleSelectedBookId'), 'campo bibleSelectedBookId');
assert(prefs.includes('bibleSelectedChapter'), 'campo bibleSelectedChapter');
assert(prefs.includes('bibleSelectedVerse'), 'campo bibleSelectedVerse');
assert(prefs.includes('setBibleSelection'), 'setter seleção bíblica');

for (const [name, src] of [
  ['WorshipPanel', worship],
  ['ImagesPanel', images],
  ['VideosPanel', videos],
  ['BiblePanel', bible],
]) {
  assert(src.includes('searchQuery = computed'), `${name}: searchQuery computed`);
  assert(src.includes('usePreferences'), `${name}: usa usePreferences`);
}

assert(bible.includes('prefs.value.bibleSearchQuery'), 'BiblePanel lê bibleSearchQuery');
assert(bible.includes('setBibleSearchQuery'), 'BiblePanel grava bibleSearchQuery');
assert(bible.includes('restoreSavedSelection'), 'BiblePanel restaura seleção');
assert(bible.includes('persistSelection'), 'BiblePanel persiste seleção');

console.log('Smoke CAD-108 OK (pesquisa e seleção bíblica em localStorage entre abas)');
