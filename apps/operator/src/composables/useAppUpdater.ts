import { computed, ref } from 'vue';

export type AppUpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available'; version: string }
  | { kind: 'downloading'; version: string; percent?: number }
  | { kind: 'ready'; version: string }
  | { kind: 'installing'; version: string }
  | { kind: 'error'; message: string; fallback: true };

type LivepraiseUpdaterBridge = {
  onUpdateStatus?: (callback: (status: AppUpdateStatus) => void) => void;
  installUpdate?: () => Promise<{ ok: boolean; reason?: string }>;
};

const status = ref<AppUpdateStatus>({ kind: 'idle' });
const dismissed = ref(false);
const installing = ref(false);
let started = false;

function bridge(): LivepraiseUpdaterBridge | undefined {
  return (window as Window & { livepraise?: LivepraiseUpdaterBridge }).livepraise;
}

function startAppUpdater(): void {
  if (started) return;
  started = true;
  const api = bridge();
  api?.onUpdateStatus?.((next) => {
    dismissed.value = false;
    if (next.kind === 'installing') installing.value = true;
    if (next.kind === 'error') installing.value = false;
    status.value = next;
  });
}

export function useAppUpdater() {
  startAppUpdater();

  const visible = computed(
    () => !dismissed.value && status.value.kind !== 'idle',
  );

  const percent = computed(() => {
    const current = status.value;
    if (current.kind !== 'downloading') return null;
    const value = current.percent;
    if (typeof value !== 'number' || Number.isNaN(value)) return null;
    return Math.min(100, Math.max(0, Math.round(value)));
  });

  const version = computed(() => {
    const current = status.value;
    if ('version' in current) return current.version;
    return '';
  });

  function dismiss(): void {
    const kind = status.value.kind;
    if (kind === 'downloading' || kind === 'ready' || kind === 'installing') {
      return;
    }
    dismissed.value = true;
  }

  async function installNow(): Promise<void> {
    const api = bridge();
    if (!api?.installUpdate) return;
    installing.value = true;
    status.value = {
      kind: 'installing',
      version: version.value || 'nova versão',
    };
    try {
      const result = await api.installUpdate();
      if (!result?.ok) {
        installing.value = false;
        status.value = {
          kind: 'error',
          message: result?.reason ?? 'updater-not-active',
          fallback: true,
        };
      }
    } catch (cause) {
      installing.value = false;
      status.value = {
        kind: 'error',
        message: cause instanceof Error ? cause.message : String(cause),
        fallback: true,
      };
    }
  }

  return { status, visible, percent, version, installing, dismiss, installNow };
}
