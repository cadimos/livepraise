import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cp } from 'node:fs/promises';
import { bundledFontsSourceRoot, loadBundledFontsManifest } from './manifest.js';

function livepraiseHome(): string {
  return path.join(process.env.LIVEPRAISE_HOME ?? os.homedir(), 'livepraise');
}

/**
 * Sincroniza fontes empacotadas de resources/fonts → ~/livepraise/fonts.
 * Copia manifest.json e cada família declarada (novos ficheiros; não apaga customizações).
 */
export async function syncBundledFontsToHome(): Promise<void> {
  const sourceRoot = bundledFontsSourceRoot();
  if (!fs.existsSync(sourceRoot)) return;

  loadBundledFontsManifest(true);

  const targetRoot = path.join(livepraiseHome(), 'fonts');
  fs.mkdirSync(targetRoot, { recursive: true });

  const manifestSrc = path.join(sourceRoot, 'manifest.json');
  const manifestDest = path.join(targetRoot, 'manifest.json');
  if (fs.existsSync(manifestSrc)) {
    await cp(manifestSrc, manifestDest, { force: true });
  }

  for (const family of loadBundledFontsManifest().families) {
    const srcDir = path.join(sourceRoot, family.id);
    if (!fs.existsSync(srcDir)) continue;

    const destDir = path.join(targetRoot, family.id);
    fs.mkdirSync(destDir, { recursive: true });

    for (const fileName of family.files) {
      const srcFile = path.join(srcDir, fileName);
      if (!fs.existsSync(srcFile)) continue;
      await cp(srcFile, path.join(destDir, fileName), { force: true });
    }
  }
}
