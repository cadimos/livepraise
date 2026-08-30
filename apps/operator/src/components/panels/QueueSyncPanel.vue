<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useLiveSocket } from '../../composables/useLiveSocket';
import { useOperatorQueueSync } from '../../composables/useOperatorQueueSync';

const { t } = useI18n();
const { connected } = useLiveSocket();
const {
  enabled,
  revision,
  loading,
  saving,
  error,
  updatedAt,
  updatedBy,
  setEnabled,
} = useOperatorQueueSync();

async function toggle(): Promise<void> {
  const next = !enabled.value;
  if (next && !window.confirm(t('settings.queueSync.enableConfirm'))) return;
  await setEnabled(next);
}
</script>

<template>
  <div class="flex flex-col gap-4 text-sm">
    <p class="text-lp-muted">{{ t('settings.queueSync.intro') }}</p>

    <div class="rounded-lg border border-lp-surface bg-lp-background/40 p-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="font-medium text-lp-text">{{ t('settings.queueSync.toggle') }}</p>
          <p class="mt-1 text-xs text-lp-muted">
            {{ enabled ? t('settings.queueSync.enabledHint') : t('settings.queueSync.disabledHint') }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-md px-4 py-2 font-medium transition disabled:cursor-wait disabled:opacity-50"
          :class="enabled ? 'bg-amber-600 text-white hover:bg-amber-500' : 'bg-lp-primary text-white hover:opacity-90'"
          :disabled="loading || saving"
          @click="toggle"
        >
          {{
            saving
              ? t('settings.queueSync.saving')
              : enabled
                ? t('settings.queueSync.disable')
                : t('settings.queueSync.enable')
          }}
        </button>
      </div>
    </div>

    <p
      v-if="error"
      class="rounded border border-red-500/40 bg-red-950/30 px-3 py-2 text-red-200"
      role="alert"
    >
      {{ error }}
    </p>

    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-lp-muted">
      <dt>{{ t('settings.queueSync.connection') }}</dt>
      <dd>{{ connected ? t('connection.connected') : t('connection.reconnecting') }}</dd>
      <dt>{{ t('settings.queueSync.revision') }}</dt>
      <dd>{{ revision }}</dd>
      <template v-if="updatedAt">
        <dt>{{ t('settings.queueSync.lastUpdate') }}</dt>
        <dd>{{ new Date(updatedAt).toLocaleString() }}</dd>
      </template>
      <template v-if="updatedBy">
        <dt>{{ t('settings.queueSync.updatedBy') }}</dt>
        <dd>{{ updatedBy }}</dd>
      </template>
    </dl>
  </div>
</template>
