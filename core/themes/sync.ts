import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cp } from 'node:fs/promises';
import { BUNDLED_THEME_IDS, mergeThemeDefinitions, normalizeTheme } from './normalize.js';

function appRoot(): string {
  return process.env.LIVEPRAISE_APP_ROOT ?? process.cwd();
}

function livepraiseHome(): string {
  return path.join(process.env.LIVEPRAISE_HOME ?? os.homedir(), 'livepraise');
}

function readThemeJson(themePath: string) {
  try {
    return JSON.parse(fs.readFileSync(themePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Actualiza temas empacotados em ~/livepraise/themes (novas chaves, sem apagar customizações).
 * Máquinas existentes e desenvolvimento recebem tokens de selecção e outras novidades.
 */
export async function syncBundledThemesToHome(): Promise<void> {
  const sourceRoot = path.join(appRoot(), 'themes');
  if (!fs.existsSync(sourceRoot)) return;

  const targetRoot = path.join(livepraiseHome(), 'themes');
  fs.mkdirSync(targetRoot, { recursive: true });

  for (const themeId of BUNDLED_THEME_IDS) {
    const srcDir = path.join(sourceRoot, themeId);
    const srcThemePath = path.join(srcDir, 'theme.json');
    if (!fs.existsSync(srcThemePath)) continue;

    const bundledRaw = readThemeJson(srcThemePath);
    if (!bundledRaw) continue;
    const bundled = normalizeTheme(bundledRaw);

    const destDir = path.join(targetRoot, themeId);
    fs.mkdirSync(destDir, { recursive: true });

    const destThemePath = path.join(destDir, 'theme.json');
    const existingRaw = fs.existsSync(destThemePath) ? readThemeJson(destThemePath) : null;
    const merged = existingRaw
      ? mergeThemeDefinitions(existingRaw, bundled)
      : bundled;

    fs.writeFileSync(destThemePath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

    const srcAssets = path.join(srcDir, 'assets');
    const destAssets = path.join(destDir, 'assets');
    if (fs.existsSync(srcAssets)) {
      await cp(srcAssets, destAssets, { recursive: true, force: false });
    }
  }
}
