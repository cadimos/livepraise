#!/usr/bin/env node
/**
 * Smoke CAD-113: playlist — sem rótulo duplicado "Conteúdo:" abaixo das abas.
 * O título da música fica só na aba (ChromeTabs); a faixa mostra apenas os versos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const panelPath = path.join(appRoot, 'apps/operator/src/components/ChromeTabPanel.vue');
const tabsPath = path.join(appRoot, 'apps/operator/src/components/ChromeTabs.vue');
const localePath = path.join(appRoot, 'locales/pt-BR.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const panel = fs.readFileSync(panelPath, 'utf8');
const tabs = fs.readFileSync(tabsPath, 'utf8');
const locale = fs.readFileSync(localePath, 'utf8');

assert(!panel.includes('contentFor'), 'ChromeTabPanel sem tabs.contentFor');
assert(!panel.includes('Conteúdo'), 'ChromeTabPanel sem rótulo Conteúdo');
assert(!panel.match(/uppercase tracking-wider/), 'sem cabeçalho de secção duplicado no painel');
assert(tabs.includes('{{ tab.label }}'), 'título permanece na aba da playlist');
assert(!locale.includes('"contentFor"'), 'chave i18n contentFor removida');
assert(panel.includes('playlist-verses-track'), 'faixa de versos mantida');

console.log('Smoke CAD-113 OK (playlist sem rótulo Conteúdo duplicado)');
