import { ref } from 'vue';

const refreshToken = ref(0);

export function triggerWorshipRefresh(): void {
  refreshToken.value += 1;
}

export function useWorshipRefresh() {
  return { refreshToken };
}
