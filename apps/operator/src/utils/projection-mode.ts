/** Fundo rápido pode ser vídeo — substitui a tela inteira (paridade backgroundRapido). */
export function isVideoMediaUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url);
}
