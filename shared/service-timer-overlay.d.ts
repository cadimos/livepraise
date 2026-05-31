export interface ServiceTimerOverlayClient {
  kind: 'display' | 'external';
  id: string;
}

export interface ServiceTimerOverlayHandle {
  applyValor(valor: string): void;
  dispose(): void;
}

export function createServiceTimerOverlay(
  clientTarget: ServiceTimerOverlayClient,
): ServiceTimerOverlayHandle;

export function decodeServiceTimerValor(valor: string): unknown;
