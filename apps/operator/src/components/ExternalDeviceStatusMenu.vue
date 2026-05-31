<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchJson } from '../composables/useApi';
import { useExternalDevices } from '../composables/useExternalDevices';
import type { ExternalDisplayProfile } from '@shared/types/live';

defineProps<{
  projectionTotal: number;
  returnTotal: number;
  stageReturnTotal: number;
  displayCount: number;
}>();

const emit = defineEmits<{ openDisplays: [] }>();

const { t } = useI18n();
const { onlineDevices } = useExternalDevices();

const open = ref(false);
const root = ref<HTMLElement | null>(null);
const savingId = ref<string | null>(null);
const saveError = ref('');

interface DeviceDraft {
  label: string;
  showChords: boolean;
}

const drafts = ref<Record<string, DeviceDraft>>({});

watch(
  onlineDevices,
  (devices) => {
    const next: Record<string, DeviceDraft> = {};
    for (const device of devices) {
      next[device.deviceId] = drafts.value[device.deviceId] ?? {
        label: device.label ?? '',
        showChords: device.showChords,
      };
    }
    drafts.value = next;
  },
  { immediate: true },
);

function toggle(): void {
  open.value = !open.value;
}

function close(): void {
  open.value = false;
}

function onDocumentClick(event: MouseEvent): void {
  if (!root.value?.contains(event.target as Node)) {
    close();
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick));
onUnmounted(() => document.removeEventListener('click', onDocumentClick));

function chordsConfigurable(profile: ExternalDisplayProfile): boolean {
  return profile === 'stage' || profile === 'player';
}

async function saveDevice(deviceId: string): Promise<void> {
  const draft = drafts.value[deviceId];
  if (!draft) return;

  savingId.value = deviceId;
  saveError.value = '';
  try {
    await fetchJson(`/api/devices/${encodeURIComponent(deviceId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: draft.label.trim() || null,
        showChords: draft.showChords,
      }),
    });
  } catch (e) {
    saveError.value =
      e instanceof Error ? e.message : t('displays.external.errors.save');
  } finally {
    savingId.value = null;
  }
}

function openMonitors(): void {
  close();
  emit('openDisplays');
}
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="rounded px-0.5 underline decoration-dotted underline-offset-2 transition hover:text-lp-text"
      :aria-expanded="open"
      aria-haspopup="dialog"
      data-testid="status-displays-trigger"
      @click.stop="toggle"
    >
      {{
        t('status.displays', {
          total: displayCount,
          projection: projectionTotal,
          return: returnTotal,
          stageReturn: stageReturnTotal,
        })
      }}
    </button>

    <div
      v-if="open"
      role="dialog"
      aria-labelledby="status-external-devices-title"
      class="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-lg border border-lp-surface bg-lp-background p-3 text-left shadow-lg"
      data-testid="status-external-devices-panel"
      @click.stop
    >
      <h3
        id="status-external-devices-title"
        class="text-sm font-semibold text-lp-text"
      >
        {{ t('status.externalDevices.title') }}
      </h3>
      <p class="mt-1 text-xs text-lp-muted">
        {{ t('status.externalDevices.hint') }}
      </p>

      <ul
        v-if="onlineDevices.length"
        class="mt-3 max-h-64 space-y-3 overflow-y-auto"
      >
        <li
          v-for="device in onlineDevices"
          :key="device.deviceId"
          class="rounded border border-lp-surface/80 p-2"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium text-lp-text">
              {{ t(`displays.external.profiles.${device.profile}`) }}
            </span>
            <span class="text-[10px] uppercase tracking-wide text-emerald-400">
              {{ t('displays.external.online') }}
            </span>
          </div>

          <label class="mt-2 block text-xs">
            <span class="text-lp-muted">{{ t('displays.external.label') }}</span>
            <input
              v-model="drafts[device.deviceId].label"
              type="text"
              class="mt-0.5 w-full rounded border border-lp-surface bg-lp-background px-2 py-1 text-xs text-lp-text"
            />
          </label>

          <label
            v-if="chordsConfigurable(device.profile)"
            class="mt-2 flex items-center gap-2 text-xs"
          >
            <input
              v-model="drafts[device.deviceId].showChords"
              type="checkbox"
            />
            <span>{{ t('displays.external.showChords') }}</span>
          </label>

          <button
            type="button"
            class="mt-2 w-full rounded bg-lp-primary/90 px-2 py-1 text-xs font-medium text-white hover:bg-lp-primary disabled:opacity-50"
            :disabled="savingId === device.deviceId"
            @click="saveDevice(device.deviceId)"
          >
            {{
              savingId === device.deviceId
                ? t('displays.external.saving')
                : t('displays.external.save')
            }}
          </button>
        </li>
      </ul>
      <p v-else class="mt-2 text-xs text-lp-muted">
        {{ t('status.externalDevices.noneOnline') }}
      </p>

      <p v-if="saveError" class="mt-2 text-xs text-red-400">{{ saveError }}</p>

      <button
        type="button"
        class="mt-3 w-full rounded border border-lp-surface px-2 py-1 text-xs text-lp-muted hover:bg-lp-surface/40 hover:text-lp-text"
        @click="openMonitors"
      >
        {{ t('status.externalDevices.openMonitors') }}
      </button>
    </div>
  </div>
</template>
