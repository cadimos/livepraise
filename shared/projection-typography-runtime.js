import {
  refreshOutputTextfill,
  refreshOutputTextfillAll,
  refreshPreviewTextfill,
} from './projection-textfill.js';
import { applyProjectionTypographyStyles } from './projection-typography.js';
import { projectionTextShadowSlackPx, resolveProjectionTextShadowCss } from './projection-text-shadow.js';

const DEFAULT_PROFILE = {
  fontSource: 'bundled',
  fontFamily: 'roboto',
  fontWeight: 700,
  fontStyle: 'normal',
  minFontPx: 24,
  maxFontPx: 120,
  textfillEnabled: true,
  textShadowEnabled: true,
  textShadowLayers: [
    { offsetX: 2, offsetY: 2, blur: 0, color: '#000000' },
    { offsetX: 3, offsetY: 3, blur: 0, color: '#000000' },
    { offsetX: 5, offsetY: 5, blur: 0, color: '#000000' },
    { offsetX: 6, offsetY: 6, blur: 0, color: '#000000' },
  ],
};

const PROFILE_BY_ROLE = {
  projector: 'projector',
  'stage-return': 'stageReturn',
  'external-display': null,
  'live-viewer': 'live',
};

const PROFILE_BY_EXTERNAL = {
  live: 'live',
  vocal: 'vocal',
  stage: 'stage',
  player: 'player',
};

let manifestCache = null;

function resolveBundledFontFileName(weight, style) {
  if (weight === 700 && style === 'italic') return 'BoldItalic';
  if (weight === 700) return 'Bold';
  if (style === 'italic') return 'Italic';
  return 'Regular';
}

function bundledFontFileForProfile(files, weight, style) {
  const suffix = resolveBundledFontFileName(weight, style);
  return files.find((file) => file.includes(`-${suffix}.`)) ?? files[0] ?? null;
}

async function loadFontsManifest(origin) {
  if (manifestCache) return manifestCache;
  try {
    const res = await fetch(`${origin}/fonts/manifest.json`, { cache: 'default' });
    if (!res.ok) return null;
    manifestCache = await res.json();
    return manifestCache;
  } catch {
    return null;
  }
}

function resolveCssFamily(profile, manifest) {
  if (profile.fontSource === 'system') {
    return `${profile.fontFamily}, sans-serif`;
  }
  const family = manifest?.families?.find((item) => item.id === profile.fontFamily);
  return family?.cssFamily ?? 'Roboto, sans-serif';
}

function ensureFontFaceStyle(profile, origin, manifest, styleEl) {
  if (profile.fontSource !== 'bundled') {
    if (styleEl.parentNode) styleEl.remove();
    return;
  }
  const family = manifest?.families?.find((item) => item.id === profile.fontFamily);
  if (!family) return;
  const fileName = bundledFontFileForProfile(
    family.files,
    profile.fontWeight,
    profile.fontStyle,
  );
  if (!fileName) return;
  const url = `${origin}/fonts/${encodeURIComponent(family.id)}/${encodeURIComponent(fileName)}`;
  styleEl.textContent = `@font-face{font-family:${family.cssFamily};src:url('${url}') format('woff2');font-weight:${profile.fontWeight};font-style:${profile.fontStyle};font-display:swap;}`;
  if (!styleEl.parentNode) document.head.appendChild(styleEl);
}

function normalizeProfile(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PROFILE };
  return {
    ...DEFAULT_PROFILE,
    ...raw,
    textShadowLayers: Array.isArray(raw.textShadowLayers) && raw.textShadowLayers.length
      ? raw.textShadowLayers
      : DEFAULT_PROFILE.textShadowLayers,
  };
}

function resolveProfileKey(role, externalProfile) {
  if (role === 'external-display' && externalProfile) {
    return PROFILE_BY_EXTERNAL[externalProfile] ?? 'live';
  }
  return PROFILE_BY_ROLE[role] ?? 'projector';
}

function applyShadowTargets(rootEl, profile, shadowSelector) {
  const css = resolveProjectionTextShadowCss(
    profile.textShadowLayers,
    profile.textShadowEnabled,
    profile.textShadowCssAdvanced,
  );
  const targets = rootEl.querySelectorAll(shadowSelector);
  if (!targets.length) {
    const fallback = rootEl.querySelector('.content, .texto');
    if (fallback) fallback.style.textShadow = css;
    return;
  }
  for (const target of targets) {
    target.style.textShadow = css;
  }
}

async function runTextfill(rootEl, profile, mode, textfillOptions, cssFamily, surfaceLabel) {
  const fitSlackPx = projectionTextShadowSlackPx(
    profile.textShadowLayers,
    profile.textShadowEnabled,
  );
  const fontOpts = {
    fontFamily: cssFamily,
    fontWeight: profile.fontWeight,
    fontStyle: profile.fontStyle,
    fitSlackPx,
  };
  if (textfillOptions?.allTexto === true) {
    await refreshOutputTextfillAll(
      rootEl,
      profile.minFontPx,
      profile.maxFontPx,
      profile.textfillEnabled,
      fontOpts,
    );
    return;
  }
  const refreshFn =
    mode === 'preview' ? refreshPreviewTextfill : refreshOutputTextfill;
  await refreshFn(
    rootEl,
    profile.minFontPx,
    profile.maxFontPx,
    profile.textfillEnabled,
    {
      ...fontOpts,
      ...textfillOptions,
      diagnosticSurface: textfillOptions?.diagnosticSurface ?? surfaceLabel ?? mode,
    },
  );
}

