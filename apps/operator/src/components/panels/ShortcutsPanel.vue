<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatComboLabel } from '@shared/shortcuts';
import { useShortcuts, type ShortcutId } from '../../composables/useShortcuts';

const { t } = useI18n();
const {
  shortcuts,
  listeningId,
  feedback,
  startListening,
  stopListening,
  clearShortcut,
  resetShortcut,
  resetAll,
  clearFeedback,
  handleCaptureKeydown,
} = useShortcuts();

function displayCombo(id: ShortcutId, combo: Parameters<typeof formatComboLabel>[0]): string {
  if (listeningId.value === id) {
    return t('settings.shortcuts.listening');
  }
  return formatComboLabel(combo);
}

function onKeydown(event: KeyboardEvent): void {
  handleCaptureKeydown(event);
}

onMounted(() => {
  clearFeedback();
  window.addEventListener('keydown', onKeydown, true);
});

onUnmounted(() => {
  stopListening();
  window.removeEventListener('keydown', onKeydown, true);
});
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <p class="text-lp-muted">{{ t('settings.shortcuts.intro') }}</p>

    <p
      v-if="feedback"
      class="rounded border px-3 py-2 text-xs"
      :class="
        feedback.type === 'error'
          ? 'border-rose-500/50 bg-rose-950/40 text-rose-200'
          : feedback.type === 'info'
            ? 'border-sky-500/40 bg-sky-950/30 text-sky-100'
            : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100'
      "
      role="status"
    >
      {{ feedback.message }}
    </p>

    <div class="overflow-x-auto rounded-lg border border-lp-surface">
      <table class="min-w-full text-left text-xs">
        <thead class="border-b border-lp-surface bg-lp-surface/40 text-lp-muted">
          <tr>
            <th scope="col" class="px-3 py-2 font-medium">{{ t('settings.shortcuts.colAction') }}</th>
            <th scope="col" class="px-3 py-2 font-medium">{{ t('settings.shortcuts.colContext') }}</th>
            <th scope="col" class="px-3 py-2 font-medium">{{ t('settings.shortcuts.colCombo') }}</th>
            <th scope="col" class="px-3 py-2 font-medium">{{ t('settings.shortcuts.colActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in shortcuts"
            :key="item.id"
            class="border-b border-lp-surface/60 last:border-0"
          >
            <td class="px-3 py-2 text-lp-text">{{ t(item.labelKey) }}</td>
            <td class="px-3 py-2 text-lp-muted">{{ t(item.contextKey) }}</td>
            <td
              class="px-3 py-2 font-mono"
              :class="listeningId === item.id ? 'font-semibold text-sky-300' : 'text-lp-text'"
            >
              {{ displayCombo(item.id, item.combo) }}
            </td>
            <td class="px-3 py-2">
              <div class="flex flex-wrap gap-1">
                <button
                  type="button"
                  class="rounded bg-lp-primary px-2 py-1 text-[11px] text-white hover:opacity-90"
                  @click="startListening(item.id)"
                >
                  {{
                    listeningId === item.id
                      ? t('settings.shortcuts.cancelCapture')
                      : t('settings.shortcuts.redefine')
                  }}
                </button>
                <button
                  type="button"
                  class="rounded border border-lp-surface px-2 py-1 text-[11px] text-lp-muted hover:text-lp-text"
                  @click="clearShortcut(item.id)"
                >
                  {{ t('settings.shortcuts.clear') }}
                </button>
                <button
                  type="button"
                  class="rounded border border-lp-surface px-2 py-1 text-[11px] text-lp-muted hover:text-lp-text"
                  @click="resetShortcut(item.id)"
                >
                  {{ t('settings.shortcuts.resetOne') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <button
      type="button"
      class="self-start rounded border border-amber-500/50 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-950/40"
      @click="resetAll()"
    >
      {{ t('settings.shortcuts.resetAll') }}
    </button>
  </div>
</template>
