import { createI18n } from 'vue-i18n';
import { fetchJson } from './composables/useApi';

export const DEFAULT_LOCALE = 'pt-BR';

const fallbackMessages = {
  app: { name: 'Live Praise', operator: 'Operador' },
};

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    [DEFAULT_LOCALE]: fallbackMessages,
  },
});

export async function loadLocale(locale: string): Promise<void> {
  const data = await fetchJson<{ app: { name: string; operator: string } }>(
    `/locales/${locale}.json`,
  );
  i18n.global.setLocaleMessage(locale, data);
  i18n.global.locale.value = locale as typeof DEFAULT_LOCALE;
}
