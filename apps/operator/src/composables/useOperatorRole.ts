import { computed } from 'vue';
import { isBrowserLoopbackHost, readAuthSession } from '@shared/auth-session';

export function useOperatorRole() {
  const isAdmin = computed(() => {
    if (isBrowserLoopbackHost()) return true;
    const session = readAuthSession();
    return session?.user.role === 'admin';
  });

  return { isAdmin };
}
