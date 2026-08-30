import { readonly, ref, watch } from 'vue';
import { readAuthToken } from '@shared/auth-session';
import {
  sanitizeOperatorQueueTabs,
  type OperatorQueueState,
  type OperatorQueueTab,
} from '@shared/types/operator-queue';
import { apiBase } from './useApi';
import { subscribeLiveSocket } from './useLiveSocket';
import { usePreferences } from './usePreferences';

const enabled = ref(false);
const revision = ref(0);
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const updatedAt = ref<string | null>(null);
const updatedBy = ref<string | null>(null);

let started = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let suppressSnapshot: string | null = null;
let pushPending = false;

function localTabs(): OperatorQueueTab[] {
  const { prefs } = usePreferences();
  return sanitizeOperatorQueueTabs(prefs.value.chromeTabs) ?? [];
}

function authHeaders(): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const token = readAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

function applyServerState(state: OperatorQueueState): void {
  if (state.revision < revision.value) return;
  revision.value = state.revision;
  enabled.value = state.enabled;
  updatedAt.value = state.updatedAt;
  updatedBy.value = state.updatedBy;
  if (!state.enabled) return;

  suppressSnapshot = JSON.stringify(state.tabs);
  usePreferences().applySharedQueueTabs(state.tabs);
}

async function requestUpdate(
  nextEnabled: boolean,
  tabs?: OperatorQueueTab[],
): Promise<boolean> {
  saving.value = true;
  error.value = '';
  try {
    const res = await fetch(`${apiBase()}/api/operator-queue`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        expectedRevision: revision.value,
        enabled: nextEnabled,
        ...(tabs ? { tabs } : {}),
      }),
    });
    const body = await res.json() as {
      state?: OperatorQueueState;
      error?: string;
      message?: string;
    };
    if (res.status === 409 && body.state) {
      applyServerState(body.state);
      error.value = body.error ?? 'A fila foi atualizada por outro operador.';
      return false;
    }
    if (!res.ok || !body.state) {
      throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
    }
    applyServerState(body.state);
    return true;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Falha ao sincronizar a fila.';
    return false;
  } finally {
    saving.value = false;
  }
}

async function pushLocalQueue(): Promise<void> {
  if (!enabled.value) return;
  if (saving.value) {
    pushPending = true;
    return;
  }
  await requestUpdate(true, localTabs());
  if (pushPending) {
    pushPending = false;
    void pushLocalQueue();
  }
}

function schedulePush(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void pushLocalQueue(), 250);
}

async function loadState(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch(`${apiBase()}/api/operator-queue`, {
      headers: authHeaders(),
    });
    const body = await res.json() as {
      state?: OperatorQueueState;
      error?: string;
      message?: string;
    };
    if (!res.ok || !body.state) {
      throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
    }
    applyServerState(body.state);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Falha ao carregar a fila compartilhada.';
  } finally {
    loading.value = false;
  }
}

export function startOperatorQueueSync(): void {
  if (started) return;
  started = true;
  const { prefs } = usePreferences();

  subscribeLiveSocket((event) => {
    if (event.type === 'operator-queue-sync' && event.operatorQueueState) {
      applyServerState(event.operatorQueueState);
    }
  });

  watch(
    () => JSON.stringify(sanitizeOperatorQueueTabs(prefs.value.chromeTabs) ?? []),
    (snapshot) => {
      if (snapshot === suppressSnapshot) {
        suppressSnapshot = null;
        return;
      }
      if (enabled.value) schedulePush();
    },
  );

  void loadState();
}

export async function setOperatorQueueSyncEnabled(next: boolean): Promise<boolean> {
  if (next === enabled.value) return true;
  return requestUpdate(next, next ? localTabs() : undefined);
}

export function useOperatorQueueSync() {
  return {
    enabled: readonly(enabled),
    revision: readonly(revision),
    loading: readonly(loading),
    saving: readonly(saving),
    error: readonly(error),
    updatedAt: readonly(updatedAt),
    updatedBy: readonly(updatedBy),
    setEnabled: setOperatorQueueSyncEnabled,
    refresh: loadState,
  };
}
