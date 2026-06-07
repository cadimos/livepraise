#!/usr/bin/env node
/**
 * Gera locales/es-ES.json a partir de pt-BR.json via en-US (paridade de chaves).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import enToEs from './locale-maps/en-to-es.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PT = path.join(ROOT, 'locales/pt-BR.json');
const EN = path.join(ROOT, 'locales/en-US.json');
const OUT = path.join(ROOT, 'locales/es-ES.json');
const INSTALL = path.join(ROOT, 'install/locales/es-ES.json');

/** @param {unknown} ptNode @param {unknown} enNode @param {(en: string) => string} toEs */
function walkPtEnToEs(ptNode, enNode, toEs) {
  if (typeof ptNode === 'string' && typeof enNode === 'string') {
    return toEs(enNode);
  }
  if (Array.isArray(ptNode) && Array.isArray(enNode)) {
    return ptNode.map((item, index) => walkPtEnToEs(item, enNode[index], toEs));
  }
  if (
    ptNode &&
    enNode &&
    typeof ptNode === 'object' &&
    typeof enNode === 'object' &&
    !Array.isArray(ptNode)
  ) {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const key of Object.keys(ptNode)) {
      out[key] = walkPtEnToEs(ptNode[key], enNode[key], toEs);
    }
    return out;
  }
  return typeof enNode === 'string' ? toEs(enNode) : enNode;
}

/** @param {string} en */
function toSpanish(en) {
  return enToEs[en] ?? en;
}

const pt = JSON.parse(fs.readFileSync(PT, 'utf8'));
const en = JSON.parse(fs.readFileSync(EN, 'utf8'));
const es = walkPtEnToEs(pt, en, toSpanish);
es.locales = {
  meta: {
    'pt-BR': 'Português (Brasil)',
    'en-US': 'English',
    'pt-PT': 'Português (Portugal)',
    'es-ES': 'Español',
  },
};

const json = `${JSON.stringify(es, null, 2)}\n`;
fs.writeFileSync(OUT, json);
fs.writeFileSync(INSTALL, json);
console.log('build-es-es-locale: OK');
