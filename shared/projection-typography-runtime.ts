import {
  refreshOutputTextfill,
  refreshOutputTextfillAll,
  refreshPreviewTextfill,
} from './projection-textfill.js';
import {
  applyProjectionTypographyStyles,
  DEFAULT_PROJECTION_TYPOGRAPHY_PROFILE,
  type ProjectionTypographyPrefs,
  type ProjectionTypographyProfile,
  type ProjectionTypographyProfileKey,
} from './projection-typography.js';
import { projectionTextShadowSlackPx, resolveProjectionTextShadowCss } from './projection-text-shadow.js';

interface FontsManifestFamily {
  id: string;
  cssFamily: string;
  files: string[];
}

interface FontsManifest {
  families?: FontsManifestFamily[];
}

const DEFAULT_PROFILE: ProjectionTypographyProfile = {
  ...DEFAULT_PROJECTION_TYPOGRAPHY_PROFILE,
  textShadowLayers: DEFAULT_PROJECTION_TYPOGRAPHY_PROFILE.textShadowLayers.map(
    (layer) => ({ ...layer }),
  ),
};

const PROFILE_BY_ROLE: Record<string, ProjectionTypographyProfileKey | null> = {
  projector: 'projector',
  'stage-return': 'stageReturn',
  'external-display': null,
  'live-viewer': 'live',
};

const PROFILE_BY_EXTERNAL: Record<string, ProjectionTypographyProfileKey> = {
  live: 'live',
  vocal: 'vocal',
  stage: 'stage',
  player: 'player',
};

let manifestCache: FontsManifest | null = null;

function resolveBundledFontFileName(weight: number, style: string): string {
  if (weight === 700 && style === 'italic') return 'BoldItalic';
  if (weight === 700) return 'Bold';
  if (style === 'italic') return 'Italic';
  return 'Regular';
}

function bundledFontFileForProfile(
  files: string[],
  weight: number,
  style: string,
): string | null {
  const suffix = resolveBundledFontFileName(weight, style);
  return files.find((file) => file.includes(`-${suffix}.`)) ?? files[0] ?? null;
}

async function loadFontsManifest(origin: string): Promise<FontsManifest | null> {
  if (manifestCache) return manifestCache;
  try {
    const res = await fetch(`${origin}/fonts/manifest.json`, { cache: 'default' });
    if (!res.ok) return null;
    manifestCache = (await res.json()) as FontsManifest;
    return manifestCache;
  } catch {
    return null;
  }
}

function resolveCssFamily(
  profile: ProjectionTypographyProfile,
  manifest: FontsManifest | null,
): string {
  if (profile.fontSource === 'system') {
    return `${profile.fontFamily}, sans-serif`;
  }
  const family = manifest?.families?.find((item) => item.id === profile.fontFamily);
  return family?.cssFamily ?? 'Roboto, sans-serif';
}

function ensureFontFaceStyle(
  profile: ProjectionTypographyProfile,
  origin: string,
  manifest: FontsManifest | null,
  styleEl: HTMLStyleElement,
): void {
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

function normalizeProfile(raw: unknown): ProjectionTypographyProfile {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_PROFILE,
      textShadowLayers: DEFAULT_PROFILE.textShadowLayers.map((layer) => ({ ...layer })),
    };
  }
  const record = raw as Partial<ProjectionTypographyProfile>;
  return {
    ...DEFAULT_PROFILE,
    ...record,
    textShadowLayers:
      Array.isArray(record.textShadowLayers) && record.textShadowLayers.length
        ? record.textShadowLayers
        : DEFAULT_PROFILE.textShadowLayers.map((layer) => ({ ...layer })),
  };
}

function resolveProfileKey(
  role: string,
  externalProfile?: string,
): ProjectionTypographyProfileKey {
  if (role === 'external-display' && externalProfile) {
    return PROFILE_BY_EXTERNAL[externalProfile] ?? 'live';
  }
  return PROFILE_BY_ROLE[role] ?? 'projector';
}

function applyShadowTargets(
  rootEl: HTMLElement,
  profile: ProjectionTypographyProfile,
  shadowSelector: string,
): void {
  const css = resolveProjectionTextShadowCss(
    profile.textShadowLayers,
    profile.textShadowEnabled,
    profile.textShadowCssAdvanced,
  );
  const targets = rootEl.querySelectorAll<HTMLElement>(shadowSelector);
  if (!targets.length) {
    const fallback = rootEl.querySelector<HTMLElement>('.content, .texto');
    if (fallback) fallback.style.textShadow = css;
    return;
  }
  for (const target of Array.from(targets)) {
    target.style.textShadow = css;
  }
}