/**
 * Controlador partilhado para previews e saídas reais (CAD-313).
 */
export function createProjectionTypographyController(options) {
  const {
    rootEl,
    role,
    externalProfile,
    origin = location.origin,
    mode = 'output',
    shadowSelector = '.titulo, .content > span, .rodape:not(:empty), .content, .texto',
    textfillOptions,
    diagnosticSurface,
    onProfileKey,
  } = options;

  let prefs = options.prefs ?? null;
  let profileKey = resolveProfileKey(role, externalProfile);
  let profile = normalizeProfile(prefs?.[profileKey]);
  let manifest = null;
  const fontStyleEl = document.createElement('style');
  fontStyleEl.dataset.projectionTypography = 'font-face';
  let resizeObserver = null;
  let refreshScheduled = false;
  let refreshGeneration = 0;
  let refreshInProgress = false;
  let resizeDebounce = null;
  let onWindowResize = null;

  function currentProfile() {
    if (!prefs) return profile;
    return normalizeProfile(prefs[profileKey] ?? profile);
  }

  function scheduleRefresh() {
    if (refreshScheduled) return;
    refreshScheduled = true;
    requestAnimationFrame(() => {
      refreshScheduled = false;
      void refresh();
    });
  }

  async function refresh() {
    if (refreshInProgress) return;
    refreshInProgress = true;
    const generation = ++refreshGeneration;
    const hadContent = Boolean(rootEl.querySelector('.content, .texto')?.textContent?.trim());
    if (hadContent) {
      rootEl.style.visibility = 'hidden';
    }
    try {
      profile = currentProfile();
      const cssFamily = resolveCssFamily(profile, manifest);
      const textShadowCss = resolveProjectionTextShadowCss(
        profile.textShadowLayers,
        profile.textShadowEnabled,
        profile.textShadowCssAdvanced,
      );
      applyProjectionTypographyStyles(rootEl, {
        fontFamily: cssFamily,
        fontWeight: profile.fontWeight,
        fontStyle: profile.fontStyle,
        textShadowCss,
      });
      ensureFontFaceStyle(profile, origin, manifest, fontStyleEl);
      applyShadowTargets(rootEl, profile, shadowSelector);
      if (generation !== refreshGeneration) return;
      await runTextfill(
        rootEl,
        profile,
        mode,
        textfillOptions,
        cssFamily,
        diagnosticSurface ?? profileKey,
      );
    } finally {
      if (hadContent) {
        rootEl.style.visibility = '';
      }
      refreshInProgress = false;
    }
  }

  async function setPrefs(nextPrefs) {
    prefs = nextPrefs;
    profileKey = resolveProfileKey(role, externalProfile);
    profile = currentProfile();
    onProfileKey?.(profileKey);
    if (!manifest) manifest = await loadFontsManifest(origin);
    await refresh();
  }

  async function init(initialPrefs) {
    manifest = await loadFontsManifest(origin);
    await setPrefs(initialPrefs);
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (resizeDebounce) clearTimeout(resizeDebounce);
        resizeDebounce = setTimeout(() => {
          scheduleRefresh();
        }, 150);
      });
      resizeObserver.observe(rootEl);
      const stage = document.getElementById('stage');
      if (stage) resizeObserver.observe(stage);
    }
    onWindowResize = () => {
      if (resizeDebounce) clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(() => {
        scheduleRefresh();
      }, 150);
    };
    window.addEventListener('resize', onWindowResize);
  }

  function disconnect() {
    if (resizeDebounce) clearTimeout(resizeDebounce);
    resizeObserver?.disconnect();
    if (onWindowResize) {
      window.removeEventListener('resize', onWindowResize);
      onWindowResize = null;
    }
    fontStyleEl.remove();
  }

  return {
    init,
    setPrefs,
    refresh,
    scheduleRefresh,
    disconnect,
    getProfileKey: () => profileKey,
  };
}

export function profileKeyForPreviewKind(kind) {
  switch (kind) {
    case 'projection':
      return 'projector';
    case 'stage-return':
      return 'stageReturn';
    case 'live':
      return 'live';
    case 'vocal':
      return 'vocal';
    case 'stage':
      return 'stage';
    case 'player':
      return 'player';
    default:
      return 'projector';
  }
}

export async function fetchProjectionTypographyPrefs(origin = location.origin) {
  const res = await fetch(`${origin}/api/projection-typography`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.projectionTypography ?? null;
}

export function attachProjectionTypographyWs(controller, onMessage) {
  const previous = onMessage;
  return (message) => {
    if (message?.type === 'projection-typography-sync' && message.projectionTypography) {
      void controller.setPrefs(message.projectionTypography);
    }
    previous?.(message);
  };
}
