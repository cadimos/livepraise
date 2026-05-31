import { computed, onScopeDispose, ref, watch } from 'vue';
import {
  counterElapsedMs,
  decodeServiceTimerValor,
  defaultServiceTimerState,
  displayMsForMode,
  encodeServiceTimerState,
  pauseServiceTimer,
  resetServiceTimer,
  startServiceTimer,
  type ServiceTimerMode,
  type ServiceTimerState,
  type ServiceTimerTarget,
  type ServiceTimerTargetKind,
} from '@shared/service-timer';
import type { DisplayAssignment } from '@shared/types/live';
import { fetchJson } from './useApi';
import { useExternalDevices } from './useExternalDevices';
import { useLiveSocket } from './useLiveSocket';

const STORAGE_KEY = 'livepraise.serviceTimer.draft';

export interface TimerMonitorRow {
  key: string;
  kind: ServiceTimerTargetKind;
  id: string;
  label: string;
  roleHint: string;
  enabled: boolean;
  mode: ServiceTimerMode;
}

function loadDraft(): ServiceTimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultServiceTimerState();
    return decodeServiceTimerValor(raw) ?? defaultServiceTimerState();
  } catch {
    return defaultServiceTimerState();
  }
}

function saveDraft(state: ServiceTimerState): void {
  localStorage.setItem(STORAGE_KEY, encodeServiceTimerState(state));
}

function targetKey(kind: ServiceTimerTargetKind, id: string): string {
  return `${kind}:${id}`;
}

function buildTargets(rows: TimerMonitorRow[]): ServiceTimerTarget[] {
  return rows
    .filter((r) => r.enabled)
    .map((r) => ({ kind: r.kind, id: r.id, mode: r.mode }));
}

const state = ref<ServiceTimerState>(loadDraft());
const rows = ref<TimerMonitorRow[]>([]);
const loading = ref(false);
const tick = ref(0);
let tickInterval: ReturnType<typeof setInterval> | undefined;

function startLocalTick(): void {
  if (tickInterval) return;
  tickInterval = setInterval(() => {
    tick.value += 1;
  }, 250);
}

function stopLocalTick(): void {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = undefined;
}

function syncRowsFromState(
  monitors: TimerMonitorRow[],
  targets: ServiceTimerTarget[],
): TimerMonitorRow[] {
  const byKey = new Map(targets.map((t) => [targetKey(t.kind, t.id), t]));
  return monitors.map((row) => {
    const target = byKey.get(row.key);
    if (!target) {
      return { ...row, enabled: false, mode: row.mode };
    }
    return { ...row, enabled: true, mode: target.mode };
  });
}

function publish(next: ServiceTimerState): void {
  state.value = next;
  saveDraft(next);
  const { sendAction } = useLiveSocket();
  sendAction('serviceTimer', encodeServiceTimerState(next));
}

export function useServiceTimer() {
  const { onlineDevices } = useExternalDevices();
  const { lastAction } = useLiveSocket();

  watch(
    lastAction,
    (action) => {
      if (action?.acao !== 'serviceTimer') return;
      const remote = decodeServiceTimerValor(action.valor);
      if (!remote) return;
      state.value = remote;
      rows.value = syncRowsFromState(rows.value, remote.targets);
      if (remote.running) startLocalTick();
      else stopLocalTick();
    },
    { immediate: true },
  );

  async function loadMonitors(): Promise<void> {
    loading.value = true;
    try {
      const data = await fetchJson<{
        config?: { assignments?: DisplayAssignment[] };
      }>('/displays/config');
      const assignments = data.config?.assignments ?? [];
      const displayRows: TimerMonitorRow[] = assignments
        .filter((a) => a.role === 'projection' || a.role === 'stage-return')
        .map((a) => ({
          key: targetKey('display', String(a.displayId)),
          kind: 'display' as const,
          id: String(a.displayId),
          label: a.label,
          roleHint: a.role,
          enabled: false,
          mode: a.role === 'stage-return' ? ('counter' as const) : ('timer' as const),
        }));

      const externalRows: TimerMonitorRow[] = onlineDevices.value.map((d) => ({
        key: targetKey('external', d.deviceId),
        kind: 'external' as const,
        id: d.deviceId,
        label: d.label?.trim() || d.name || d.deviceId.slice(0, 8),
        roleHint: d.profile,
        enabled: false,
        mode: d.profile === 'stage' || d.profile === 'player' ? 'counter' : 'timer',
      }));

      const merged = [...displayRows, ...externalRows];
      rows.value = syncRowsFromState(merged, state.value.targets);
    } finally {
      loading.value = false;
    }
  }

  function applyRows(): void {
    const next: ServiceTimerState = {
      ...state.value,
      active: state.value.active,
      targets: buildTargets(rows.value),
    };
    publish(next);
  }

  function setActive(active: boolean): void {
    if (!active) {
      rows.value = rows.value.map((row) => ({ ...row, enabled: false }));
      publish(
        pauseServiceTimer({
          ...state.value,
          active: false,
          targets: [],
        }),
      );
      stopLocalTick();
      return;
    }
    publish({ ...state.value, active: true });
  }

  function setTimerMinutes(minutes: number): void {
    const safe = Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
    publish({
      ...state.value,
      timerDurationMs: Math.round(safe * 60 * 1000),
    });
  }

  function toggleRunning(): void {
    const next = state.value.running
      ? pauseServiceTimer(state.value)
      : startServiceTimer(state.value);
    publish(next);
    if (next.running) startLocalTick();
    else stopLocalTick();
  }

  function reset(): void {
    publish(resetServiceTimer(state.value));
    stopLocalTick();
  }

  function updateRow(
    key: string,
    patch: Partial<Pick<TimerMonitorRow, 'enabled' | 'mode'>>,
  ): void {
    rows.value = rows.value.map((row) =>
      row.key === key ? { ...row, ...patch } : row,
    );
    applyRows();
  }

  const timerMinutes = computed({
    get: () => Math.round(state.value.timerDurationMs / 60_000),
    set: (v: number) => setTimerMinutes(v),
  });

  const previewCounter = computed(() => {
    void tick.value;
    return displayMsForMode(state.value, 'counter');
  });

  const previewTimer = computed(() => {
    void tick.value;
    return displayMsForMode(state.value, 'timer');
  });

  const elapsedMs = computed(() => {
    void tick.value;
    return counterElapsedMs(state.value);
  });

  onScopeDispose(() => stopLocalTick());

  return {
    state,
    rows,
    loading,
    timerMinutes,
    previewCounter,
    previewTimer,
    elapsedMs,
    loadMonitors,
    setActive,
    toggleRunning,
    reset,
    updateRow,
    applyRows,
  };
}