async function runTextfill(
  rootEl: HTMLElement,
  profile: ProjectionTypographyProfile,
  mode: 'preview' | 'output',
  textfillOptions: Record<string, unknown> | undefined,
  cssFamily: string,
  surfaceLabel: string,
): Promise<void> {
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
  const refreshFn = mode === 'preview' ? refreshPreviewTextfill : refreshOutputTextfill;
  await refreshFn(rootEl, profile.minFontPx, profile.maxFontPx, profile.textfillEnabled, {
    ...fontOpts,
    ...textfillOptions,
    diagnosticSurface: (textfillOptions?.diagnosticSurface as string | undefined) ?? surfaceLabel ?? mode,
  });
}

export interface ProjectionTypographyController {
  init(initialPrefs: ProjectionTypographyPrefs | null): Promise<void>;
  setPrefs(nextPrefs: ProjectionTypographyPrefs | null): Promise<void>;
  refresh(): Promise<void>;
  scheduleRefresh(): void;
  disconnect(): void;
  getProfileKey(): ProjectionTypographyProfileKey;
}

export interface ProjectionTypographyControllerOptions {
  rootEl: HTMLElement;
  role: string;
  externalProfile?: string;
  origin?: string;
  mode?: 'preview' | 'output';
  prefs?: ProjectionTypographyPrefs | null;
  shadowSelector?: string;
  textfillOptions?: Record<string, unknown>;
  diagnosticSurface?: string;
  onProfileKey?: (profileKey: ProjectionTypographyProfileKey) => void;
}

/** Controlador partilhado para previews e saídas reais (CAD-313). */
export function createProjectionTypographyController(
  options: ProjectionTypographyControllerOptions,
): ProjectionTypographyController {
  const {
    rootEl,
    role,
    externalProfile,
    origin = location.origin,
    mode = 'output',
    shadowSelector = '.titulo, .content > span, .rodape:not(:empty), .texto',
    textfillOptions,
    diagnosticSurface,
    onProfileKey,
  } = options;

  let prefs = options.prefs ?? null;
  let profileKey = resolveProfileKey(role, externalProfile);
  let profile = normalizeProfile(prefs?.[profileKey]);
  let manifest: FontsManifest | null = null;
  const fontStyleEl = document.createElement('style');
  fontStyleEl.dataset.projectionTypography = 'font-face';
  let resizeObserver: ResizeObserver | null = null;
  let refreshScheduled = false;
  let refreshGeneration = 0;
  let refreshInProgress = false;
  let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
  let onWindowResize: (() => void) | null = null;

  function currentProfile(): ProjectionTypographyProfile {
    if (!prefs) return profile;
    return normalizeProfile(prefs[profileKey] ?? profile);
  }

  function scheduleRefresh(): void {
    if (refreshScheduled) return;
    refreshScheduled = true;
    requestAnimationFrame(() => {
      refreshScheduled = false;
      void refresh();
    });
  }

  async function refresh(): Promise<void> {
    if (refreshInProgress) return;
    refreshInProgress = true;
    const generation = ++refreshGeneration;
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
      refreshInProgress = false;
    }
  }

  async function setPrefs(nextPrefs: ProjectionTypographyPrefs | null): Promise<void> {
    prefs = nextPrefs;
    profileKey = resolveProfileKey(role, externalProfile);
    profile = currentProfile();
    onProfileKey?.(profileKey);
    if (!manifest) manifest = await loadFontsManifest(origin);
    await refresh();
  }

  async function init(initialPrefs: ProjectionTypographyPrefs | null): Promise<void> {
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

  function disconnect(): void {
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

export function profileKeyForPreviewKind(kind: string): ProjectionTypographyProfileKey {
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

export async function fetchProjectionTypographyPrefs(
  origin: string = location.origin,
): Promise<ProjectionTypographyPrefs | null> {
  const res = await fetch(`${origin}/api/projection-typography`);
  if (!res.ok) return null;
  const data = (await res.json()) as { projectionTypography?: ProjectionTypographyPrefs };
  return data?.projectionTypography ?? null;
}

export function attachProjectionTypographyWs(
  controller: ProjectionTypographyController,
  onMessage?: (message: { type?: string; projectionTypography?: ProjectionTypographyPrefs }) => void,
): (message: { type?: string; projectionTypography?: ProjectionTypographyPrefs }) => void {
  const previous = onMessage;
  return (message) => {
    if (message?.type === 'projection-typography-sync' && message.projectionTypography) {
      void controller.setPrefs(message.projectionTypography);
    }
    previous?.(message);
  };
}
