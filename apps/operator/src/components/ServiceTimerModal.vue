<script setup lang="ts">
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import SettingsModal from './SettingsModal.vue';
import { useServiceTimer } from '../composables/useServiceTimer';
import type { ServiceTimerMode } from '@shared/service-timer';

const open = defineModel<boolean>('open', { default: false });

const { t } = useI18n();
const {
  state,
  rows,
  loading,
  timerMinutes,
  previewCounter,
  previewTimer,
  loadMonitors,
  setActive,
  toggleRunning,
  reset,
  updateRow,
} = useServiceTimer();

watch(open, (isOpen) => {
  if (isOpen) void loadMonitors();
});

function roleLabel(roleHint: string): string {
  if (roleHint === 'projection') return t('displays.roles.projection');
  if (roleHint === 'stage-return') return t('displays.roles.stage-return');
  if (roleHint === 'live' || roleHint === 'vocal' || roleHint === 'stage' || roleHint === 'player') {
    return t(`serviceTimer.externalProfiles.${roleHint}`);
  }
  return roleHint;
}

function onModeChange(key: string, mode: ServiceTimerMode): void {
  updateRow(key, { mode });
}
</script>

<template>
  <SettingsModal v-model:open="open" :title="t('serviceTimer.title')" wide>
    <p class="mb-4 text-sm text-lp-muted">{{ t('serviceTimer.intro') }}</p>

    <label class="mb-4 flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        :checked="state.active"
        @change="setActive(($event.target as HTMLInputElement).checked)"
      />
      {{ t('serviceTimer.enable') }}
    </label>

    <div
      class="mb-4 grid gap-3 rounded-lg border border-lp-surface bg-lp-surface/30 p-3 sm:grid-cols-2"
    >
      <div>
        <span class="text-xs font-medium uppercase text-lp-muted">{{
          t('serviceTimer.modes.counter')
        }}</span>
        <p class="font-mono text-2xl tabular-nums">{{ previewCounter }}</p>
      </div>
      <div>
        <span class="text-xs font-medium uppercase text-lp-muted">{{
          t('serviceTimer.modes.timer')
        }}</span>
        <p class="font-mono text-2xl tabular-nums">{{ previewTimer }}</p>
      </div>
    </div>

    <div class="mb-4 flex flex-wrap items-end gap-3">
      <label class="flex flex-col gap-1 text-sm">
        <span>{{ t('serviceTimer.durationMinutes') }}</span>
        <input
          v-model.number="timerMinutes"
          type="number"
          min="1"
          max="600"
          class="w-24 rounded border border-lp-surface bg-lp-background px-2 py-1"
          :disabled="!state.active"
        />
      </label>
      <button
        type="button"
        class="rounded-md bg-lp-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        :disabled="!state.active"
        @click="toggleRunning"
      >
        {{ state.running ? t('serviceTimer.pause') : t('serviceTimer.start') }}
      </button>
      <button
        type="button"
        class="rounded-md border border-lp-surface px-3 py-2 text-sm disabled:opacity-50"
        :disabled="!state.active"
        @click="reset"
      >
        {{ t('serviceTimer.reset') }}
      </button>
    </div>

    <h3 class="mb-2 text-sm font-semibold">{{ t('serviceTimer.targetsTitle') }}</h3>
    <p class="mb-3 text-xs text-lp-muted">{{ t('serviceTimer.targetsHint') }}</p>

    <p v-if="loading" class="text-sm text-lp-muted">{{ t('serviceTimer.loading') }}</p>
    <p v-else-if="!rows.length" class="text-sm text-lp-muted">
      {{ t('serviceTimer.noTargets') }}
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="row in rows"
        :key="row.key"
        class="flex flex-wrap items-center gap-2 rounded border border-lp-surface px-3 py-2 text-sm"
      >
        <label class="flex min-w-0 flex-1 items-center gap-2">
          <input
            type="checkbox"
            :checked="row.enabled"
            :disabled="!state.active"
            @change="
              updateRow(row.key, {
                enabled: ($event.target as HTMLInputElement).checked,
              })
            "
          />
          <span class="truncate font-medium">{{ row.label }}</span>
          <span class="text-xs text-lp-muted">({{ roleLabel(row.roleHint) }})</span>
        </label>
        <select
          class="rounded border border-lp-surface bg-lp-background px-2 py-1 text-sm disabled:opacity-50"
          :value="row.mode"
          :disabled="!state.active || !row.enabled"
          @change="onModeChange(row.key, ($event.target as HTMLSelectElement).value as ServiceTimerMode)"
        >
          <option value="counter">{{ t('serviceTimer.modes.counter') }}</option>
          <option value="timer">{{ t('serviceTimer.modes.timer') }}</option>
        </select>
      </li>
    </ul>
  </SettingsModal>
</template>
