#!/usr/bin/env node
/**
 * Smoke CAD-190: histórico de pesquisa bíblica (shared).
 */
import {
  BIBLE_SEARCH_HISTORY_DEFAULT_LIMIT,
  clampBibleSearchHistoryLimit,
  pushBibleSearchHistoryEntry,
  sanitizeBibleSearchHistory,
} from '../dist/shared/bible-search-history.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  clampBibleSearchHistoryLimit(99) === 20,
  'clamp max',
);
assert(
  clampBibleSearchHistoryLimit(0) === 1,
  'clamp min',
);
assert(
  clampBibleSearchHistoryLimit(NaN) === BIBLE_SEARCH_HISTORY_DEFAULT_LIMIT,
  'clamp default',
);

let history = pushBibleSearchHistoryEntry([], 'mat 5 1', 5);
history = pushBibleSearchHistoryEntry(history, 'jo 3 16', 5);
history = pushBibleSearchHistoryEntry(history, 'mat 5 1', 5);
assert(history.length === 2, 'dedupe and length');
assert(history[0] === 'mat 5 1', 'most recent first');

history = pushBibleSearchHistoryEntry(history, 'rm 8 28', 2);
assert(history.length === 2, 'respect limit');
assert(history[0] === 'rm 8 28', 'newest at head');

const sanitized = sanitizeBibleSearchHistory(
  ['  gn 1 1  ', 'gn 1 1', 42, '', 'ex 20'],
  3,
);
assert(sanitized.length === 2, 'sanitize dedupe');
assert(sanitized[0] === 'gn 1 1', 'sanitize trim');

console.log('smoke-cad190: ok');
