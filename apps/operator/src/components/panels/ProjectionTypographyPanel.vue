<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ProjectionTypographyPreview, {
  type ProjectionPreviewSample,
} from '../ProjectionTypographyPreview.vue';
import { usePreferences } from '../../composables/usePreferences';
import { useProjectionFonts } from '../../composables/useProjectionFonts';
import {
  DEFAULT_TEXT_SHADOW_LAYERS,
  PROJECTION_TYPOGRAPHY_PROFILE_KEYS,
  applyProjectionFontStylePreset,
  projectionFontStylePreset,
  projectionTypographyMinMaxError,
  type ProjectionFontStylePreset,
  type ProjectionTextShadowLayer,
  type ProjectionTypographyProfileKey,
} from '@shared/projection-typography';
import { isValidAdvancedTextShadowCss } from '@shared/projection-text-shadow';

const { t } = useI18n();
const { prefs, patchProjectionTypographyProfile } = usePreferences();
const { bundledFamilies, systemFonts } = useProjectionFonts();

const activeProfileKey = ref<ProjectionTypographyProfileKey>('projector');
const previewSample = ref<ProjectionPreviewSample>('worship');
const advancedShadowError = ref(false);

const previewSamples: { id: ProjectionPreviewSample; labelKey: string }[] = [
  { id: 'worship', labelKey: 'settings.projectionTypography.preview.sampleWorship' },
  { id: 'bible', labelKey: 'settings.projectionTypography.preview.sampleBible' },
  { id: 'notes', labelKey: 'settings.projectionTypography.preview.sampleNotes' },
];

const activeProfile = computed(
  () => prefs.value.projectionTypography[activeProfileKey.value],
);

const minMaxError = computed(() => projectionTypographyMinMaxError(activeProfile.value));

const stylePreset = computed(() => projectionFontStylePreset(activeProfile.value));

const stylePresets: ProjectionFontStylePreset[] = [
  'normal',
  'bold',
  'italic',
  'boldItalic',
];

function patch(patch: Parameters<typeof patchProjectionTypographyProfile>[1]): void {
  patchProjectionTypographyProfile(activeProfileKey.value, patch);
}

function onFontSourceChange(event: Event): void {
  const source = (event.target as HTMLSelectElement).value as 'bundled' | 'system';
  const firstBundled = bundledFamilies[0]?.id ?? 'roboto';
  const firstSystem = systemFonts.value[0]?.family ?? 'Arial';
  patch({
    fontSource: source,
    fontFamily: source === 'bundled' ? firstBundled : firstSystem,
  });
}

function onFontFamilyChange(event: Event): void {
  patch({ fontFamily: (event.target as HTMLSelectElement).value });
}

function onStylePreset(preset: ProjectionFontStylePreset): void {
  patch(applyProjectionFontStylePreset(preset));
}

function onMinMaxInput(field: 'minFontPx' | 'maxFontPx', event: Event): void {
  patch({ [field]: Number((event.target as HTMLInputElement).value) });
}

function onShadowLayerChange(
  index: number,
  field: keyof ProjectionTextShadowLayer,
  event: Event,
): void {
  const target = event.target as HTMLInputElement;
  const value = field === 'color' ? target.value : Number(target.value);
  const layers = activeProfile.value.textShadowLayers.map((layer, i) =>
    i === index ? { ...layer, [field]: value } : layer,
  );
  patch({ textShadowLayers: layers });
}

function restoreDefaultShadow(): void {
  patch({
    textShadowLayers: DEFAULT_TEXT_SHADOW_LAYERS.map((layer) => ({ ...layer })),
  });
}

function addShadowLayer(): void {
  patch({
    textShadowLayers: [
      ...activeProfile.value.textShadowLayers,
      { offsetX: 0, offsetY: 0, blur: 0, color: '#000000' },
    ],
  });
}

function removeLastShadowLayer(): void {
  const layers = activeProfile.value.textShadowLayers;
  if (layers.length <= 1) return;
  patch({ textShadowLayers: layers.slice(0, -1) });
}

function onAdvancedShadowInput(event: Event): void {
  const value = (event.target as HTMLTextAreaElement).value;
  advancedShadowError.value =
    value.trim().length > 0 && !isValidAdvancedTextShadowCss(value);
  patch({ textShadowCssAdvanced: value.trim() || undefined });
}
</script>

