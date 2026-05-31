export type ScreenPosition = 'centro' | 'topo' | 'personalizado';

export type ScreenContentFit = 'estender' | 'centralizar' | 'proporcional';

export const SCREEN_POSITIONS: readonly ScreenPosition[];

export const SCREEN_CONTENT_FITS: readonly ScreenContentFit[];

export interface ScreenLayoutFields {
  livePreview?: boolean;
  position?: ScreenPosition;
  offsetX?: string;
  offsetY?: string;
  contentFit?: ScreenContentFit;
}

export function isRatioPreset(tipo: string): boolean;
export function normalizeContentFit(value: string): ScreenContentFit;
export function defaultScreenLayoutFields(): Required<ScreenLayoutFields>;
export function buildAjustarTelaValor(
  preset: string,
  largura: string,
  altura: string,
): string;
export function parseAjustarTelaPayload(valor: string): {
  displayId: number | null;
  deviceId: string | null;
  size: string;
  position: string;
  offsetX: number;
  offsetY: number;
  contentFit: ScreenContentFit;
};
export function buildAjustarTelaPayload(
  displayId: number,
  screen: {
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
  screen: {
    preset: string;
    largura: string;
    altura: string;
    position?: string;
    offsetX?: string;
    offsetY?: string;
    contentFit?: string;
  },
): string;
