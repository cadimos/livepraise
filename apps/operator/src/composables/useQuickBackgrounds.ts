import { ref } from 'vue';
import { fetchJson, type QuickBackground } from './useApi';

const quickBackgrounds = ref<QuickBackground[]>([]);
const loading = ref(false);
const error = ref('');

export function useQuickBackgrounds() {
  async function reload(): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const data = await fetchJson<{ status: string; items: QuickBackground[] }>(
        '/background-rapido',
      );
      quickBackgrounds.value = data.items ?? [];
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erro ao carregar fundos rápidos';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { quickBackgrounds, loading, error, reload };
}