<template>
  <div class="text-sm">
    <p class="mb-4 text-lp-muted">{{ t('settings.projectionTypography.intro') }}</p>

    <div
      class="mb-4 flex gap-1 overflow-x-auto border-b border-lp-surface"
      role="tablist"
      :aria-label="t('settings.projectionTypography.title')"
    >
      <button
        v-for="key in PROJECTION_TYPOGRAPHY_PROFILE_KEYS"
        :key="key"
        type="button"
        role="tab"
        class="shrink-0 border-b-2 px-3 py-2 text-sm transition"
        :class="
          activeProfileKey === key
            ? 'border-lp-primary font-medium text-lp-text'
            : 'border-transparent text-lp-muted hover:text-lp-text'
        "
        :aria-selected="activeProfileKey === key"
        @click="activeProfileKey = key"
      >
        {{ t(`settings.projectionTypography.profiles.${key}`) }}
      </button>
    </div>

    <div class="lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-6">
      <div class="flex flex-col gap-5">
        <section>
          <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-lp-muted">
            {{ t('settings.projectionTypography.sections.font') }}
          </h3>

          <label class="mb-3 flex flex-col gap-1.5">
            <span class="font-medium text-lp-text">{{
              t('settings.projectionTypography.fontSource')
            }}</span>
            <select
              :value="activeProfile.fontSource"
              class="rounded border border-lp-surface bg-lp-background px-2 py-1.5 text-lp-text"
              @change="onFontSourceChange"
            >
              <option value="bundled">
                {{ t('settings.projectionTypography.fontSourceBundled') }}
              </option>
              <option value="system">
                {{ t('settings.projectionTypography.fontSourceSystem') }}
              </option>
            </select>
          </label>

          <p
            v-if="activeProfile.fontSource === 'system'"
            class="mb-3 rounded-md border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-100"
            role="status"
          >
            {{ t('settings.projectionTypography.fontSourceSystemWarning') }}
          </p>

          <label class="mb-3 flex flex-col gap-1.5">
            <span class="font-medium text-lp-text">{{
              t('settings.projectionTypography.fontFamily')
            }}</span>
            <select
              :value="activeProfile.fontFamily"
              class="rounded border border-lp-surface bg-lp-background px-2 py-1.5 text-lp-text"
              @change="onFontFamilyChange"
            >
              <optgroup
                v-if="activeProfile.fontSource === 'bundled'"
                :label="t('settings.projectionTypography.fontFamilyBundledGroup')"
              >
                <option v-for="family in bundledFamilies" :key="family.id" :value="family.id">
                  {{ family.label }}
                </option>
              </optgroup>
              <optgroup
                v-else
                :label="t('settings.projectionTypography.fontFamilySystemGroup')"
              >
                <option
                  v-for="font in systemFonts"
                  :key="font.family"
                  :value="font.family"
                >
                  {{ font.localizedName }}
                </option>
              </optgroup>
            </select>
          </label>

          <span class="mb-1.5 block font-medium text-lp-text">{{
            t('settings.projectionTypography.fontStyleGroup')
          }}</span>
          <div
            class="flex flex-wrap gap-1.5"
            role="group"
            :aria-label="t('settings.projectionTypography.fontStyleGroup')"
          >
            <button
              v-for="preset in stylePresets"
              :key="preset"
              type="button"
              class="rounded-md px-3 py-2 text-sm transition"
              :class="
                stylePreset === preset
                  ? 'bg-lp-primary font-medium text-white'
                  : 'border border-lp-surface text-lp-text hover:bg-lp-surface/50'
              "
              :aria-pressed="stylePreset === preset"
              @click="onStylePreset(preset)"
            >
              {{ t(`settings.projectionTypography.fontStyle.${preset}`) }}
            </button>
          </div>
        </section>

        <section>
          <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-lp-muted">
            {{ t('settings.projectionTypography.sections.size') }}
          </h3>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="flex flex-col gap-1.5">
              <span class="font-medium text-lp-text">{{
                t('settings.projectionTypography.minFontPx')
              }}</span>
              <div class="flex items-center gap-2">
                <input
                  type="number"
                  min="8"
                  max="400"
                  class="w-full rounded border border-lp-surface bg-lp-background px-2 py-1.5 tabular-nums text-lp-text"
                  :value="activeProfile.minFontPx"
                  @input="onMinMaxInput('minFontPx', $event)"
                />
                <span class="shrink-0 text-lp-muted">{{
                  t('settings.projectionTypography.minMaxUnit')
                }}</span>
              </div>
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="font-medium text-lp-text">{{
                t('settings.projectionTypography.maxFontPx')
              }}</span>
              <div class="flex items-center gap-2">
                <input
                  type="number"
                  min="8"
                  max="400"
                  class="w-full rounded border border-lp-surface bg-lp-background px-2 py-1.5 tabular-nums text-lp-text"
                  :value="activeProfile.maxFontPx"
                  @input="onMinMaxInput('maxFontPx', $event)"
                />
                <span class="shrink-0 text-lp-muted">{{
                  t('settings.projectionTypography.minMaxUnit')
                }}</span>
              </div>
            </label>
          </div>
          <p v-if="minMaxError" class="mt-1 text-xs text-red-400" role="alert">
            {{ t('settings.projectionTypography.minMaxError') }}
          </p>
          <p v-else class="mt-1 text-xs text-lp-muted">
            {{ t('settings.projectionTypography.minMaxHint') }}
          </p>
        </section>

        <section>
          <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-lp-muted">
            {{ t('settings.projectionTypography.sections.textfill') }}
          </h3>
          <label class="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              class="h-4 w-4 shrink-0"
              :checked="activeProfile.textfillEnabled"
              @change="
                patch({
                  textfillEnabled: ($event.target as HTMLInputElement).checked,
                })
              "
            />
            <span class="font-medium text-lp-text">{{
              t('settings.projectionTypography.textfillEnabled')
            }}</span>
          </label>
          <p class="mt-1 text-xs text-lp-muted">
            {{ t('settings.projectionTypography.textfillHint') }}
          </p>
        </section>

        <section>
          <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-lp-muted">
            {{ t('settings.projectionTypography.sections.shadow') }}
          </h3>

          <label class="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              class="h-4 w-4 shrink-0"
              :checked="activeProfile.textShadowEnabled"
              @change="
                patch({
                  textShadowEnabled: ($event.target as HTMLInputElement).checked,
                })
              "
            />
            <span class="font-medium text-lp-text">{{
              t('settings.projectionTypography.textShadowEnabled')
            }}</span>
          </label>
          <p v-if="!activeProfile.textShadowEnabled" class="mt-1 text-xs text-lp-muted">
            {{ t('settings.projectionTypography.textShadowDisabledHint') }}
          </p>

          <div
            class="mt-3 space-y-3"
            :class="
              !activeProfile.textShadowEnabled
                ? 'pointer-events-none opacity-50'
                : ''
            "
          >
            <details open class="group">
              <summary
                class="cursor-pointer text-sm font-medium text-lp-text marker:content-none [&::-webkit-details-marker]:hidden"
              >
                {{ t('settings.projectionTypography.shadowLayersTitle') }}
              </summary>
              <div class="mt-3 space-y-3">
                <div
                  v-for="(layer, index) in activeProfile.textShadowLayers"
                  :key="index"
                  class="rounded-lg border border-lp-surface bg-lp-surface/20 p-3 space-y-3"
                >
                  <h4 class="text-xs font-medium text-lp-muted">
                    {{
                      t('settings.projectionTypography.shadowLayer', {
                        index: index + 1,
                      })
                    }}
                  </h4>
                  <div class="grid gap-2 sm:grid-cols-2">
                    <label class="flex flex-col gap-1 text-xs">
                      <span class="font-medium text-lp-muted">{{
                        t('settings.projectionTypography.shadowOffsetX')
                      }}</span>
                      <div class="flex items-center gap-2">
                        <input
                          type="range"
                          min="-20"
                          max="20"
                          class="min-w-0 flex-1"
                          :value="layer.offsetX"
                          @input="onShadowLayerChange(index, 'offsetX', $event)"
                        />
                        <span class="w-14 shrink-0 text-right tabular-nums text-lp-muted">{{
                          layer.offsetX
                        }}</span>
                      </div>
                    </label>
                    <label class="flex flex-col gap-1 text-xs">
                      <span class="font-medium text-lp-muted">{{
                        t('settings.projectionTypography.shadowOffsetY')
                      }}</span>
                      <div class="flex items-center gap-2">
                        <input
                          type="range"
                          min="-20"
                          max="20"
                          class="min-w-0 flex-1"
                          :value="layer.offsetY"
                          @input="onShadowLayerChange(index, 'offsetY', $event)"
                        />
                        <span class="w-14 shrink-0 text-right tabular-nums text-lp-muted">{{
                          layer.offsetY
                        }}</span>
                      </div>
                    </label>
                    <label class="flex flex-col gap-1 text-xs">
                      <span class="font-medium text-lp-muted">{{
                        t('settings.projectionTypography.shadowBlur')
                      }}</span>
                      <div class="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="20"
                          class="min-w-0 flex-1"
                          :value="layer.blur"
                          @input="onShadowLayerChange(index, 'blur', $event)"
                        />
                        <span class="w-14 shrink-0 text-right tabular-nums text-lp-muted">{{
                          layer.blur
                        }}</span>
                      </div>
                    </label>
                    <label class="flex flex-col gap-1 text-xs">
                      <span class="font-medium text-lp-muted">{{
                        t('settings.projectionTypography.shadowColor')
                      }}</span>
                      <input
                        type="color"
                        class="h-9 w-full cursor-pointer rounded border border-lp-surface bg-lp-background"
                        :value="layer.color"
                        @input="onShadowLayerChange(index, 'color', $event)"
                      />
                    </label>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-md border border-lp-surface px-3 py-1.5 text-xs text-lp-text hover:bg-lp-surface/50"
                    @click="addShadowLayer"
                  >
                    {{ t('settings.projectionTypography.shadowAddLayer') }}
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-lp-surface px-3 py-1.5 text-xs text-lp-text hover:bg-lp-surface/50 disabled:opacity-40"
                    :disabled="activeProfile.textShadowLayers.length <= 1"
                    @click="removeLastShadowLayer"
                  >
                    {{ t('settings.projectionTypography.shadowRemoveLayer') }}
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-lp-surface px-3 py-1.5 text-xs text-lp-text hover:bg-lp-surface/50"
                    @click="restoreDefaultShadow"
                  >
                    {{ t('settings.projectionTypography.shadowRestoreDefault') }}
                  </button>
                </div>
              </div>
            </details>

            <details class="rounded-lg border border-lp-surface/60 p-2">
              <summary class="cursor-pointer px-1 py-1 text-xs font-medium text-lp-muted">
                {{ t('settings.projectionTypography.shadowAdvancedTitle') }}
              </summary>
              <p class="mt-2 px-1 text-xs text-lp-muted">
                {{ t('settings.projectionTypography.shadowAdvancedHint') }}
              </p>
              <textarea
                class="mt-2 w-full rounded border border-lp-surface bg-lp-background px-2 py-1.5 font-mono text-xs text-lp-text"
                rows="2"
                :value="activeProfile.textShadowCssAdvanced ?? ''"
                @input="onAdvancedShadowInput"
              />
              <p v-if="advancedShadowError" class="mt-1 px-1 text-xs text-red-400" role="alert">
                {{ t('settings.projectionTypography.shadowAdvancedError') }}
              </p>
            </details>
          </div>
        </section>
      </div>

      <ProjectionTypographyPreview
        class="mt-6 lg:mt-0"
        :profile="activeProfile"
        :profile-key="activeProfileKey"
        :sample="previewSample"
      >
        <template #sample-selector>
          <p class="mb-1.5 text-xs text-lp-muted">
            {{ t('settings.projectionTypography.preview.sampleLabel') }}
          </p>
          <div class="mb-2 flex flex-wrap gap-1.5">
            <button
              v-for="sample in previewSamples"
              :key="sample.id"
              type="button"
              class="rounded-full border border-lp-surface px-2.5 py-0.5 text-xs transition"
              :class="
                previewSample === sample.id
                  ? 'bg-lp-surface text-lp-text'
                  : 'text-lp-muted hover:text-lp-text'
              "
              @click="previewSample = sample.id"
            >
              {{ t(sample.labelKey) }}
            </button>
          </div>
        </template>
      </ProjectionTypographyPreview>
    </div>
  </div>
</template>
