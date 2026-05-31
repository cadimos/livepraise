import { ref } from 'vue';
import { fetchJson } from './useApi';
import { DEFAULT_LOCALE, loadLocale } from '../i18n';
import { usePreferences } from './usePreferences';

const availableLocales = ref<string[]>([DEFAULT_LOCALE]);

export function useLocale() {
  const { setLocale } = usePreferences();

  async function refreshLocales() {
    try {
      const data = await fetchJson<{ status: string; items?: string[] }>('/locales');
      const items = data.items ?? [];
      availableLocales.value = items.length ? items : [DEFAULT_LOCALE];
    } catch (error) {
      console.error('Falha ao carregar idiomas', error);
      availableLocales.value = [DEFAULT_LOCALE];
    }
  }

  async function changeLocale(locale: string) {
    if (!locale) return;
    await loadLocale(locale);
    setLocale(locale);
  }

  return {
    availableLocales,
    refreshLocales,
    changeLocale,
  };
}
