import fs from 'node:fs';
import path from 'node:path';

/** A2 — basename + allowlist (paridade resolveBibleFile). */
export function resolveMediaCategoryDir(
  home: string,
  kind: 'imagens' | 'videos',
  codigoParam: string,
): string | null {
  const raw = decodeURIComponent(String(codigoParam));
  const base = path.basename(raw);
  if (!base || base !== raw || raw.includes('..')) return null;

  const root = path.join(home, kind);
  if (!fs.existsSync(root)) return null;

  const allowed = fs.readdirSync(root);
  if (!allowed.includes(base)) return null;

  const fullPath = path.join(root, base);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) return null;

  const resolved = path.resolve(fullPath);
  const resolvedRoot = path.resolve(root);
  if (
    resolved !== resolvedRoot &&
    !resolved.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    return null;
  }

  return fullPath;
}
