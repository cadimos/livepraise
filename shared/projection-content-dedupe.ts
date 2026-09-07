/**
 * Deduplicação local do conteúdo já renderizado.
 *
 * A hash torna a comparação inicial barata; o conteúdo completo também é
 * comparado para que uma eventual colisão nunca suprima uma atualização real.
 */
export interface ProjectionContentDeduper {
  shouldApply(content: string): boolean;
  reset(): void;
  currentFingerprint(): string | null;
}

/** FNV-1a de 32 bits, estável em Node e nos browsers suportados. */
export function projectionContentFingerprint(content: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < content.length; index += 1) {
    const code = content.charCodeAt(index);
    hash ^= code & 0xff;
    hash = Math.imul(hash, 0x01000193);
    hash ^= code >>> 8;
    hash = Math.imul(hash, 0x01000193);
  }
  return `${content.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

export function createProjectionContentDeduper(): ProjectionContentDeduper {
  let previous: { fingerprint: string; content: string } | null = null;

  return {
    shouldApply(content: string): boolean {
      const fingerprint = projectionContentFingerprint(content);
      if (
        previous?.fingerprint === fingerprint &&
        previous.content === content
      ) {
        return false;
      }
      previous = { fingerprint, content };
      return true;
    },
    reset(): void {
      previous = null;
    },
    currentFingerprint(): string | null {
      return previous?.fingerprint ?? null;
    },
  };
}
