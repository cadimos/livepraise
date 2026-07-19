import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue';
import {
  createProjectionTextfill,
  PROJECTION_TEXTFILL_PREVIEW_REFRESH_DEBOUNCE_MS,
  PROJECTION_TEXTFILL_RESIZE_DEBOUNCE_MS,
  type ProjectionTextfillHandle,
} from '@shared/projection-textfill';
import {
  applyProjectionTypographyStyles,
  bundledFontFileForProfile,
  type ProjectionTypographyProfile,
} from '@shared/projection-typography';
import {
  projectionTextShadowSlackPx,
  resolveProjectionTextShadowCss,
} from '@shared/projection-text-shadow';
import { apiBase } from './useApi';
import { useProjectionFonts } from './useProjectionFonts';

/** @deprecated Preferir exports em `@shared/projection-textfill`. */
export const PREVIEW_REFRESH_DEBOUNCE_MS = PROJECTION_TEXTFILL_PREVIEW_REFRESH_DEBOUNCE_MS;
/** @deprecated Preferir exports em `@shared/projection-textfill`. */
export const PREVIEW_RESIZE_DEBOUNCE_MS = PROJECTION_TEXTFILL_RESIZE_DEBOUNCE_MS;

export interface UseProjectionTypographyPreviewOptions {
  rootRef: Ref<HTMLElement | null>;
  frameRef: Ref<HTMLElement | null>;
  profile: Ref<ProjectionTypographyProfile> | ComputedRef<ProjectionTypographyProfile>;
  diagnosticSurface?: Ref<string> | ComputedRef<string> | string;
  /** Prepara HTML antes do textfill; retornar `false` para abortar. */
  prepareContent?: () => boolean | void;
  disabled?: Ref<boolean> | ComputedRef<boolean>;
  /** Ocultar tile até primeira medição (painel de configurações). */
  previewReady?: Ref<boolean>;
  /** Se definido, só corre textfill quando a assinatura muda ou `remeasure`. */
  layoutSignature?: Ref<string> | ComputedRef<string>;
  /** Fonte externa para reagendar refresh (ex.: typographySignature). */
  watchSource?: Ref<string> | ComputedRef<string>;
}

