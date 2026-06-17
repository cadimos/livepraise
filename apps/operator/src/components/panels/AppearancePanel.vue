<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePreferences } from '../../composables/usePreferences';
import { useTheme } from '../../composables/useTheme';
import { useLocale } from '../../composables/useLocale';
import { useLocaleLabel } from '../../utils/locale-label';

const { t } = useI18n();
const localeLabel = useLocaleLabel();
const { prefs, setFontScalePercent } = usePreferences();
const { themes, applyTheme } = useTheme();
const { availableLocales, changeLocale } = useLocale();

const localeOptions = computed(() => {
  if (availableLocales.value.length > 0) return availableLocales.value;
  return [prefs.value.locale];
});

function onThemeChange(event: Event) {
  void applyTheme((event.target as HTMLSelectElement).value);
}

function onLocaleChange(event: Event) {
  void changeLocale((event.target as HTMLSelectElement).value);
}

function onFontScaleInput(event: Event) {
  setFontScalePercent(Number((event.target as HTMLInputElement).value));
}

</script>

<template>
  <div class="flex flex-col gap-4 text-sm">
    <p class="text-lp-muted">
      {{ t('settings.appearance.intro') }}
    </p>

    <label class="flex flex-col gap-1.5">
      <span class="font-medium text-lp-text">{{ t('settings.theme') }}</span>
      <select
        :value="prefs.themeId"
        class="rounded border border-lp-surface bg-lp-background px-2 py-1.5 text-lp-text"
        @change="onThemeChange"
      >
        <option
          v-for="theme in themes"
          :key="theme.id"
          :value="theme.id"
        >
          {{ theme.label }}
        </option>
      </select>
    </label>

    <label class="flex flex-col gap-1.5">
      <span class="font-medium text-lp-text">{{ t('settings.appearance.fontScale') }}</span>
      <div class="flex items-center gap-3">
        <input
          type="range"
          min="100"
          max="125"
          step="5"
          class="min-w-0 flex-1"
          :value="prefs.fontScalePercent"
          :aria-valuetext="t('settings.appearance.fontScaleValue', { percent: prefs.fontScalePercent })"
          @input="onFontScaleInput"
        >
        <span class="w-12 shrink-0 text-right tabular-nums text-lp-muted">
          {{ prefs.fontScalePercent }}%
        </span>
      </div>
      <p class="text-xs text-lp-muted">{{ t('settings.appearance.fontScaleHint') }}</p>
    </label>

    <label class="flex flex-col gap-1.5">
      <span class="font-medium text-lp-text">{{ t('settings.locale') }}</span>
      <select
        :value="prefs.locale"
        class="rounded border border-lp-surface bg-lp-background px-2 py-1.5 text-lp-text"
        @change="onLocaleChange"
      >
        <option
          v-for="locale in localeOptions"
          :key="locale"
          :value="locale"
        >
          {{ localeLabel(locale) }}
        </option>
      </select>
    </label>
  </div>
</template>
