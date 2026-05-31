import type { LiveActionName } from '@shared/types/live';
import { toProjectionMediaValor } from './projection';
import { isVideoMediaUrl } from './projection-mode';

export type SendLiveAction = (acao: LiveActionName, valor: string) => boolean;

/** Paridade `backgroundRapido`: fundo rápido substitui a tela inteira. */
export function projectQuickBackground(sendAction: SendLiveAction, url: string): void {
  if (isVideoMediaUrl(url)) {
    sendAction('video', toProjectionMediaValor(url));
  } else {
    sendAction('background', toProjectionMediaValor(url));
  }
  window.setTimeout(() => sendAction('removeConteudo', ''), 200);
}

/** Paridade `background()`: aba Imagens — só troca fundo, mantém texto. */
export function projectTabImageBackground(sendAction: SendLiveAction, url: string): void {
  sendAction('background', toProjectionMediaValor(url));
}

/** Paridade `viewVideo()`: aba Vídeos — vídeo de fundo, mantém texto. */
export function projectTabVideoBackground(sendAction: SendLiveAction, url: string): void {
  sendAction('video', toProjectionMediaValor(url));
}

/** CAD-194: embed YouTube quando o ficheiro local não está disponível. */
export function projectTabYoutubeBackground(
  sendAction: SendLiveAction,
  videoId: string,
): void {
  sendAction('youtube', videoId);
}
