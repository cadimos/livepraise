/** URL do hub WebSocket live (`/ws/live`) a partir do host da página. */
export function wsLiveUrl(
  loc: Pick<Location, 'protocol' | 'host'> = globalThis.location,
  path = '/ws/live',
): string {
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${loc.host}${path}`;
}
