import fs from 'node:fs';
import path from 'node:path';
import type { BundledFontFamilyManifest, BundledFontsManifest } from './types.js';

let cached: BundledFontsManifest | null = null;
let cachedRoot: string | null = null;

function appRoot(): string {
  return process.env.LIVEPRAISE_APP_ROOT ?? process.cwd();
}

export function bundledFontsSourceRoot(): string {
  return path.join(appRoot(), 'resources', 'fonts');
}

export function loadBundledFontsManifest(force = false): BundledFontsManifest {
  const root = bundledFontsSourceRoot();
  if (!force && cached && cachedRoot === root) return cached;

  const manifestPath = path.join(root, 'manifest.json');
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as BundledFontsManifest;
  if (!Array.isArray(raw.families)) {
    throw new Error('manifest.json inválido: families ausente');
  }

  cached = raw;
  cachedRoot = root;
  return raw;
}

export function getBundledFamilyManifest(
  familia: string,
): BundledFontFamilyManifest | null {
  return loadBundledFontsManifest().families.find((f) => f.id === familia) ?? null;
}

export function isManifestFontFile(familia: string, fileName: string): boolean {
  const family = getBundledFamilyManifest(familia);
  if (!family) return false;
  return family.files.includes(fileName);
}

export function listBundledFontFamilies(): BundledFontFamilyManifest[] {
  return [...loadBundledFontsManifest().families];
}
