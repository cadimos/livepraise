import { ref } from 'vue';
import { fetchJson } from './useApi';
import {
  isTextfillDiagnosticsEnabled,
  setTextfillDiagnosticsEnabled,
} from '@shared/projection-textfill-diagnostics';

export interface TextfillDiagnosticEntry {
  id: string;
  ts: string;
  surface: string;
  mode: 'preview' | 'output';
  pass: number;
  resultFontPx: number;
  minFontPx: number;
  maxFontPx: number;
  textfillEnabled: boolean;
  loBound: number;
  hiBound: number;
  box: { clientW: number; clientH: number; scrollW: number; scrollH: number };
  root: { clientW: number; clientH: number };
  stage?: { clientW: number; clientH: number; dataScreen?: string };
  textSnippet: string;
}

const enabled = ref(isTextfillDiagnosticsEnabled());
const items = ref<TextfillDiagnosticEntry[]>([]);
const logPath = ref('');
const entryCount = ref(0);
const loading = ref(false);
const error = ref('');

export function useTextfillDiagnostics() {
  async function refresh(): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const [meta, list] = await Promise.all([
        fetchJson<{ path: string; count: number }>('/api/system/textfill-diagnostics/meta'),
        fetchJson<{ path: string; items: TextfillDiagnosticEntry[] }>(
          '/api/system/textfill-diagnostics?limit=80',
        ),
      ]);
      logPath.value = meta.path ?? list.path ?? '';
      entryCount.value = meta.count ?? list.items.length;
      items.value = list.items ?? [];
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erro ao carregar diagnóstico';
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function clear(): Promise<boolean> {
    loading.value = true;
    error.value = '';
    try {
      await fetchJson('/api/system/textfill-diagnostics', { method: 'DELETE' });
      items.value = [];
      entryCount.value = 0;
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erro ao limpar diagnóstico';
      return false;
    } finally {
      loading.value = false;
    }
  }

  function setEnabled(value: boolean): void {
    enabled.value = value;
    setTextfillDiagnosticsEnabled(value);
  }

  async function exportJsonl(): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const list = await fetchJson<{ items: TextfillDiagnosticEntry[] }>(
        '/api/system/textfill-diagnostics?limit=800',
      );
      const entries = list.items ?? [];
      const lines = entries.map((entry) => JSON.stringify(entry)).join('\n');
      const blob = new Blob([lines ? `${lines}\n` : ''], {
        type: 'application/x-ndjson;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      anchor.href = url;
      anchor.download = `livepraise-textfill-diagnostics-${stamp}.jsonl`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erro ao exportar diagnóstico';
    } finally {
      loading.value = false;
    }
  }

  return {
    enabled,
    items,
    logPath,
    entryCount,
    loading,
    error,
    refresh,
    clear,
    setEnabled,
    exportJsonl,
  };
}
