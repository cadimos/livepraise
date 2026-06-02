import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_THEME_SELECTION,
  type ThemeDefinition,
  type ThemeSelectionColors,
} from '../../shared/types/theme.js';

export const BUNDLED_THEME_IDS = ['default', 'high-contrast'] as const;

function appRoot(): string {
  return process.env.LIVEPRAISE_APP_ROOT ?? process.cwd();
}

function readThemeJson(themePath: string): ThemeDefinition | null {
  try {
    const raw = fs.readFileSync(themePath, 'utf8');
    return JSON.parse(raw) as ThemeDefinition;
  } catch {
    return null;
  }
}

/** Tema `default` empacotado (sem normalizar — evita recursão). */
export function readBundledDefaultThemeRaw(): ThemeDefinition {
  const themePath = path.join(appRoot(), 'themes', 'default', 'theme.json');
  const fromDisk = readThemeJson(themePath);
  if (fromDisk) return fromDisk;
  throw new Error(`Tema default não encontrado: ${themePath}`);
}

function mergeSelection(
  partial: Partial<ThemeSelectionColors> | undefined,
  defaults: ThemeSelectionColors,
): ThemeSelectionColors {
  return { ...defaults, ...partial };
}

/** Preenche tokens em falta com o tema `default` empacotado + `DEFAULT_THEME_SELECTION`. */
export function normalizeTheme(theme: ThemeDefinition): ThemeDefinition {
  const bundledDefault = readBundledDefaultThemeRaw();
  const defaultSelection = mergeSelection(
    bundledDefault.colors.selection,
    DEFAULT_THEME_SELECTION,
  );

  return {
    ...bundledDefault,
    ...theme,
    name: theme.name || bundledDefault.name,
    version: theme.version || bundledDefault.version,
    label: theme.label ?? bundledDefault.label,
    colors: {
      ...bundledDefault.colors,
      ...theme.colors,
      selection: mergeSelection(theme.colors.selection, defaultSelection),
    },
    typography: {
      ...bundledDefault.typography,
      ...theme.typography,
    },
  };
}

/** Preserva valores do utilizador; preenche chaves novas a partir do empacotado. */
export function mergeThemeDefinitions(
  existing: ThemeDefinition,
  bundled: ThemeDefinition,
): ThemeDefinition {
  return normalizeTheme({
    ...bundled,
    ...existing,
    name: existing.name || bundled.name,
    label: existing.label ?? bundled.label,
    version: bundled.version,
    colors: {
      ...bundled.colors,
      ...existing.colors,
      selection: {
        ...bundled.colors.selection,
        ...existing.colors.selection,
      },
    },
    typography: {
      ...bundled.typography,
      ...existing.typography,
    },
  });
}
