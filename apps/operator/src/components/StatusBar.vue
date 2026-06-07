<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchJson } from '../composables/useApi';
import { useExternalDevices } from '../composables/useExternalDevices';
import { useLiveSocket } from '../composables/useLiveSocket';
import { usePreferences } from '../composables/usePreferences';
import { useTheme } from '../composables/useTheme';
import { useLocale } from '../composables/useLocale';
import { useLocalIp } from '../composables/useLocalIp';
import ExternalDeviceStatusMenu from './ExternalDeviceStatusMenu.vue';
import { APP_VERSION } from '@shared/app-version';
import { useLocaleLabel } from '../utils/locale-label';

defineEmits<{ openDisplays: [] }>();

type LivepraiseBridge = { version?: string };

const bridge = (window as Window & { livepraise?: LivepraiseBridge }).livepraise;
const appVersion = computed(() => bridge?.version ?? APP_VERSION);
const localeLabel = useLocaleLabel();

const { t } = useI18n();
const { prefs } = usePreferences();
const { connected, authRequired } = useLiveSocket();
const { themes, applyTheme } = useTheme();
const { availableLocales, changeLocale } = useLocale();
const { localIp, networkOnline } = useLocalIp();
const {
  onlineProjectionCount,
  onlineReturnCount,
  onlineStageReturnCount,
} = useExternalDevices();

const displayCount = ref(0);
const electronProjectionCount = ref(0);
const electronStageReturnCount = ref(0);

const localeOptions = computed(() => {
  if (availableLocales.value.length > 0) return availableLocales.value;
  return [prefs.value.locale];
});

const projectionTotal = computed(
  () => electronProjectionCount.value + onlineProjectionCount.value,
);

const returnTotal = computed(
  () =>
    electronStageReturnCount.value +
    onlineReturnCount.value,
);

const stageReturnTotal = computed(
  () => electronStageReturnCount.value + onlineStageReturnCount.value,
);

async function loadDisplays() {
  try {
    const data = await fetchJson<{
      status: string;
      config: {
        assignments: { role: string }[];
      } | null;
    }>('/displays/config');
    const assignments = data.config?.assignments ?? [];
    displayCount.value = assignments.length;
    electronProjectionCount.value = assignments.filter(
      (a) => a.role === 'projection',
    ).length;
    electronStageReturnCount.value = assignments.filter(
      (a) => a.role === 'stage-return',
    ).length;
  } catch {
    displayCount.value = 0;
    electronProjectionCount.value = 0;
    electronStageReturnCount.value = 0;
  }
}

function onThemeChange(event: Event) {
  void applyTheme((event.target as HTMLSelectElement).value);
}

function onLocaleChange(event: Event) {
  void changeLocale((event.target as HTMLSelectElement).value);
}

onMounted(() => {
  void loadDisplays();
});
</script>

<template>
  <footer
    class="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-lp-surface bg-lp-surface/90 px-4 py-2 text-xs text-lp-muted"
  >
    <span class="font-semibold text-lp-text">{{ t('app.name') }}</span>
    <span>{{ t('status.version', { version: appVersion }) }}</span>

    <label class="inline-flex items-center gap-1.5">
      <span>{{ t('settings.theme') }}</span>
      <select
        :value="prefs.themeId"
        class="rounded border border-lp-surface bg-lp-background px-1.5 py-0.5 text-xs text-lp-text"
        @change="onThemeChange"
      >
        <option v-for="theme in themes" :key="theme.id" :value="theme.id">
          {{ theme.label }}
        </option>
      </select>
    </label>

    <label class="inline-flex items-center gap-1.5">
      <span>{{ t('settings.locale') }}</span>
      <select
        :value="prefs.locale"
        class="rounded border border-lp-surface bg-lp-background px-1.5 py-0.5 text-xs text-lp-text"
        @change="onLocaleChange"
      >
        <option v-for="locale in localeOptions" :key="locale" :value="locale">
          {{ localeLabel(locale) }}
        </option>
      </select>
    </label>

    <span
      class="inline-flex items-center gap-1.5"
      :class="connected ? 'text-emerald-400' : authRequired ? 'text-rose-400' : 'text-amber-400'"
    >
      <span
        class="h-1.5 w-1.5 rounded-full"
        :class="connected ? 'bg-emerald-400' : authRequired ? 'bg-rose-400' : 'bg-amber-400'"
      />
      {{
        connected
          ? t('connection.connected')
          : authRequired
            ? t('connection.authRequired')
            : t('connection.reconnecting')
      }}
    </span>

    <ExternalDeviceStatusMenu
      :display-count="displayCount"
      :projection-total="projectionTotal"
      :return-total="returnTotal"
      :stage-return-total="stageReturnTotal"
      @open-displays="$emit('openDisplays')"
    />

    <span aria-live="polite">
      <template v-if="!networkOnline">{{ t('status.noNetwork') }}</template>
      <template v-else>{{ t('status.localIp', { ip: localIp ?? '—' }) }}</template>
    </span>
  </footer>
</template>
