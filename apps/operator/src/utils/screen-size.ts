/** Presets de tamanho da tela de projeção (paridade v0.0.8 `conf_tela`). */

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

export interface TelaConfigRow {
  id?: number;
  tipo: string;
  largura: number | string;
  altura: number | string;
}

export function isRatioPreset(tipo: string): boolean {
  return ['16:9', '4:3', '7:3', '5:3', '13:7'].includes(tipo);
}

export function defaultScreenSize(): { preset: string; largura: string; altura: string } {
  return { preset: 'padrao', largura: '', altura: '' };
}

/** `displayId|valor` — só o projetor com esse id aplica; sem prefixo = todos. */
export function encodeAjustarTelaForDisplay(displayId: number, valor: string): string {
  return `${displayId}|${valor}`;
}

export function parseAjustarTelaPayload(valor: string): {
  displayId: number | null;
  size: string;
} {
  const pipe = valor.indexOf('|');
  if (pipe < 0) {
    return { displayId: null, size: valor };
  }
  const idPart = valor.slice(0, pipe);
  const size = valor.slice(pipe + 1);
  const displayId = Number.parseInt(idPart, 10);
  return {
    displayId: Number.isFinite(displayId) ? displayId : null,
    size,
  };
}

export function buildAjustarTelaValor(preset: string, largura: string, altura: string): string {
  if (preset === 'personalizado') {
    const w = largura.trim() || '0';
    const h = altura.trim() || '0';
    return `${w}x${h}`;
  }
  return preset;
}

export function parseTelaRow(row: TelaConfigRow | undefined): {
  preset: string;
  largura: string;
  altura: string;
} {
  if (!row) {
    return { preset: 'padrao', largura: '', altura: '' };
  }

  const tipo = String(row.tipo ?? 'padrao');
  const lg = String(row.largura ?? '');
  const at = String(row.altura ?? '');

  if (tipo === 'personalizado' || (!isRatioPreset(tipo) && tipo !== 'padrao')) {
    const w = tipo === 'personalizado' ? lg : tipo;
    const h = at;
    return { preset: 'personalizado', largura: w, altura: h };
  }

  if (isRatioPreset(tipo) || tipo === 'padrao') {
    return { preset: tipo, largura: lg === '0' ? '' : lg, altura: at === '0' ? '' : at };
  }

  return { preset: 'padrao', largura: '', altura: '' };
}
