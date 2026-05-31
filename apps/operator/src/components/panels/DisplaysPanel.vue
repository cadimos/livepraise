<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchJson } from '../../composables/useApi';
import { useExternalDevices } from '../../composables/useExternalDevices';
import { useLiveSocket } from '../../composables/useLiveSocket';
import type { DisplayAssignment, DisplayScreenSize, ExternalDisplayProfile } from '@shared/types/live';
import {
  SCREEN_SIZE_PRESETS,
  buildAjustarTelaValor,
  defaultScreenSize,
  encodeAjustarTelaForDisplay,
} from '../../utils/screen-size';
import { Settings } from '@lucide/vue';

type DisplayRole = DisplayAssignment['role'];

const { t } = useI18n();
const { sendAction } = useLiveSocket();
const { onlineDevices } = useExternalDevices();

interface ExternalDeviceDraft {
  deviceId: string;
  profile: ExternalDisplayProfile;
  label: string;
  showChords: boolean;
  online: boolean;
}

const externalDrafts = ref<ExternalDeviceDraft[]>([]);
const savingExternalId = ref<string | null>(null);

const assignments = ref<DisplayAssignment[]>([]);
const savingRoles = ref(false);
const savingScreenId = ref<number | null>(null);
const expandedDisplayId = ref<number | null>(null);
const message = ref('');
const error = ref('');

const roleOptions = computed(() =>
  (['operator', 'projection', 'stage-return', 'off'] as const).map((value) => ({
    value,
    label: t(`displays.roles.${value}`),
  })),
);

const presetOptions = computed(() =>
  SCREEN_SIZE_PRESETS.map((value) => ({
    value,
    label: t(`displays.screenSize.presets.${value}`),
  })),
);

function ensureScreenSize(item: DisplayAssignment): DisplayScreenSize {
  if (!item.screenSize) {
    item.screenSize = defaultScreenSize();
  }
  return item.screenSize;
}

function isProjectionRole(role: DisplayRole): boolean {
  return role === 'projection';
}

function toggleScreenConfig(displayId: number): void {
  expandedDisplayId.value = expandedDisplayId.value === displayId ? null : displayId;
}

async function persistAssignments(): Promise<void> {
  await fetchJson('/displays/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignments: assignments.value,
      updatedAt: new Date().toISOString(),
    }),
  });
}

async function loadExternalDevices() {
  try {
    const data = await fetchJson<{
      status: string;
      devices: {
        deviceId: string;
        profile: ExternalDisplayProfile;
        label: string | null;
        showChords: boolean;
      }[];
    }>('/api/devices');
    const onlineIds = new Set(onlineDevices.value.map((d) => d.deviceId));
    const merged = new Map<string, ExternalDeviceDraft>();

    for (const device of data.devices) {
      merged.set(device.deviceId, {
        deviceId: device.deviceId,
        profile: device.profile,
        label: device.label ?? '',
        showChords: device.showChords,
        online: onlineIds.has(device.deviceId),
      });
    }

    for (const device of onlineDevices.value) {
      merged.set(device.deviceId, {
        deviceId: device.deviceId,
        profile: device.profile,
        label: device.label ?? merged.get(device.deviceId)?.label ?? '',
        showChords: device.showChords,
        online: true,
      });
    }

    externalDrafts.value = Array.from(merged.values()).sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return a.profile.localeCompare(b.profile);
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('displays.external.errors.load');
  }
}

