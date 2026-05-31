#!/usr/bin/env node
import { normalizeTheme } from '../../dist/core/themes/normalize.js';
import { themeToCssVariables } from '../../dist/core/themes/css-vars.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const legacyCustom = {
  name: 'custom',
  version: '1.0.0',
  label: 'Custom antigo',
  colors: {
    primary: '#ff0000',
    background: '#111111',
    surface: '#222222',
    text: '#eeeeee',
  },
};

const normalized = normalizeTheme(legacyCustom);

assert(normalized.colors.primary === '#ff0000', 'preserva primary custom');
assert(normalized.colors.selection?.listBackground, 'preenche selection.listBackground');
assert(
  normalized.colors.selection?.listBackground === 'rgba(12, 74, 110, 0.4)',
  'fallback selection vem do default',
);

const vars = themeToCssVariables(legacyCustom);
assert(vars['--lp-selection-active-bg'], 'exporta CSS var de selecção');
assert(vars['--lp-color-primary'] === '#ff0000', 'exporta primary custom');

console.log('OK — normalize theme + selection fallback');
