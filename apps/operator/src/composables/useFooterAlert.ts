import { ref } from 'vue';
import {
  defaultFooterAlertDraft,
  encodeFooterAlertState,
  type FooterAlertState,
  type FooterAlertTarget,
  type FooterAlertTargetKind,
} from '@shared/footer-alert';
import type { DisplayAssignment } from '@shared/types/live';
import { fetchJson } from './useApi';
import { useExternalDevices } from './useExternalDevices';
import { useLiveSocket } from './useLiveSocket';

const STORAGE_KEY = 'livepraise.footerAlert.draft';

export interface FooterAlertMonitorRow {
  key: string;
  kind: FooterAlertTargetKind;
  id: string;
  label: string;
  roleHint: string;
  enabled: boolean;
}

function loadDraft(): FooterAlertState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFooterAlertDraft();
    const parsed = JSON.parse(raw) as FooterAlertState;
    return { ...defaultFooterAlertDraft(), ...parsed, version: 1 };
  } catch {
    return defaultFooterAlertDraft();
  }
}

function saveDraft(state: FooterAlertState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function targetKey(kind: FooterAlertTargetKind, id: string): string {
  return `${kind}:${id}`;
}

function buildTargets(rows: FooterAlertMonitorRow[]): FooterAlertTarget[] {
  return rows
    .filter((r) => r.enabled)
    .map((r) => ({ kind: r.kind, id: r.id }));
}

function syncRowsFromState(
  monitors: FooterAlertMonitorRow[],
  targets: FooterAlertTarget[],
): FooterAlertMonitorRow[] {
  const enabledKeys = new Set(targets.map((t) => targetKey(t.kind, t.id)));
  const allSelected = targets.length === 0;
  return monitors.map((row) => ({
    ...row,
    enabled: allSelected ? true : enabledKeys.has(row.key),
  }));
}

const draft = ref<FooterAlertState>(loadDraft());
const rows = ref<FooterAlertMonitorRow[]>([]);
const loading = ref(false);
/** Espelha o alerta activo no painel de pré-visualização do operador. */
const previewPlayback = ref<FooterAlertState | null>(null);
let previewEndTimer: ReturnType<typeof setTimeout> | undefined;

function setPreviewPlayback(state: FooterAlertState | null): void {
  if (previewEndTimer) clearTimeout(previewEndTimer);
  previewEndTimer = undefined;
  if (!state?.active || !state.text.trim()) {
    previewPlayback.value = null;
    return;
  }
  previewPlayback.value = state;
  previewEndTimer = setTimeout(() => {
    previewPlayback.value = null;
    previewEndTimer = undefined;
  }, state.repeatCount * state.scrollDurationSec * 1000 + 50);
}

function publish(state: FooterAlertState): void {
  const { sendAction } = useLiveSocket();
  sendAction('footerAlert', encodeFooterAlertState(state));
}

export function useFooterAlert() {
  async function loadMonitors(): Promise<void> {
    loading.value = true;
    try {
      const { onlineDevices } = useExternalDevices();
      const data = await fetchJson<{
        config?: { assignments?: DisplayAssignment[] };
      }>('/displays/config');
      const assignments = data.config?.assignments ?? [];
      const displayRows: FooterAlertMonitorRow[] = assignments
        .filter((a) => a.role === 'projection' || a.role === 'stage-return')
        .map((a) => ({
          key: targetKey('display', String(a.displayId)),
          kind: 'display' as const,
          id: String(a.displayId),
          label: a.label,
          roleHint: a.role,
          enabled: true,
        }));

      const externalRows: FooterAlertMonitorRow[] = onlineDevices.value.map((d) => ({
        key: targetKey('external', d.deviceId),
        kind: 'external' as const,
        id: d.deviceId,
        label: d.label?.trim() || d.name || d.deviceId.slice(0, 8),
        roleHint: d.profile,
        enabled: true,
      }));

      const merged = [...displayRows, ...externalRows];
      rows.value = syncRowsFromState(merged, draft.value.targets);
    } finally {
      loading.value = false;
    }
  }

  function updateDraft(patch: Partial<FooterAlertState>): void {
    draft.value = { ...draft.value, ...patch };
    saveDraft(draft.value);
  }

  function sendAlert(): boolean {
    const text = draft.value.text.trim();
    if (!text) return false;

    const enabledRows = rows.value.filter((r) => r.enabled);
    const allEnabled =
      rows.value.length > 0 && enabledRows.length === rows.value.length;
    const targets = allEnabled ? [] : buildTargets(rows.value);

    const payload: FooterAlertState = {
      ...draft.value,
      active: true,
      text,
      targets,
    };
    publish(payload);
    setPreviewPlayback(payload);
    return true;
  }

  function stopAlert(): void {
    setPreviewPlayback(null);
    publish({
      ...draft.value,
      active: false,
      text: '',
      targets: [],
    });
  }

  function setRowEnabled(key: string, enabled: boolean): void {
    rows.value = rows.value.map((row) =>
      row.key === key ? { ...row, enabled } : row,
    );
  }

  return {
    draft,
    rows,
    loading,
    previewPlayback,
    loadMonitors,
    updateDraft,
    sendAlert,
    stopAlert,
    setRowEnabled,
  };
}