async function saveExternalDevice(item: ExternalDeviceDraft) {
  savingExternalId.value = item.deviceId;
  message.value = '';
  error.value = '';
  try {
    await fetchJson(`/api/devices/${encodeURIComponent(item.deviceId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: item.label.trim() || null,
        showChords: item.showChords,
      }),
    });
    message.value = t('displays.external.saved');
    await loadExternalDevices();
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('displays.external.errors.save');
  } finally {
    savingExternalId.value = null;
  }
}

const chordsConfigurable = (profile: ExternalDisplayProfile) =>
  profile === 'stage' || profile === 'player';

async function load() {
  error.value = '';
  try {
    const data = await fetchJson<{
      status: string;
      config: { assignments: DisplayAssignment[] } | null;
    }>('/displays/config');
    assignments.value = (data.config?.assignments ?? []).map((item) => ({
      ...item,
      screenSize: item.screenSize ?? defaultScreenSize(),
    }));
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('displays.errors.load');
  }
}

async function saveRoles() {
  savingRoles.value = true;
  message.value = '';
  error.value = '';
  try {
    await persistAssignments();
    message.value = t('displays.saved');
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('displays.errors.save');
  } finally {
    savingRoles.value = false;
  }
}

async function saveDisplayScreen(item: DisplayAssignment) {
  const screen = ensureScreenSize(item);
  savingScreenId.value = item.displayId;
  message.value = '';
  error.value = '';
  try {
    await persistAssignments();

    if (isProjectionRole(item.role)) {
      const valor = buildAjustarTelaValor(screen.preset, screen.largura, screen.altura);
      const payload = encodeAjustarTelaForDisplay(item.displayId, valor);
      if (!sendAction('ajustarTela', payload)) {
        error.value = t('displays.screenSize.errors.socket');
        return;
      }
    }

    message.value = t('displays.screenSize.savedFor', { label: item.label });
    expandedDisplayId.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('displays.screenSize.errors.save');
  } finally {
    savingScreenId.value = null;
  }
}

onMounted(() => {
  void load();
  void loadExternalDevices();
});

watch(onlineDevices, () => {
  void loadExternalDevices();
});
</script>

<template>
  <div class="flex h-full flex-col gap-4 overflow-y-auto">
    <p class="text-sm text-lp-muted">
      {{ t('displays.intro') }}
    </p>
    <p class="text-sm text-lp-muted">
      {{ t('displays.screenSize.perMonitorHint') }}
    </p>

    <div v-if="error" class="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
      {{ error }}
    </div>
    <div
      v-if="message"
      class="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200"
    >
      {{ message }}
    </div>

    <ul v-if="assignments.length" class="space-y-2">
      <li
        v-for="item in assignments"
        :key="item.displayId"
        class="rounded-lg border border-lp-primary/20 bg-lp-surface/60"
      >
        <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <span class="text-sm text-lp-text">
            {{ item.label }}
            <span v-if="item.primary" class="ml-1 text-xs text-amber-400">{{ t('displays.primary') }}</span>
          </span>
          <div class="flex items-center gap-1">
            <button
              v-if="isProjectionRole(item.role)"
              type="button"
              class="rounded-md p-1.5 text-lp-muted transition hover:bg-lp-surface hover:text-lp-primary"
              :title="t('displays.screenSize.configure')"
              :aria-label="t('displays.screenSize.configure')"
              :aria-expanded="expandedDisplayId === item.displayId"
              @click="toggleScreenConfig(item.displayId)"
            >
              <Settings class="h-5 w-5" aria-hidden="true" />
            </button>
            <select
              v-model="item.role"
              class="lp-field min-w-[9rem] rounded-md px-2 py-1.5 text-sm"
            >
              <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <div
          v-if="expandedDisplayId === item.displayId && isProjectionRole(item.role)"
          class="border-t border-lp-surface px-3 py-3"
        >
          <p class="mb-3 text-xs text-lp-muted">
            {{ t('displays.screenSize.monitorTitle', { label: item.label }) }}
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="flex flex-col gap-1 text-sm sm:col-span-2">
              <span class="text-lp-muted">{{ t('displays.screenSize.presetLabel') }}</span>
              <select
                v-model="ensureScreenSize(item).preset"
                class="lp-field w-full rounded-md px-2 py-1.5 text-sm"
              >
                <option v-for="opt in presetOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </label>
            <label class="flex flex-col gap-1 text-sm">
              <span class="text-lp-muted">{{ t('displays.screenSize.widthLabel') }}</span>
              <input
                v-model="ensureScreenSize(item).largura"
                type="text"
                inputmode="numeric"
                class="lp-field w-full rounded-md px-2 py-1.5 text-sm disabled:opacity-50"
                :disabled="ensureScreenSize(item).preset !== 'personalizado'"
                :placeholder="t('displays.screenSize.widthPlaceholder')"
              />
            </label>
            <label class="flex flex-col gap-1 text-sm">
              <span class="text-lp-muted">{{ t('displays.screenSize.heightLabel') }}</span>
              <input
                v-model="ensureScreenSize(item).altura"
                type="text"
                inputmode="numeric"
                class="lp-field w-full rounded-md px-2 py-1.5 text-sm disabled:opacity-50"
                :disabled="ensureScreenSize(item).preset !== 'personalizado'"
                :placeholder="t('displays.screenSize.heightPlaceholder')"
              />
            </label>
          </div>
          <button
            type="button"
            class="mt-3 rounded-lg bg-lp-primary px-4 py-2 text-sm font-medium text-lp-background transition hover:opacity-90 disabled:opacity-50"
            :disabled="savingScreenId === item.displayId"
            @click="saveDisplayScreen(item)"
          >
            {{
              savingScreenId === item.displayId
                ? t('displays.screenSize.saving')
                : t('displays.screenSize.save')
            }}
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="text-sm text-lp-muted">
      {{ t('displays.none') }}
    </p>

    <button
      type="button"
      class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
      :disabled="savingRoles || !assignments.length"
      @click="saveRoles"
    >
      {{ savingRoles ? t('displays.saving') : t('displays.save') }}
    </button>

    <section class="mt-6 border-t border-lp-surface pt-4">
      <h3 class="text-sm font-semibold text-lp-text">{{ t('displays.external.title') }}</h3>
      <p class="mt-1 text-sm text-lp-muted">{{ t('displays.external.hint') }}</p>

      <ul v-if="externalDrafts.length" class="mt-3 space-y-2">
        <li
          v-for="item in externalDrafts"
          :key="item.deviceId"
          class="rounded-lg border border-lp-primary/20 bg-lp-surface/60 px-3 py-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm text-lp-text">
              {{ t(`displays.external.profiles.${item.profile}`) }}
              <span
                v-if="item.online"
                class="ml-2 rounded bg-emerald-900/50 px-1.5 py-0.5 text-xs text-emerald-300"
              >
                {{ t('displays.external.online') }}
              </span>
            </span>
            <span class="text-xs text-lp-muted">{{ item.deviceId.slice(0, 8) }}…</span>
          </div>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="flex flex-col gap-1 text-sm sm:col-span-2">
              <span class="text-lp-muted">{{ t('displays.external.label') }}</span>
              <input
                v-model="item.label"
                type="text"
                class="lp-field w-full rounded-md px-2 py-1.5 text-sm"
              />
            </label>
            <label
              v-if="chordsConfigurable(item.profile)"
              class="inline-flex items-center gap-2 text-sm sm:col-span-2"
            >
              <input v-model="item.showChords" type="checkbox" />
              <span>{{ t('displays.external.showChords') }}</span>
            </label>
          </div>
          <button
            type="button"
            class="mt-3 rounded-lg bg-lp-primary px-3 py-1.5 text-sm font-medium text-lp-background transition hover:opacity-90 disabled:opacity-50"
            :disabled="savingExternalId === item.deviceId"
            @click="saveExternalDevice(item)"
          >
            {{
              savingExternalId === item.deviceId
                ? t('displays.external.saving')
                : t('displays.external.save')
            }}
          </button>
        </li>
      </ul>
      <p v-else class="mt-2 text-sm text-lp-muted">{{ t('displays.external.none') }}</p>
    </section>
  </div>
</template>