export function useProjectionTypographyPreview(
  options: UseProjectionTypographyPreviewOptions,
) {
  const { bundledFamilyById, resolveCssFamily } = useProjectionFonts();
  const fontFaceStyleRef = ref<HTMLStyleElement | null>(null);

  let textfill: ProjectionTextfillHandle | null = null;
  let lastLayoutSignature = '';

  const profile = computed(() => unref(options.profile));

  const cssFamily = computed(() =>
    resolveCssFamily(profile.value.fontSource, profile.value.fontFamily),
  );

  const textShadowCss = computed(() =>
    resolveProjectionTextShadowCss(
      profile.value.textShadowLayers,
      profile.value.textShadowEnabled,
      profile.value.textShadowCssAdvanced,
    ),
  );

  const fitSlackPx = computed(() =>
    projectionTextShadowSlackPx(
      profile.value.textShadowLayers,
      profile.value.textShadowEnabled,
    ),
  );

  const fontFaceCss = computed(() => {
    if (profile.value.fontSource !== 'bundled') return '';
    const family = bundledFamilyById(profile.value.fontFamily);
    if (!family) return '';
    const fileName = bundledFontFileForProfile(
      family.files,
      profile.value.fontWeight,
      profile.value.fontStyle,
    );
    if (!fileName) return '';
    const url = `${apiBase()}/fonts/${encodeURIComponent(family.id)}/${encodeURIComponent(fileName)}`;
    return `@font-face{font-family:${family.cssFamily};src:url('${url}') format('woff2');font-weight:${profile.value.fontWeight};font-style:${profile.value.fontStyle};font-display:block;}`;
  });

  const diagnosticLabel = computed(() => {
    const surface = options.diagnosticSurface;
    if (surface === undefined) return 'operator-preview';
    return unref(surface);
  });

  function ensureTextfill(root: HTMLElement): ProjectionTextfillHandle {
    if (textfill) return textfill;
    textfill = createProjectionTextfill({
      rootEl: root,
      mode: 'preview',
      refreshDebounceMs: PROJECTION_TEXTFILL_PREVIEW_REFRESH_DEBOUNCE_MS,
      resizeDebounceMs: PROJECTION_TEXTFILL_RESIZE_DEBOUNCE_MS,
      resolve: () => ({
        minFontPx: profile.value.minFontPx,
        maxFontPx: profile.value.maxFontPx,
        textfillEnabled: profile.value.textfillEnabled,
        fontFamily: cssFamily.value,
        fontWeight: profile.value.fontWeight,
        fontStyle: profile.value.fontStyle,
        fitSlackPx: fitSlackPx.value,
        diagnosticSurface: diagnosticLabel.value,
      }),
      beforeRefresh: async () => {
        if (unref(options.disabled)) return false;
        await nextTick();
        if (options.prepareContent?.() === false) return false;
        if (!root.querySelector('.content span, .content, .texto')) return false;
        applyProjectionTypographyStyles(root, {
          fontFamily: cssFamily.value,
          fontWeight: profile.value.fontWeight,
          fontStyle: profile.value.fontStyle,
          textShadowCss: textShadowCss.value,
        });
      },
    });
    return textfill;
  }

  async function runPreviewRefresh(remeasure = false): Promise<void> {
    if (unref(options.disabled)) return;

    const layoutSig = options.layoutSignature ? unref(options.layoutSignature) : null;
    const layoutChanged = layoutSig !== null && layoutSig !== lastLayoutSignature;
    const needsTextfill = layoutSig === null || layoutChanged || remeasure;

    if (layoutChanged && options.previewReady) {
      options.previewReady.value = false;
    }

    await nextTick();
    const root = options.rootRef.value;
    if (!root) return;

    const handle = ensureTextfill(root);
    if (!needsTextfill) {
      applyProjectionTypographyStyles(root, {
        fontFamily: cssFamily.value,
        fontWeight: profile.value.fontWeight,
        fontStyle: profile.value.fontStyle,
        textShadowCss: textShadowCss.value,
      });
      if (options.previewReady) options.previewReady.value = true;
      return;
    }

    await handle.refresh();

    if (layoutSig !== null && layoutChanged) {
      lastLayoutSignature = layoutSig;
    }
    if (options.previewReady) {
      options.previewReady.value = true;
    }
  }

  function schedulePreviewRefresh(remeasure = false): void {
    const root = options.rootRef.value;
    if (!root) {
      void runPreviewRefresh(remeasure);
      return;
    }
    const handle = ensureTextfill(root);
    if (remeasure) {
      handle.scheduleRefresh();
      return;
    }
    void runPreviewRefresh(false);
  }

  function attachPreviewResizeObserver(): void {
    const root = options.rootRef.value;
    const frame = options.frameRef.value;
    if (!root) return;
    ensureTextfill(root).attach([frame]);
  }

  function detachPreviewResizeObserver(): void {
    textfill?.disconnect();
    textfill = null;
  }

  watch(fontFaceCss, (css) => {
    if (fontFaceStyleRef.value) {
      fontFaceStyleRef.value.textContent = css;
    }
  });

  if (options.watchSource) {
    watch(
      options.watchSource,
      () => {
        schedulePreviewRefresh(false);
      },
      { immediate: true },
    );
  }

  onMounted(() => {
    if (fontFaceStyleRef.value) {
      fontFaceStyleRef.value.textContent = fontFaceCss.value;
    }
    attachPreviewResizeObserver();
    if (!options.watchSource) {
      void runPreviewRefresh(false);
    }
  });

  onBeforeUnmount(detachPreviewResizeObserver);

  return {
    fontFaceStyleRef,
    fontFaceCss,
    cssFamily,
    textShadowCss,
    fitSlackPx,
    runPreviewRefresh,
    schedulePreviewRefresh,
    attachPreviewResizeObserver,
    detachPreviewResizeObserver,
  };
}
