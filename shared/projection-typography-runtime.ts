/**
 * Tipografia de projeção (fonte, sombra, prefs, WS) — NÃO é o algoritmo textfill.
 * O fit vive só em `projection-textfill.ts` (`createProjectionTextfill` / refresh*).
 */
import {
  createProjectionTextfill,
  type ProjectionTextfillHandle,
  type ProjectionTextfillResolveParams,
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

export interface ProjectionTypographySession {
  setPrefs(nextPrefs: ProjectionTypographyPrefs | null): Promise<void>;
  init(initialPrefs: ProjectionTypographyPrefs | null): Promise<void>;
  applyChrome(): void;
  resolveTextfillParams(): ProjectionTextfillResolveParams;
  disconnect(): void;
  getProfileKey(): ProjectionTypographyProfileKey;
  getCssFamily(): string;
}

export interface ProjectionTypographySessionOptions {
  rootEl: HTMLElement;
  role: string;
  externalProfile?: string;
  origin?: string;
  shadowSelector?: string;
  textfillOptions?: Record<string, unknown>;
  diagnosticSurface?: string;
  onProfileKey?: (profileKey: ProjectionTypographyProfileKey) => void;
}

/** Sessão só de tipografia (fonte/sombra/prefs) — o fit é `createProjectionTextfill`. */
export function createProjectionTypographySession(
  options: ProjectionTypographySessionOptions,
): ProjectionTypographySession {
  const {
    rootEl,
    role,
    externalProfile,
    origin = location.origin,
    shadowSelector = '.titulo, .content > span, .rodape:not(:empty), .texto',
    textfillOptions,
    diagnosticSurface,
    onProfileKey,
  } = options;

  let prefs = null as ProjectionTypographyPrefs | null;
  let profileKey = resolveProfileKey(role, externalProfile);
  let profile = normalizeProfile(null);
  let manifest: FontsManifest | null = null;
  let cssFamily = 'sans-serif';
  const fontStyleEl = document.createElement('style');
  fontStyleEl.dataset.projectionTypography = 'font-face';

  function currentProfile(): ProjectionTypographyProfile {
    if (!prefs) return profile;
    return normalizeProfile(prefs[profileKey] ?? profile);
  }

  function applyChrome(): void {
    profile = currentProfile();
    cssFamily = resolveCssFamily(profile, manifest);
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
  }

  function resolveTextfillParams(): ProjectionTextfillResolveParams {
    profile = currentProfile();
    cssFamily = resolveCssFamily(profile, manifest);
    const fitSlackPx = projectionTextShadowSlackPx(
      profile.textShadowLayers,
      profile.textShadowEnabled,
    );
    const extra = (textfillOptions ?? {}) as Record<string, unknown>;
    return {
      ...extra,
      minFontPx: profile.minFontPx,
      maxFontPx: profile.maxFontPx,
      textfillEnabled: profile.textfillEnabled,
      allTexto: extra.allTexto === true,
      fontFamily: cssFamily,
      fontWeight: profile.fontWeight,
      fontStyle: profile.fontStyle,
      fitSlackPx,
      diagnosticSurface:
        (extra.diagnosticSurface as string | undefined) ??
        diagnosticSurface ??
        profileKey,
    };
  }

  async function setPrefs(nextPrefs: ProjectionTypographyPrefs | null): Promise<void> {
    prefs = nextPrefs;
    profileKey = resolveProfileKey(role, externalProfile);
    profile = currentProfile();
    onProfileKey?.(profileKey);
    if (!manifest) manifest = await loadFontsManifest(origin);
    applyChrome();
  }

  async function init(initialPrefs: ProjectionTypographyPrefs | null): Promise<void> {
    manifest = await loadFontsManifest(origin);
    await setPrefs(initialPrefs);
  }

  function disconnect(): void {
    fontStyleEl.remove();
  }

  return {
    setPrefs,
    init,
    applyChrome,
    resolveTextfillParams,
    disconnect,
    getProfileKey: () => profileKey,
    getCssFamily: () => cssFamily,
  };
}

export interface ProjectionTypographyController {
  init(initialPrefs: ProjectionTypographyPrefs | null): Promise<void>;
  setPrefs(nextPrefs: ProjectionTypographyPrefs | null): Promise<void>;
  refresh(): Promise<void>;
  scheduleRefresh(): void;
  disconnect(): void;
  getProfileKey(): ProjectionTypographyProfileKey;
  /** Handle do motor textfill (para superfícies que preferem chamar o fit directo). */
  textfill: ProjectionTextfillHandle;
  typography: ProjectionTypographySession;
}

export interface ProjectionTypographyControllerOptions extends ProjectionTypographySessionOptions {
  mode?: 'preview' | 'output';
  prefs?: ProjectionTypographyPrefs | null;
}

/**
 * Conveniência: tipografia + `createProjectionTextfill` no mesmo objecto.
 * Preferir nas superfícies: importar `createProjectionTextfill` + `createProjectionTypographySession`.
 */
export function createProjectionTypographyController(
  options: ProjectionTypographyControllerOptions,
): ProjectionTypographyController {
  const { mode = 'output', prefs: initialPrefs, ...sessionOpts } = options;
  const typography = createProjectionTypographySession(sessionOpts);
  const textfill = createProjectionTextfill({
    rootEl: sessionOpts.rootEl,
    mode,
    resolve: () => typography.resolveTextfillParams(),
    beforeRefresh: () => typography.applyChrome(),
  });

  async function setPrefs(nextPrefs: ProjectionTypographyPrefs | null): Promise<void> {
    await typography.setPrefs(nextPrefs);
    await textfill.refresh();
  }

  async function init(prefs: ProjectionTypographyPrefs | null): Promise<void> {
    await typography.init(prefs ?? initialPrefs ?? null);
    const stage = document.getElementById('stage');
    textfill.attach([stage]);
    await textfill.refresh();
  }

  return {
    init,
    setPrefs,
    refresh: () => textfill.refresh(),
    scheduleRefresh: () => textfill.scheduleRefresh(),
    disconnect: () => {
      textfill.disconnect();
      typography.disconnect();
    },
    getProfileKey: () => typography.getProfileKey(),
    textfill,
    typography,
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
  controller: { setPrefs: (prefs: ProjectionTypographyPrefs | null) => Promise<void> },
  onMessage?: (message: {
    type?: string;
    projectionTypography?: ProjectionTypographyPrefs;
  }) => void,
): (message: { type?: string; projectionTypography?: ProjectionTypographyPrefs }) => void {
  const previous = onMessage;
  return (message) => {
    if (message?.type === 'projection-typography-sync' && message.projectionTypography) {
      void controller.setPrefs(message.projectionTypography);
    }
    previous?.(message);
  };
}
