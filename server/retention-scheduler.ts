import { runRetentionPurge } from '../core/retention/purge.js';
import { getMainDb } from './db/connection.js';

const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startRetentionScheduler(): void {
  if (intervalHandle) return;

  const run = (): void => {
    try {
      const result = runRetentionPurge(getMainDb());
      if (
        result.expiredSessions > 0 ||
        result.auditLogs > 0 ||
        result.deactivatedUsers > 0 ||
        result.inactiveDevices > 0
      ) {
        console.log('[livepraise] retention purge', result);
      }
    } catch (err) {
      console.error('[livepraise] retention purge failed:', err);
    }
  };

  run();
  intervalHandle = setInterval(run, RETENTION_INTERVAL_MS);
  intervalHandle.unref?.();
}

export function stopRetentionScheduler(): void {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
}
