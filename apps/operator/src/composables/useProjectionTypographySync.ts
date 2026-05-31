import { watch } from 'vue';
import { fetchJson } from './useApi';
import { usePreferences } from './usePreferences';
import type { ProjectionTypographyPrefs } from '@shared/projection-typography';
import { whenLiveSocketReady } from './useLiveSocket';

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;

async function pushProjectionTypographyToServer(
  projectionTypography: ProjectionTypographyPrefs,
): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    await fetchJson('/api/projection-typography', {
      method: 'PUT',
      body: JSON.stringify({ projectionTypography }),
    });
  } catch {
    /* retry no próximo watch */
  } finally {
    syncing = false;
  }
}

export function startProjectionTypographySync(): void {
  const { prefs } = usePreferences();

  watch(
    () => prefs.value.projectionTypography,
    (projectionTypography) => {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        whenLiveSocketReady(() => {
          void pushProjectionTypographyToServer(projectionTypography);
        });
      }, 250);
    },
    { deep: true },
  );

  whenLiveSocketReady(() => {
    void pushProjectionTypographyToServer(prefs.value.projectionTypography);
  });
}
