import { computed, ref, readonly } from 'vue';
import type {
  ExternalDisplayProfile,
  ExternalDeviceInfo,
  WsDevicePresenceMessage,
} from '@shared/types/live';

export interface OnlineExternalDevice extends ExternalDeviceInfo {
  clientId: string;
  name: string;
}

const onlineByDeviceId = ref<Map<string, OnlineExternalDevice>>(new Map());

function bumpOnline(): void {
  onlineByDeviceId.value = new Map(onlineByDeviceId.value);
}

export function handleDevicePresence(message: WsDevicePresenceMessage): void {
  if (message.event === 'online') {
    onlineByDeviceId.value.set(message.device.deviceId, message.device);
  } else {
    onlineByDeviceId.value.delete(message.device.deviceId);
  }
  bumpOnline();
}

const PROJECTION_PROFILES = new Set<ExternalDisplayProfile>(['live', 'vocal']);
const RETURN_PROFILES = new Set<ExternalDisplayProfile>(['stage', 'player']);

export function useExternalDevices() {
  const onlineDevices = computed(() =>
    Array.from(onlineByDeviceId.value.values()),
  );

  const onlineProjectionCount = computed(() =>
    onlineDevices.value.filter((d) => PROJECTION_PROFILES.has(d.profile)).length,
  );

  const onlineReturnCount = computed(() =>
    onlineDevices.value.filter((d) => RETURN_PROFILES.has(d.profile)).length,
  );

  const onlineStageReturnCount = computed(() =>
    onlineDevices.value.filter((d) => d.profile === 'stage').length,
  );

  return {
    onlineDevices,
    onlineProjectionCount,
    onlineReturnCount,
    onlineStageReturnCount,
    onlineByDeviceId: readonly(onlineByDeviceId),
  };
}
