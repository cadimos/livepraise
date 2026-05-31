import { onMounted, ref } from 'vue';
import fontsManifest from '../../../../resources/fonts/manifest.json';
import { fetchJson } from './useApi';
import type { BundledFontFamilyManifest } from '@core/fonts/types';

interface SystemFontsResponse {
  status: string;
  items: Array<{ family: string; localizedName: string }>;
}

const bundledFamilies = fontsManifest.families as BundledFontFamilyManifest[];

export function useProjectionFonts() {
  const systemFonts = ref<Array<{ family: string; localizedName: string }>>([]);
  const systemFontsLoading = ref(true);

  onMounted(async () => {
    try {
      const res = await fetchJson<SystemFontsResponse>('/api/system/fonts');
      systemFonts.value = res.items ?? [];
    } catch {
      systemFonts.value = [];
    } finally {
      systemFontsLoading.value = false;
    }
  });

  function bundledFamilyById(id: string): BundledFontFamilyManifest | undefined {
    return bundledFamilies.find((family) => family.id === id);
  }

  function resolveCssFamily(
    fontSource: 'bundled' | 'system',
    fontFamily: string,
  ): string {
    if (fontSource === 'bundled') {
      return bundledFamilyById(fontFamily)?.cssFamily ?? 'Roboto, sans-serif';
    }
    return `${fontFamily}, sans-serif`;
  }

  return {
    bundledFamilies,
    systemFonts,
    systemFontsLoading,
    bundledFamilyById,
    resolveCssFamily,
  };
}
