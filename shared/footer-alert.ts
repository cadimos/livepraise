/** Estado da acção `footerAlert` — texto rolante no rodapé (CAD-188). */

export const FOOTER_ALERT_VERSION = 1 as const;

export type FooterAlertTargetKind = 'display' | 'external';

export interface FooterAlertTarget {
  kind: FooterAlertTargetKind;
  id: string;
}

export interface FooterAlertState {
  version: typeof FOOTER_ALERT_VERSION;
  /** `false` interrompe qualquer marquee em curso nos clientes. */
  active: boolean;
  text: string;
  repeatCount: number;
  textColor: string;
  backgroundColor: string;
  /** Duração de uma passagem completa do texto (segundos). */
  scrollDurationSec: number;
  /** Vazio = todos os monitores que recebem overlay. */
  targets: FooterAlertTarget[];
}

export const FOOTER_ALERT_DEFAULTS = {
  repeatCount: 3,
  textColor: '#ffffff',
  backgroundColor: '#000000',
  scrollDurationSec: 15,
} as const;

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidFooterAlertColor(value: string): boolean {
  return HEX_COLOR.test(value.trim());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseTarget(raw: unknown): FooterAlertTarget | null {
  if (!isRecord(raw)) return null;
  const kind = raw.kind;
  const id = raw.id;
  if (kind !== 'display' && kind !== 'external') return null;
  if (typeof id !== 'string' || !id.trim()) return null;
  return { kind, id: id.trim() };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return isValidFooterAlertColor(trimmed) ? trimmed.toLowerCase() : fallback;
}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

/** Valida e normaliza payload JSON da acção `footerAlert`. */
export function parseFooterAlertState(raw: unknown): FooterAlertState | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== FOOTER_ALERT_VERSION) return null;

  const targets: FooterAlertTarget[] = [];
  if (Array.isArray(raw.targets)) {
    for (const item of raw.targets) {
      const target = parseTarget(item);
      if (target) targets.push(target);
    }
  }

  return {
    version: FOOTER_ALERT_VERSION,
    active: Boolean(raw.active),
    text: normalizeText(raw.text),
    repeatCount: clampInt(
      raw.repeatCount,
      1,
      20,
      FOOTER_ALERT_DEFAULTS.repeatCount,
    ),
    textColor: normalizeColor(raw.textColor, FOOTER_ALERT_DEFAULTS.textColor),
    backgroundColor: normalizeColor(
      raw.backgroundColor,
      FOOTER_ALERT_DEFAULTS.backgroundColor,
    ),
    scrollDurationSec: clampInt(
      raw.scrollDurationSec,
      1,
      120,
      FOOTER_ALERT_DEFAULTS.scrollDurationSec,
    ),
    targets: targets.slice(0, 32),
  };
}

export function encodeFooterAlertState(state: FooterAlertState): string {
  return JSON.stringify(state);
}

export function decodeFooterAlertValor(valor: string): FooterAlertState | null {
  if (!valor.trim()) return null;
  try {
    return parseFooterAlertState(JSON.parse(valor));
  } catch {
    return null;
  }
}

export function defaultFooterAlertDraft(): FooterAlertState {
  return {
    version: FOOTER_ALERT_VERSION,
    active: false,
    text: '',
    repeatCount: FOOTER_ALERT_DEFAULTS.repeatCount,
    textColor: FOOTER_ALERT_DEFAULTS.textColor,
    backgroundColor: FOOTER_ALERT_DEFAULTS.backgroundColor,
    scrollDurationSec: FOOTER_ALERT_DEFAULTS.scrollDurationSec,
    targets: [],
  };
}

export function clientReceivesFooterAlert(
  state: FooterAlertState,
  kind: FooterAlertTargetKind,
  id: string,
): boolean {
  if (!state.active || !state.text.trim()) return false;
  if (!state.targets.length) return true;
  const key = id.trim();
  return state.targets.some((t) => t.kind === kind && t.id === key);
}
