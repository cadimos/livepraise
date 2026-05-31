<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import SettingsModal from './SettingsModal.vue';
import { useFooterAlert } from '../composables/useFooterAlert';

const open = defineModel<boolean>('open', { default: false });

const { t } = useI18n();
const {
  draft,
  rows,
  loading,
  loadMonitors,
  updateDraft,
  sendAlert,
  stopAlert,
  setRowEnabled,
} = useFooterAlert();

const sendError = ref('');

watch(open, (isOpen) => {
  if (isOpen) {
    sendError.value = '';
    void loadMonitors();
  }
});

function roleLabel(roleHint: string): string {
  if (roleHint === 'projection') return t('displays.roles.projection');
  if (roleHint === 'stage-return') return t('displays.roles.stage-return');
  if (
    roleHint === 'live' ||
    roleHint === 'vocal' ||
    roleHint === 'stage' ||
    roleHint === 'player'
  ) {
    return t(`footerAlert.externalProfiles.${roleHint}`);
  }
  return roleHint;
}

function onSend(): void {
  sendError.value = '';
  if (!sendAlert()) {
    sendError.value = t('footerAlert.textRequired');
  }
}
</script>

<template>
  <SettingsModal v-model:open="open" :title="t('footerAlert.title')" wide>
    <p class="mb-4 text-sm text-lp-muted">{{ t('footerAlert.intro') }}</p>

    <label class="mb-4 flex flex-col gap-1 text-sm">
      <span>{{ t('footerAlert.text') }}</span>
      <textarea
        :value="draft.text"
        rows="3"
        class="rounded-md border border-lp-surface bg-lp-background px-3 py-2"
        :placeholder="t('footerAlert.textPlaceholder')"
        @input="updateDraft({ text: ($event.target as HTMLTextAreaElement).value })"
      />
    </label>

    <div class="mb-4 grid gap-3 sm:grid-cols-2">
      <label class="flex flex-col gap-1 text-sm">
        <span>{{ t('footerAlert.repeatCount') }}</span>
        <input
          :value="draft.repeatCount"
          type="number"
          min="1"
          max="20"
          class="rounded-md border border-lp-surface bg-lp-background px-3 py-2"
          @input="
            updateDraft({
              repeatCount: Number(($event.target as HTMLInputElement).value),
            })
          "
        />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        <span>{{ t('footerAlert.scrollDuration') }}</span>
        <input
          :value="draft.scrollDurationSec"
          type="number"
          min="1"
          max="120"
          class="rounded-md border border-lp-surface bg-lp-background px-3 py-2"
          @input="
            updateDraft({
              scrollDurationSec: Number(($event.target as HTMLInputElement).value),
            })
          "
        />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        <span>{{ t('footerAlert.textColor') }}</span>
        <input
          :value="draft.textColor"
          type="color"
          class="h-10 w-full cursor-pointer rounded-md border border-lp-surface bg-lp-background"
          @input="updateDraft({ textColor: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        <span>{{ t('footerAlert.backgroundColor') }}</span>
        <input
          :value="draft.backgroundColor"
          type="color"
          class="h-10 w-full cursor-pointer rounded-md border border-lp-surface bg-lp-background"
          @input="
            updateDraft({ backgroundColor: ($event.target as HTMLInputElement).value })
          "
        />
      </label>
    </div>

    <h3 class="mb-2 text-sm font-semibold">{{ t('footerAlert.targetsTitle') }}</h3>
    <p class="mb-3 text-xs text-lp-muted">{{ t('footerAlert.targetsHint') }}</p>

    <p v-if="loading" class="mb-4 text-sm text-lp-muted">{{ t('footerAlert.loading') }}</p>
    <p v-else-if="!rows.length" class="mb-4 text-sm text-lp-muted">
      {{ t('footerAlert.noTargets') }}
    </p>
    <ul v-else class="mb-4 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-lp-surface p-2">
      <li
        v-for="row in rows"
        :key="row.key"
        class="flex items-center justify-between gap-2 text-sm"
      >
        <label class="flex min-w-0 flex-1 items-center gap-2">
          <input
            type="checkbox"
            :checked="row.enabled"
            @change="
              setRowEnabled(row.key, ($event.target as HTMLInputElement).checked)
            "
          />
          <span class="truncate">{{ row.label }}</span>
          <span class="shrink-0 text-xs text-lp-muted">{{ roleLabel(row.roleHint) }}</span>
        </label>
      </li>
    </ul>

    <p v-if="sendError" class="mb-3 text-sm text-rose-300" role="alert">{{ sendError }}</p>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-md bg-lp-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        @click="onSend"
      >
        {{ t('footerAlert.send') }}
      </button>
      <button
        type="button"
        class="rounded-md border border-lp-surface px-4 py-2 text-sm hover:bg-lp-surface/50"
        @click="stopAlert"
      >
        {{ t('footerAlert.stop') }}
      </button>
    </div>
  </SettingsModal>
</template>
