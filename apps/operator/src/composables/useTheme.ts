import { ref, watch } from 'vue';
import { fetchJson } from './useApi';
import { usePreferences } from './usePreferences';

export interface ThemeSummary {
  id: string;
  label: string;
  version: string;
}

export interface ThemeColors {
  primary: string;
  actionBar?: string;
  background: string;
  surface: string;
  text: string;
  muted?: string;
  accent?: string;
}

export interface ThemeDefinition {
  name: string;
  label?: string;
  version: string;
  colors: ThemeColors;
  typography?: { fontFamily?: string };
}

const themes = ref<ThemeSummary[]>([]);
const activeTheme = ref<ThemeDefinition | null>(null);
const activeThemeId = ref('default');
const ready = ref(false);

function applyThemeVariables(theme: ThemeDefinition): void {
  const root = document.documentElement;
  root.style.setProperty('--lp-color-primary', theme.colors.primary);
  root.style.setProperty('--lp-color-action-bar', theme.colors.actionBar ?? '#0369a1');
  root.style.setProperty('--lp-color-background', theme.colors.background);
  root.style.setProperty('--lp-color-surface', theme.colors.surface);
  root.style.setProperty('--lp-color-text', theme.colors.text);
  root.style.setProperty('--lp-color-muted', theme.colors.muted ?? '#94a3b8');
  root.style.setProperty('--lp-color-accent', theme.colors.accent ?? theme.colors.primary);
  root.style.setProperty(
    '--lp-font-family',
    theme.typography?.fontFamily ??
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  );
  document.body.style.fontFamily = 'var(--lp-font-family)';
  document.body.style.backgroundColor = 'var(--lp-color-background)';
  document.body.style.color = 'var(--lp-color-text)';
}

export function useTheme() {
  const { prefs, setThemeId } = usePreferences();

  async function loadThemes(): Promise<void> {
    const data = await fetchJson<{ status: string; items: ThemeSummary[] }>('/themes');
    themes.value = data.items ?? [];
  }

  async function applyTheme(themeId: string): Promise<void> {
    const theme = await fetchJson<ThemeDefinition>(`/themes/${themeId}/theme.json`);
    activeTheme.value = theme;
    activeThemeId.value = themeId;
    applyThemeVariables(theme);
    setThemeId(themeId);
  }

  async function initTheme(): Promise<void> {
    await loadThemes();
    const preferred = prefs.value.themeId;
    const fallback = themes.value[0]?.id ?? 'default';
    const themeId = themes.value.some((t) => t.id === preferred) ? preferred : fallback;
    await applyTheme(themeId);
    ready.value = true;
  }

  watch(
    () => prefs.value.themeId,
    (id, prev) => {
      if (!ready.value || !id || id === prev || id === activeThemeId.value) return;
      void applyTheme(id);
    },
  );

  return {
    themes,
    activeTheme,
    activeThemeId,
    ready,
    initTheme,
    applyTheme,
  };
}
