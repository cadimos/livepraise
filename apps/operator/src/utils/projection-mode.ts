/** Fundo rápido pode ser vídeo — substitui a tela inteira (paridade backgroundRapido). */
export function isVideoMediaUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url);
}

export function isQuickBackgroundVideo(item: {
  url: string;
  diretorio?: string;
}): boolean {
  if (item.diretorio === 'videos') return true;
  return isVideoMediaUrl(item.url);
}

export { videoThumbRelativePath } from '@shared/queue-items';
