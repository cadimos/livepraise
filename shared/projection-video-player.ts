/** Volume máximo nos players HTML5 de projeção (Electron / monitor). */
export function configureProjectionVideoPlayer(player: HTMLVideoElement): void {
  player.volume = 1;
}

let audioUnlockListenersBound = false;
const pendingAudioUnlockPlayers = new Set<HTMLVideoElement>();

function ensureProjectionAudioUnlockListeners(): void {
  if (audioUnlockListenersBound) return;
  audioUnlockListenersBound = true;

  const unlock = (): void => {
    for (const player of pendingAudioUnlockPlayers) {
      if (!player.isConnected) continue;
      player.muted = false;
      player.volume = 1;
      void player.play().catch(() => {});
    }
    pendingAudioUnlockPlayers.clear();
  };

  document.addEventListener('pointerdown', unlock, { once: true, capture: true });
  document.addEventListener('keydown', unlock, { once: true, capture: true });
}

/**
 * Inicia vídeo de projeção respeitando a política de autoplay do browser.
 * Sem gesto do utilizador: reproduz mudo; áudio activa no primeiro clique/tecla na página.
 */
export async function playProjectionVideo(player: HTMLVideoElement): Promise<void> {
  configureProjectionVideoPlayer(player);
  player.muted = false;

  try {
    await player.play();
    return;
  } catch (error) {
    if ((error as DOMException)?.name !== 'NotAllowedError') {
      console.warn('[livepraise] reprodução de vídeo falhou:', error);
      return;
    }
  }

  player.muted = true;
  try {
    await player.play();
  } catch (error) {
    console.warn('[livepraise] reprodução muda de vídeo falhou:', error);
    return;
  }

  pendingAudioUnlockPlayers.add(player);
  ensureProjectionAudioUnlockListeners();
}

export function clearProjectionVideoUnlock(player: HTMLVideoElement): void {
  pendingAudioUnlockPlayers.delete(player);
}
