import { ref, watch } from 'vue';
import { themeToCssVariables } from '@shared/theme-css-vars';
import type { ThemeDefinition, ThemeSummary } from '@shared/types/theme';
import { fetchJson } from './useApi';
import { usePreferences } from './usePreferences';

const themes = ref<ThemeSummary[]>([]);
const activeTheme = ref<ThemeDefinition | null>(null);
const activeThemeId = ref('default');
const ready = ref(false);

function applyThemeVariables(theme: ThemeDefinition): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(themeToCssVariables(theme))) {
    root.style.setProperty(key, value);
  }
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

export type { ThemeDefinition, ThemeSummary };
