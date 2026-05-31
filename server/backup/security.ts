import path from 'node:path';

/** CA-12: rejeita paths com traversal ou absolutos dentro do zip. */
export function assertSafeZipEntryName(entryName: string): void {
  const normalized = entryName.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error(`Entrada zip inválida (path absoluto): ${entryName}`);
  }
  const segments = normalized.split('/');
  for (const segment of segments) {
    if (segment === '..') {
      throw new Error(`Entrada zip inválida (zip slip): ${entryName}`);
    }
  }
}

export function safeJoinZipTarget(baseDir: string, entryName: string): string {
  assertSafeZipEntryName(entryName);
  const target = path.normalize(path.join(baseDir, entryName));
  const relative = path.relative(baseDir, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Destino de extração inválido: ${entryName}`);
  }
  return target;
}
