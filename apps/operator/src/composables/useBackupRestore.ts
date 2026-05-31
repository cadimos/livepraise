import { ref } from 'vue';

const backupMode = ref(false);

export function useBackupRestore() {
  function setClientBackupMode(active: boolean): void {
    backupMode.value = active;
  }

  return {
    backupMode,
    setClientBackupMode,
  };
}
