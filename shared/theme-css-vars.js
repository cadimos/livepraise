import { DEFAULT_THEME_SELECTION, } from './types/theme.js';
/** Mapeia tokens do theme.json para CSS variables (browser-safe, sem fs). */
export function themeToCssVariables(theme) {
    const selection = { ...DEFAULT_THEME_SELECTION, ...theme.colors.selection };
    return {
        '--lp-color-primary': theme.colors.primary,
        '--lp-color-action-bar': theme.colors.actionBar ?? '#0369a1',
        '--lp-color-background': theme.colors.background,
        '--lp-color-surface': theme.colors.surface,
        '--lp-color-text': theme.colors.text,
        '--lp-color-muted': theme.colors.muted ?? '#94a3b8',
        '--lp-color-accent': theme.colors.accent ?? theme.colors.primary,
        '--lp-selection-list-bg': selection.listBackground,
        '--lp-selection-list-text': selection.listText,
        '--lp-selection-list-hover': selection.listHover,
        '--lp-selection-list-ring': selection.listRing,
        '--lp-selection-nav-bg': selection.navBackground,
        '--lp-selection-nav-text': selection.navText,
        '--lp-selection-nav-hover': selection.navHover,
        '--lp-selection-nav-chip-bg': selection.navChipBackground,
        '--lp-selection-nav-chip-border': selection.navChipBorder,
        '--lp-selection-nav-chip-hover': selection.navChipHover,
        '--lp-selection-active-bg': selection.activeBackground,
        '--lp-selection-active-text': selection.activeText,
        '--lp-selection-active-hover': selection.activeHover,
        '--lp-selection-active-ring': selection.activeRing,
        '--lp-font-family': theme.typography?.fontFamily ??
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    };
}
export function cssVariablesBlock(theme) {
    const entries = Object.entries(themeToCssVariables(theme))
        .map(([key, value]) => `  ${key}: ${value};`)
        .join('\n');
    return `:root {\n${entries}\n}`;
}
