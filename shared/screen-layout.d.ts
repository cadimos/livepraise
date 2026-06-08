export type ScreenPosition = 'centro' | 'topo' | 'personalizado';

export type ScreenContentFit = 'estender' | 'centralizar' | 'proporcional';

export interface ScreenLayoutFields {
  livePreview?: boolean;
  position?: ScreenPosition;
  offsetX?: string;
  offsetY?: string;
  contentFit?: ScreenContentFit;
}

export const SCREEN_POSITIONS: readonly ScreenPosition[];

export const SCREEN_CONTENT_FITS: readonly ScreenContentFit[];

export function isRatioPreset(tipo: string): boolean;

export function normalizeContentFit(value: string): ScreenContentFit;

export function defaultScreenLayoutFields(): Required<ScreenLayoutFields>;

export function buildAjustarTelaValor(
  preset: string,
  largura: string,
  altura: string,
): string;

export function parseCustomScreenPixels(
  largura: string,
  altura: string,
): { w: number; h: number } | null;

export function describeScreenLayoutSize(
  preset: string,
  largura: string,
  altura: string,
): string;

export function fitAspectRatioInBox(
  numW: number,
  numH: number,
  boxW: number,
  boxH: number,
): { w: number; h: number };

export interface ProjectionStageSize {
  width: number;
  height: number;
  fullScreen: boolean;
}

export function resolveProjectionStageSize(
  valor: string,
  viewportW: number,
  viewportH: number,
): ProjectionStageSize;

export interface AjustarTelaPayload {
  displayId: number | null;
  deviceId: string | null;
  size: string;
  position: string;
  offsetX: number;
  offsetY: number;
  contentFit: ScreenContentFit;
}

export function parseAjustarTelaPayload(valor: string): AjustarTelaPayload;

export function buildAjustarTelaPayload(
  displayId: number,
  screen: ScreenLayoutFields & {
    preset: string;
    largura: string;
    altura: string;
    position?: string;
    offsetX?: string;
    offsetY?: string;
    contentFit?: string;
  },
): string;

export function buildAjustarTelaPayloadForDevice(
  deviceId: string,
  screen: ScreenLayoutFields & {
    preset: string;
    largura: string;
    altura: string;
    position?: string;
    offsetX?: string;
    offsetY?: string;
    contentFit?: string;
  },
): string;

export function matchesAjustarTelaTarget(
  parsed: AjustarTelaPayload,
  localDisplayId: number | null,
  localDeviceId: string | null,
): boolean;
