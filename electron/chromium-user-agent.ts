import type { WebContents } from 'electron';

/**
 * YouTube (e outros embeds) recusam playback em iframe quando o UA expõe "Electron/…".
 * Mantém o restante do UA Chromium para paridade com o browser em loopback.
 */
export function applyChromiumUserAgent(webContents: WebContents): void {
  const ua = webContents.getUserAgent();
  const sanitized = ua.replace(/\s*Electron\/\S+/g, '').replace(/\s+/g, ' ').trim();
  if (sanitized && sanitized !== ua) {
    webContents.setUserAgent(sanitized);
  }
}
