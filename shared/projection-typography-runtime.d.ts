import type { ProjectionTypographyPrefs } from './projection-typography.js';

export interface ProjectionTypographyController {
  init(initialPrefs: ProjectionTypographyPrefs | null): Promise<void>;
  setPrefs(nextPrefs: ProjectionTypographyPrefs | null): Promise<void>;
  refresh(): Promise<void>;
  scheduleRefresh(): void;
  disconnect(): void;
  getProfileKey(): string;
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
  /** Rótulo no log de diagnóstico de textfill (ex.: `projector`, `operator-preview:Saída 1`). */
  diagnosticSurface?: string;
  onProfileKey?: (profileKey: string) => void;
}

export declare function createProjectionTypographyController(
  options: ProjectionTypographyControllerOptions,
): ProjectionTypographyController;

export declare function profileKeyForPreviewKind(kind: string): string;

export declare function fetchProjectionTypographyPrefs(
  origin?: string,
): Promise<ProjectionTypographyPrefs | null>;

export declare function attachProjectionTypographyWs(
  controller: ProjectionTypographyController,
  onMessage?: (message: { type?: string; projectionTypography?: ProjectionTypographyPrefs }) => void,
): (message: { type?: string; projectionTypography?: ProjectionTypographyPrefs }) => void;
