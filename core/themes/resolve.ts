import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isSafePathSegment } from '../security/safe-segment.js';
import type { ThemeDefinition, ThemeSummary } from '../../shared/types/theme.js';

function appRoot(): string {
  return process.env.LIVEPRAISE_APP_ROOT ?? process.cwd();
}

function livepraiseHome(): string {
  return path.join(process.env.LIVEPRAISE_HOME ?? os.homedir(), 'livepraise');
}

function themeRoots(): string[] {
  const roots = [
    path.join(appRoot(), 'themes'),
    path.join(livepraiseHome(), 'themes'),
  ];
  return [...new Set(roots.map((r) => path.normalize(r)))];
}

function readThemeFile(themePath: string): ThemeDefinition | null {
  try {
    const raw = fs.readFileSync(themePath, 'utf8');
    return JSON.parse(raw) as ThemeDefinition;
  } catch {
    return null;
  }
}

/** Lista temas disponíveis (app + ~/livepraise/themes). */
export function listThemes(): ThemeSummary[] {
  const seen = new Map<string, ThemeSummary>();

  for (const root of themeRoots()) {
    if (!fs.existsSync(root)) continue;

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const themePath = path.join(root, entry.name, 'theme.json');
      if (!fs.existsSync(themePath)) continue;

      const theme = readThemeFile(themePath);
      if (!theme) continue;

      seen.set(entry.name, {
        id: entry.name,
        label: theme.label ?? theme.name ?? entry.name,
        version: theme.version,
      });
    }
  }

  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Resolve theme.json por id (preferência: ~/livepraise sobre app). */
export function resolveTheme(themeId: string): ThemeDefinition | null {
  if (!isSafePathSegment(themeId)) return null;

  const candidates: string[] = [];

  for (const root of [...themeRoots()].reverse()) {
    candidates.push(path.join(root, themeId, 'theme.json'));
  }

  for (const themePath of candidates) {
    const theme = readThemeFile(themePath);
    if (theme) return theme;
  }

  return null;
}

export function resolveThemeAssetsDir(themeId: string): string | null {
  if (!isSafePathSegment(themeId)) return null;

  for (const root of [...themeRoots()].reverse()) {
    const dir = path.join(root, themeId, 'assets');
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}
