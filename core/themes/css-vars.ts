import type { ThemeDefinition } from '../../shared/types/theme.js';

/** Mapeia tokens do theme.json para CSS variables consumidas pelo Tailwind (CA-R06). */
export function themeToCssVariables(theme: ThemeDefinition): Record<string, string> {
  const vars: Record<string, string> = {
    '--lp-color-primary': theme.colors.primary,
    '--lp-color-action-bar': theme.colors.actionBar ?? '#0369a1',
    '--lp-color-background': theme.colors.background,
    '--lp-color-surface': theme.colors.surface,
    '--lp-color-text': theme.colors.text,
    '--lp-color-muted': theme.colors.muted ?? '#94a3b8',
    '--lp-color-accent': theme.colors.accent ?? theme.colors.primary,
    '--lp-font-family':
      theme.typography?.fontFamily ??
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };
    return vars;
}

export function cssVariablesBlock(theme: ThemeDefinition): string {
  const entries = Object.entries(themeToCssVariables(theme))
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
  return `:root {\n${entries}\n}`;
}
