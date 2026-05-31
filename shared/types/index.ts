/** Tipos e constantes partilhados entre electron, server e apps. */
export type AppPhase =
  | 'fase-1-fundacao'
  | 'fase-2-servidor'
  | 'fase-3-websocket';

export interface LivepraiseBridge {
  version: string;
  phase: AppPhase;
}

export * from './live.js';
