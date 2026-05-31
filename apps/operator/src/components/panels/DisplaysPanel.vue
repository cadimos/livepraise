<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchJson } from '../../composables/useApi';
import { useExternalDevices } from '../../composables/useExternalDevices';
import { useLiveSocket } from '../../composables/useLiveSocket';
import type { DisplayAssignment, DisplayScreenSize, ExternalDisplayProfile } from '@shared/types/live';
import {
  SCREEN_SIZE_PRESETS,
  SCREEN_POSITIONS,
  SCREEN_CONTENT_FITS,
  buildAjustarTelaPayload,
  buildAjustarTelaPayloadForDevice,
  defaultScreenSize,
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
  screenSize: DisplayScreenSize;
}

const externalDrafts = ref<ExternalDeviceDraft[]>([]);
const savingExternalId = ref<string | null>(null);
const savingRemoteDeviceId = ref<string | null>(null);
const expandedRemoteDeviceId = ref<string | null>(null);

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

const positionOptions = computed(() =>
  SCREEN_POSITIONS.map((value) => ({
    value,
    label: t(`displays.screenSize.positions.${value}`),
  })),
);

const contentFitOptions = computed(() =>
  SCREEN_CONTENT_FITS.map((value) => ({
    value,
    label: t(`displays.screenSize.contentFits.${value}`),
  })),
);

function normalizeScreenSize(raw?: Partial<DisplayScreenSize>): DisplayScreenSize {
  return { ...defaultScreenSize(), ...raw };
}

function ensureScreenSize(item: DisplayAssignment): DisplayScreenSize {
  if (!item.screenSize) {
    item.screenSize = defaultScreenSize();
  }
  return item.screenSize;
}

function isExpandedDisplay(displayId: number): boolean {
  return expandedDisplayId.value !== null && expandedDisplayId.value === displayId;
}

function isProjectionRole(role: DisplayRole): boolean {
  return role === 'projection';
}

