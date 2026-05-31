export interface FooterAlertOverlayClient {
  kind: 'display' | 'external';
  id: string;
}

export interface FooterAlertOverlayHandle {
  applyValor(valor: string): void;
  stop(): void;
  dispose(): void;
}

export function createFooterAlertOverlay(
  clientTarget: FooterAlertOverlayClient,
): FooterAlertOverlayHandle;

export function decodeFooterAlertValor(valor: string): unknown;
