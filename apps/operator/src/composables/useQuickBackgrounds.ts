import { ref } from 'vue';
import { fetchJson, type QuickBackground } from './useApi';
import { normalizeMediaPathForApi } from '../utils/media-path';

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

  async function setInitial(
    payload: { id: number } | { url: string; diretorio: 'imagens' | 'videos' },
  ): Promise<void> {
    const body =
      'id' in payload
        ? payload
        : {
            url: normalizeMediaPathForApi(payload.url, payload.diretorio),
            diretorio: payload.diretorio,
          };
    await fetchJson<{ status: string }>('/background-rapido/inicial', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await reload();
  }

  return { quickBackgrounds, loading, error, reload, setInitial };
}
