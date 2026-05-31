/** Endereços loopback estritos — sem sufixo (B2). */
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function isLoopbackAddress(ip: string): boolean {
  return LOOPBACK.has(ip);
}

/** Is = operador local Electron; usa socket, não req.ip (anti-spoof X-Forwarded-For). */
export function isLocalSocket(req: { socket: { remoteAddress?: string | null } }): boolean {
  const socketIp = req.socket.remoteAddress ?? '';
  return isLoopbackAddress(socketIp);
}
