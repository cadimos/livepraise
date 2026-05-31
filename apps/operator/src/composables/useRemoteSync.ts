import { ref } from 'vue';
import { fetchJson } from './useApi';
import { usePreferences } from './usePreferences';

export interface PendingApproval {
  id: string;
  kind: string;
  userName: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export const pendingApprovals = ref<PendingApproval[]>([]);

function preferences() {
  return usePreferences();
}

export async function syncChromeTabs(): Promise<void> {
  const { addChromeTab } = preferences();
  const data = await fetchJson<{
    status: string;
    tabs: Array<{
      id: string;
      label: string;
      songId: number | null;
      songName: string | null;
    }>;
  }>('/api/remote/chrome-tabs');

  for (const tab of data.tabs ?? []) {
    let verses: Array<{ id: number; text: string }> = [];
    if (tab.songId) {
      try {
        const versesData = await fetchJson<{
          status: string;
          items: Array<{ id: number; verso: string }>;
        }>(`/musica/verso/${tab.songId}`);
        verses = (versesData.items ?? []).map((v) => ({
          id: v.id,
          text: v.verso.replace(/<br \/>/g, '\n'),
        }));
      } catch {
        verses = [];
      }
    }
    addChromeTab({
      label: tab.songName ? `${tab.label} — ${tab.songName}` : tab.label,
      songId: tab.songId ?? undefined,
      songName: tab.songName ?? undefined,
      verses,
    });
    await fetchJson(`/api/remote/chrome-tabs/${tab.id}/consume`, {
      method: 'POST',
    });
  }
}

export async function refreshApprovals(): Promise<void> {
  const data = await fetchJson<{ status: string; items: PendingApproval[] }>(
    '/api/remote/approvals/pending',
  );
  pendingApprovals.value = data.items ?? [];
}

export async function approveRemote(id: string): Promise<void> {
  await fetchJson(`/api/remote/approvals/${id}/approve`, { method: 'POST' });
  await refreshApprovals();
}

export async function rejectRemote(id: string): Promise<void> {
  await fetchJson(`/api/remote/approvals/${id}/reject`, { method: 'POST' });
  await refreshApprovals();
}

export function onChromeTabAdded(): void {
  void syncChromeTabs();
}

export function onApprovalPending(): void {
  void refreshApprovals();
}

export function onApprovalResolved(payload: { id: string }): void {
  pendingApprovals.value = pendingApprovals.value.filter((i) => i.id !== payload.id);
}

export function useRemoteSync() {
  return {
    pendingApprovals,
    syncChromeTabs,
    refreshApprovals,
    approve: approveRemote,
    reject: rejectRemote,
    onChromeTabAdded,
    onApprovalPending,
    onApprovalResolved,
  };
}