function toggleScreenConfig(displayId: number): void {
  expandedDisplayId.value = isExpandedDisplay(displayId) ? null : displayId;
  if (expandedDisplayId.value !== null) {
    const item = assignments.value.find((a) => a.displayId === expandedDisplayId.value);
    if (item) previewDisplayScreen(item);
  }
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

function ensureRemoteScreenSize(item: ExternalDeviceDraft): DisplayScreenSize {
  if (!item.screenSize) {
    item.screenSize = defaultScreenSize();
  }
  return item.screenSize;
}

function remoteProjectorLabel(item: ExternalDeviceDraft): string {
  const custom = item.label.trim();
  if (custom) return custom;
  return t('displays.remoteProjection.defaultLabel', { id: item.deviceId.slice(0, 8) });
}

const projectionRemoteDrafts = computed(() =>
  externalDrafts.value.filter((d) => d.profile === 'projection'),
);

const otherExternalDrafts = computed(() =>
  externalDrafts.value.filter((d) => d.profile !== 'projection'),
);

function isExpandedRemoteDevice(deviceId: string): boolean {
  return expandedRemoteDeviceId.value === deviceId;
}

function toggleRemoteScreenConfig(deviceId: string): void {
  expandedRemoteDeviceId.value = isExpandedRemoteDevice(deviceId) ? null : deviceId;
  if (expandedRemoteDeviceId.value !== null) {
    const item = projectionRemoteDrafts.value.find((d) => d.deviceId === expandedRemoteDeviceId.value);
    if (item) previewRemoteProjectorScreen(item);
  }
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
        screenSize?: DisplayScreenSize | null;
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
        screenSize: normalizeScreenSize(device.screenSize ?? undefined),
      });
    }

    for (const device of onlineDevices.value) {
      const prev = merged.get(device.deviceId);
      merged.set(device.deviceId, {
        deviceId: device.deviceId,
        profile: device.profile,
        label: device.label ?? prev?.label ?? '',
        showChords: device.showChords,
        online: true,
        screenSize: prev?.screenSize ?? defaultScreenSize(),
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

function previewRemoteProjectorScreen(item: ExternalDeviceDraft): void {
  const screen = ensureRemoteScreenSize(item);
  if (!screen.livePreview) return;
  sendAction('ajustarTela', buildAjustarTelaPayloadForDevice(item.deviceId, screen));
}

async function saveRemoteProjectorScreen(item: ExternalDeviceDraft) {
  const screen = ensureRemoteScreenSize(item);
  savingRemoteDeviceId.value = item.deviceId;
  message.value = '';
  error.value = '';
  try {
    await fetchJson(`/api/devices/${encodeURIComponent(item.deviceId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: item.label.trim() || null,
        screenSize: screen,
      }),
    });

    const payload = buildAjustarTelaPayloadForDevice(item.deviceId, screen);
    if (!sendAction('ajustarTela', payload)) {
      error.value = t('displays.screenSize.errors.socket');
      return;
    }

    message.value = t('displays.screenSize.savedFor', { label: remoteProjectorLabel(item) });
    expandedRemoteDeviceId.value = null;
    await loadExternalDevices();
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('displays.screenSize.errors.save');
  } finally {
    savingRemoteDeviceId.value = null;
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
      screenSize: normalizeScreenSize(item.screenSize),
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
      const payload = buildAjustarTelaPayload(item.displayId, screen);
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

function previewDisplayScreen(item: DisplayAssignment): void {
  if (!isProjectionRole(item.role)) return;
  const screen = ensureScreenSize(item);
  if (!screen.livePreview) return;
  const payload = buildAjustarTelaPayload(item.displayId, screen);
  sendAction('ajustarTela', payload);
}

watch(
  () => {
    const id = expandedDisplayId.value;
    if (id === null) return null;
    const item = assignments.value.find((a) => a.displayId === id);
    if (!item || !isProjectionRole(item.role)) return null;
    const screen = item.screenSize;
    if (!screen) return null;
    return JSON.stringify({
      preset: screen.preset,
      largura: screen.largura,
      altura: screen.altura,
      position: screen.position,
      offsetX: screen.offsetX,
      offsetY: screen.offsetY,
      livePreview: screen.livePreview,
      contentFit: screen.contentFit,
    });
  },
  () => {
    const id = expandedDisplayId.value;
    if (id === null) return;
    const item = assignments.value.find((a) => a.displayId === id);
    if (item) previewDisplayScreen(item);
  },
);

watch(
  () => {
    const id = expandedRemoteDeviceId.value;
    if (id === null) return null;
    const item = projectionRemoteDrafts.value.find((d) => d.deviceId === id);
    if (!item) return null;
    const screen = item.screenSize;
    return JSON.stringify({
      preset: screen.preset,
      largura: screen.largura,
      altura: screen.altura,
      position: screen.position,
      offsetX: screen.offsetX,
      offsetY: screen.offsetY,
      livePreview: screen.livePreview,
      contentFit: screen.contentFit,
    });
  },
  () => {
    const id = expandedRemoteDeviceId.value;
    if (id === null) return;
    const item = projectionRemoteDrafts.value.find((d) => d.deviceId === id);
    if (item) previewRemoteProjectorScreen(item);
  },
);

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
              :aria-expanded="isExpandedDisplay(item.displayId)"
              @click.stop="toggleScreenConfig(item.displayId)"
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
          v-if="isExpandedDisplay(item.displayId) && isProjectionRole(item.role)"
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
            <label class="flex flex-col gap-1 text-sm sm:col-span-2">
              <span class="text-lp-muted">{{ t('displays.screenSize.positionLabel') }}</span>
              <select
                v-model="ensureScreenSize(item).position"
                class="lp-field w-full rounded-md px-2 py-1.5 text-sm"
              >
                <option v-for="opt in positionOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </label>
            <label
              v-if="ensureScreenSize(item).position === 'personalizado'"
              class="flex flex-col gap-1 text-sm"
            >
              <span class="text-lp-muted">{{ t('displays.screenSize.offsetXLabel') }}</span>
              <input
                v-model="ensureScreenSize(item).offsetX"
                type="text"
                inputmode="numeric"
                class="lp-field w-full rounded-md px-2 py-1.5 text-sm"
                :placeholder="t('displays.screenSize.offsetXPlaceholder')"
              />
            </label>
            <label
              v-if="ensureScreenSize(item).position === 'personalizado'"
              class="flex flex-col gap-1 text-sm"
            >
              <span class="text-lp-muted">{{ t('displays.screenSize.offsetYLabel') }}</span>
              <input
                v-model="ensureScreenSize(item).offsetY"
                type="text"
                inputmode="numeric"
                class="lp-field w-full rounded-md px-2 py-1.5 text-sm"
                :placeholder="t('displays.screenSize.offsetYPlaceholder')"
              />
            </label>
            <label class="flex flex-col gap-1 text-sm sm:col-span-2">
              <span class="text-lp-muted">{{ t('displays.screenSize.contentFitLabel') }}</span>
              <select
                v-model="ensureScreenSize(item).contentFit"
                class="lp-field w-full rounded-md px-2 py-1.5 text-sm"
              >
                <option v-for="opt in contentFitOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <span class="text-xs text-lp-muted">{{ t('displays.screenSize.contentFitHint') }}</span>
            </label>
            <label class="inline-flex items-center gap-2 text-sm sm:col-span-2">
              <input v-model="ensureScreenSize(item).livePreview" type="checkbox" />
              <span>{{ t('displays.screenSize.livePreview') }}</span>
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
      <h3 class="text-sm font-semibold text-lp-text">{{ t('displays.remoteProjection.title') }}</h3>
      <p class="mt-1 text-sm text-lp-muted">{{ t('displays.remoteProjection.hint') }}</p>

      <ul v-if="projectionRemoteDrafts.length" class="mt-3 space-y-2">
        <li
          v-for="item in projectionRemoteDrafts"
          :key="item.deviceId"
          class="rounded-lg border border-lp-primary/20 bg-lp-surface/60"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span class="text-sm text-lp-text">
              {{ remoteProjectorLabel(item) }}
              <span class="ml-1 text-xs text-lp-muted">{{ t('displays.external.profiles.projection') }}</span>
              <span
                v-if="item.online"
                class="ml-2 rounded bg-emerald-900/50 px-1.5 py-0.5 text-xs text-emerald-300"
              >
                {{ t('displays.external.online') }}
              </span>
            </span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="rounded-md p-1.5 text-lp-muted transition hover:bg-lp-surface hover:text-lp-primary"
                :title="t('displays.screenSize.configure')"
                :aria-label="t('displays.screenSize.configure')"
                :aria-expanded="isExpandedRemoteDevice(item.deviceId)"
                @click.stop="toggleRemoteScreenConfig(item.deviceId)"
              >
                <Settings class="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            v-if="isExpandedRemoteDevice(item.deviceId)"
            class="border-t border-lp-surface px-3 py-3"
          >
            <label class="mb-3 flex flex-col gap-1 text-sm">
              <span class="text-lp-muted">{{ t('displays.external.label') }}</span>
              <input
                v-model="item.label"
                type="text"
                class="lp-field w-full rounded-md px-2 py-1.5 text-sm"
              />
            </label>
            <p class="mb-3 text-xs text-lp-muted">
              {{ t('displays.screenSize.monitorTitle', { label: remoteProjectorLabel(item) }) }}
            </p>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="flex flex-col gap-1 text-sm sm:col-span-2">
                <span class="text-lp-muted">{{ t('displays.screenSize.presetLabel') }}</span>
                <select
                  v-model="ensureRemoteScreenSize(item).preset"
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
                  v-model="ensureRemoteScreenSize(item).largura"
                  type="text"
                  inputmode="numeric"
                  class="lp-field w-full rounded-md px-2 py-1.5 text-sm disabled:opacity-50"
                  :disabled="ensureRemoteScreenSize(item).preset !== 'personalizado'"
                  :placeholder="t('displays.screenSize.widthPlaceholder')"
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                <span class="text-lp-muted">{{ t('displays.screenSize.heightLabel') }}</span>
                <input
                  v-model="ensureRemoteScreenSize(item).altura"
                  type="text"
                  inputmode="numeric"
                  class="lp-field w-full rounded-md px-2 py-1.5 text-sm disabled:opacity-50"
                  :disabled="ensureRemoteScreenSize(item).preset !== 'personalizado'"
                  :placeholder="t('displays.screenSize.heightPlaceholder')"
                />
              </label>
              <label class="flex flex-col gap-1 text-sm sm:col-span-2">
                <span class="text-lp-muted">{{ t('displays.screenSize.positionLabel') }}</span>
                <select
                  v-model="ensureRemoteScreenSize(item).position"
                  class="lp-field w-full rounded-md px-2 py-1.5 text-sm"
                >
                  <option v-for="opt in positionOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </label>
              <label
                v-if="ensureRemoteScreenSize(item).position === 'personalizado'"
                class="flex flex-col gap-1 text-sm"
              >
                <span class="text-lp-muted">{{ t('displays.screenSize.offsetXLabel') }}</span>
                <input
                  v-model="ensureRemoteScreenSize(item).offsetX"
                  type="text"
                  inputmode="numeric"
                  class="lp-field w-full rounded-md px-2 py-1.5 text-sm"
                  :placeholder="t('displays.screenSize.offsetXPlaceholder')"
                />
              </label>
              <label
                v-if="ensureRemoteScreenSize(item).position === 'personalizado'"
                class="flex flex-col gap-1 text-sm"
              >
                <span class="text-lp-muted">{{ t('displays.screenSize.offsetYLabel') }}</span>
                <input
                  v-model="ensureRemoteScreenSize(item).offsetY"
                  type="text"
                  inputmode="numeric"
                  class="lp-field w-full rounded-md px-2 py-1.5 text-sm"
                  :placeholder="t('displays.screenSize.offsetYPlaceholder')"
                />
              </label>
              <label class="flex flex-col gap-1 text-sm sm:col-span-2">
                <span class="text-lp-muted">{{ t('displays.screenSize.contentFitLabel') }}</span>
                <select
                  v-model="ensureRemoteScreenSize(item).contentFit"
                  class="lp-field w-full rounded-md px-2 py-1.5 text-sm"
                >
                  <option v-for="opt in contentFitOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <span class="text-xs text-lp-muted">{{ t('displays.screenSize.contentFitHint') }}</span>
              </label>
              <label class="inline-flex items-center gap-2 text-sm sm:col-span-2">
                <input v-model="ensureRemoteScreenSize(item).livePreview" type="checkbox" />
                <span>{{ t('displays.screenSize.livePreview') }}</span>
              </label>
            </div>
            <button
              type="button"
              class="mt-3 rounded-lg bg-lp-primary px-4 py-2 text-sm font-medium text-lp-background transition hover:opacity-90 disabled:opacity-50"
              :disabled="savingRemoteDeviceId === item.deviceId"
              @click="saveRemoteProjectorScreen(item)"
            >
              {{
                savingRemoteDeviceId === item.deviceId
                  ? t('displays.screenSize.saving')
                  : t('displays.screenSize.save')
              }}
            </button>
          </div>
        </li>
      </ul>
      <p v-else class="mt-2 text-sm text-lp-muted">{{ t('displays.remoteProjection.none') }}</p>
    </section>

    <section class="mt-6 border-t border-lp-surface pt-4">
      <h3 class="text-sm font-semibold text-lp-text">{{ t('displays.external.title') }}</h3>
      <p class="mt-1 text-sm text-lp-muted">{{ t('displays.external.hint') }}</p>

      <ul v-if="otherExternalDrafts.length" class="mt-3 space-y-2">
        <li
          v-for="item in otherExternalDrafts"
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
