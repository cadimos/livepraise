import type { ThemeDefinition } from '../../shared/types/theme.js';
import { cssVariablesBlock, themeToCssVariables as themeToCssVariablesBase } from '../../shared/theme-css-vars.js';
import { normalizeTheme } from './normalize.js';

/** Mapeia theme.json normalizado para CSS variables (servidor). */
export function themeToCssVariables(theme: ThemeDefinition): Record<string, string> {
  return themeToCssVariablesBase(normalizeTheme(theme));
}

export function cssVariablesBlockNormalized(theme: ThemeDefinition): string {
  return cssVariablesBlock(normalizeTheme(theme));
}
