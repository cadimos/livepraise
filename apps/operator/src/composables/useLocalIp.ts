import { onMounted, onUnmounted, ref } from 'vue';
import { fetchJson } from './useApi';

const POLL_MS = 30_000;

export function useLocalIp() {
  const localIp = ref<string | null>(null);
  const networkOnline = ref(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  let timer: ReturnType<typeof setInterval> | undefined;

  async function refresh() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      networkOnline.value = false;
      localIp.value = null;
      return;
    }

    networkOnline.value = true;

    try {
      const data = await fetchJson<{ status: string; ipv4: string | null }>(
        '/api/system/local-ip',
      );
      localIp.value = data.ipv4;
    } catch {
      localIp.value = null;
    }
  }

  function onOnline() {
    networkOnline.value = true;
    void refresh();
  }

  function onOffline() {
    networkOnline.value = false;
    localIp.value = null;
  }

  onMounted(() => {
    void refresh();
    timer = setInterval(() => void refresh(), POLL_MS);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  });

  return { localIp, networkOnline };
}
