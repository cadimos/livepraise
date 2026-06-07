/**
 * Utilitário partilhado para gerar ficheiros de locale a partir de pt-BR.json.
 */
import fs from 'node:fs';
import path from 'node:path';

/** @param {unknown} value @param {(value: string) => string} translate */
export function walkLocale(value, translate) {
  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === 'string' ? translate(item) : walkLocale(item, translate),
    );
  }
  if (value && typeof value === 'object') {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = walkLocale(entry, translate);
    }
    return out;
  }
  if (typeof value === 'string') return translate(value);
  return value;
}

/**
 * @param {object} options
 * @param {string} options.root
 * @param {string} options.code
 * @param {(value: string) => string} options.translate
 * @param {Record<string, string>} options.meta
 */
export function buildLocaleFile({ root, code, translate, meta }) {
  const ptPath = path.join(root, 'locales/pt-BR.json');
  const outPath = path.join(root, `locales/${code}.json`);
  const installPath = path.join(root, `install/locales/${code}.json`);

  const pt = JSON.parse(fs.readFileSync(ptPath, 'utf8'));
  const localized = walkLocale(pt, translate);
  localized.locales = { meta };

  const json = `${JSON.stringify(localized, null, 2)}\n`;
  fs.writeFileSync(outPath, json);
  fs.writeFileSync(installPath, json);
  return { outPath, installPath };
}
