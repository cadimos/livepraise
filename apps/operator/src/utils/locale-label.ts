import { useI18n } from 'vue-i18n';

const FALLBACK_LABELS: Record<string, string> = {
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English',
};

/** Rótulo legível para o selector de idioma (chave `locales.meta.*` ou fallback). */
export function useLocaleLabel() {
  const { t, te } = useI18n();

  return (code: string): string => {
    const key = `locales.meta.${code}`;
    if (te(key)) return t(key);
    return FALLBACK_LABELS[code] ?? code;
  };
}
