/** Presets de tamanho da tela de projeção por monitor. */

import type { DisplayScreenSize } from '@shared/types/live';
import {
  buildAjustarTelaPayload,
  buildAjustarTelaPayloadForDevice,
  buildAjustarTelaValor,
  defaultScreenLayoutFields,
  describeScreenLayoutSize,
  isRatioPreset,
  parseAjustarTelaPayload,
  parseCustomScreenPixels,
  resolvePreviewAspectRatio,
  resolveProjectionStageSize,
  fitAspectRatioInBox,
  SCREEN_CONTENT_FITS,
} from '@shared/screen-layout';

export const SCREEN_SIZE_PRESETS = [
  '16:9',
  '4:3',
  '7:3',
  '5:3',
  '13:7',
  'personalizado',
  'padrao',
] as const;

export type ScreenSizePreset = (typeof SCREEN_SIZE_PRESETS)[number];

export const SCREEN_POSITIONS = ['centro', 'topo', 'personalizado'] as const;
export type ScreenPosition = (typeof SCREEN_POSITIONS)[number];

export { SCREEN_CONTENT_FITS };
export type ScreenContentFit = (typeof SCREEN_CONTENT_FITS)[number];

export interface TelaConfigRow {
  id?: number;
  tipo: string;
  largura: number | string;
  altura: number | string;
}

export { isRatioPreset, buildAjustarTelaValor, parseAjustarTelaPayload, buildAjustarTelaPayload, buildAjustarTelaPayloadForDevice, describeScreenLayoutSize, parseCustomScreenPixels, resolveProjectionStageSize, resolvePreviewAspectRatio, fitAspectRatioInBox };

export function defaultScreenSize(): DisplayScreenSize {
  return { preset: 'padrao', largura: '', altura: '', ...defaultScreenLayoutFields() };
}

/** @deprecated Use {@link buildAjustarTelaPayload}. */
export function encodeAjustarTelaForDisplay(displayId: number, valor: string): string {
  return `${displayId}|${valor}`;
}

export function parseTelaRow(row: TelaConfigRow | undefined): DisplayScreenSize {
  if (!row) {
    return defaultScreenSize();
  }

  const tipo = String(row.tipo ?? 'padrao');
  const lg = String(row.largura ?? '');
  const at = String(row.altura ?? '');

  if (tipo === 'personalizado' || (!isRatioPreset(tipo) && tipo !== 'padrao')) {
    const w = tipo === 'personalizado' ? lg : tipo;
    const h = at;
    return { preset: 'personalizado', largura: w, altura: h, ...defaultScreenLayoutFields() };
  }

  if (isRatioPreset(tipo) || tipo === 'padrao') {
    return {
      preset: tipo,
      largura: lg === '0' ? '' : lg,
      altura: at === '0' ? '' : at,
      ...defaultScreenLayoutFields(),
    };
  }

  return defaultScreenSize();
}
