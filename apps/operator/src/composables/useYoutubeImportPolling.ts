import { onScopeDispose, watch } from 'vue';
import { usePreferences } from './usePreferences';
import {
  fetchYoutubeImportStatus,
  patchQueueItemFromYoutubeJob,
} from '../utils/queue-import-api';

const POLL_MS = 500;

export function useYoutubeImportPolling(): void {
  const { prefs, updateQueueItem } = usePreferences();
  const timers = new Map<string, ReturnType<typeof setInterval>>();

  function stopPolling(jobId: string): void {
    const timer = timers.get(jobId);
    if (timer) clearInterval(timer);
    timers.delete(jobId);
  }

  async function pollJob(tabId: string, itemId: string, jobId: string): Promise<void> {
    try {
      const data = await fetchYoutubeImportStatus(jobId);
      updateQueueItem(tabId, itemId, patchQueueItemFromYoutubeJob(data));
      if (data.phase === 'ready' || data.phase === 'failed') {
        stopPolling(jobId);
      }
    } catch {
      stopPolling(jobId);
    }
  }

  function syncPollers(): void {
    const active = new Set<string>();

    for (const tab of prefs.value.chromeTabs) {
      for (const item of tab.items ?? []) {
        const jobId = item.youtubeImportJobId;
        if (!jobId) continue;
        if (item.youtubeImportPhase === 'failed') continue;

        active.add(jobId);
        if (timers.has(jobId)) continue;

        void pollJob(tab.id, item.id, jobId);
        const timer = setInterval(() => {
          void pollJob(tab.id, item.id, jobId);
        }, POLL_MS);
        timers.set(jobId, timer);
      }
    }

    for (const jobId of [...timers.keys()]) {
      if (!active.has(jobId)) stopPolling(jobId);
    }
  }

  watch(prefs, syncPollers, { deep: true, immediate: true });

  onScopeDispose(() => {
    for (const jobId of [...timers.keys()]) stopPolling(jobId);
  });
}
