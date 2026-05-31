import fs from 'node:fs';
import path from 'node:path';
import type { MediaKind } from '../../core/security/media-file.js';

/** Garante categoria segura (cria pasta se ainda não existir). */
export function ensureWritableMediaCategory(
  home: string,
  kind: MediaKind,
  codigoParam: string,
): string | null {
  const raw = decodeURIComponent(String(codigoParam));
  const base = path.basename(raw);
  if (!base || base !== raw || raw.includes('..')) return null;

  const root = path.join(home, kind);
  const fullPath = path.join(root, base);
  const resolved = path.resolve(fullPath);
  const resolvedRoot = path.resolve(root);
  if (
    resolved !== resolvedRoot &&
    !resolved.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    return null;
  }

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  if (!fs.statSync(fullPath).isDirectory()) return null;
  return fullPath;
}
