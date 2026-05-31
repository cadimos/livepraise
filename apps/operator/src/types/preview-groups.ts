import type { ClientRole, ExternalDisplayProfile } from '@shared/types/live';

/** Grupo de prévia alinhado a CA-6 / escopo CAD-221. */
export type PreviewGroupKind =
  | 'projection'
  | 'stage-return'
  | 'live'
  | 'vocal'
  | 'stage'
  | 'player';

export interface PreviewGroupDescriptor {
  /** Estável para keys Vue e mapa de estado (CTO). */
  id: string;
  kind: PreviewGroupKind;
  /** Chave i18n em `preview.groups.*`. */
  labelKey: string;
  order: number;
  /** Papel WS para filtragem (`shouldDeliver`). */
  deliveryRole: ClientRole;
  deliveryProfile?: ExternalDisplayProfile;
}

/** Ordem fixa de perfis externos (CA-6). */
export const EXTERNAL_PREVIEW_PROFILE_ORDER = ['live', 'vocal', 'stage', 'player'] as const;
