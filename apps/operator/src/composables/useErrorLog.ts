import { ref } from 'vue';
import { fetchJson } from './useApi';

export type ErrorLogLevel = 'error' | 'warn';

export interface ErrorLogEntry {
  id: string;
  ts: string;
  level: ErrorLogLevel;
  source: string;
  message: string;
  detail?: string;
}

interface ErrorLogListResponse {
  status: string;
  items: ErrorLogEntry[];
}

const items = ref<ErrorLogEntry[]>([]);
const loading = ref(false);
const error = ref('');

export function useErrorLog() {
  async function refresh(): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const data = await fetchJson<ErrorLogListResponse>('/api/system/error-log?limit=200');
      items.value = data.items ?? [];
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erro ao carregar logs';
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function clear(): Promise<boolean> {
    loading.value = true;
    error.value = '';
    try {
      await fetchJson('/api/system/error-log', { method: 'DELETE' });
      items.value = [];
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erro ao limpar logs';
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    items,
    loading,
    error,
    refresh,
    clear,
  };
}
