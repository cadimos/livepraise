import fs from 'node:fs';
import path from 'node:path';
import { isManifestFontFile } from '../fonts/manifest.js';
import { isSafePathSegment } from './safe-segment.js';

const FONT_EXTENSIONS = new Set(['.woff2', '.woff', '.ttf', '.otf']);

export function isAllowedFontExtension(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return FONT_EXTENSIONS.has(ext);
}

/**
 * Resolve ficheiro de fonte embutida em ~/livepraise/fonts/{familia}/{fileName}.
 * Allowlist via manifest.json; paridade conceptual com resolveMediaRelativePath.
 */
export function resolveBundledFontPath(
  home: string,
  familia: string,
  rawFileName: string,
): string | null {
  if (!isSafePathSegment(familia)) return null;

  const fileName = path.basename(String(rawFileName));
  if (!fileName || fileName !== rawFileName || fileName.includes('..')) return null;
  if (!isAllowedFontExtension(fileName)) return null;
  if (!isManifestFontFile(familia, fileName)) return null;

  const familyRoot = path.resolve(path.join(home, 'fonts', familia));
  const full = path.resolve(path.join(familyRoot, fileName));
  if (full !== familyRoot && !full.startsWith(`${familyRoot}${path.sep}`)) return null;

  try {
    const stat = fs.lstatSync(full);
    if (!stat.isFile()) return null;
    if (stat.isSymbolicLink()) return null;
  } catch {
    return null;
  }

  return full;
}
