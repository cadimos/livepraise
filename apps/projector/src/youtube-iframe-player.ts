import { youtubePlayerVars, type YoutubeEmbedOptions } from '/shared/youtube.js';

interface YtPlayerEvent {
  target: YtPlayer;
}

interface YtPlayer {
  playVideo(): void;
  stopVideo(): void;
  pauseVideo(): void;
  unMute(): void;
  setVolume(volume: number): void;
  loadVideoById(videoId: string): void;
  destroy(): void;
}

interface YtStatic {
  Player: new (
    elementId: string,
    config: {
      videoId?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: YtPlayerEvent) => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YtPlayer;
}

declare global {
  interface Window {
    YT?: YtStatic;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiReady: Promise<void> | null = null;
let player: YtPlayer | null = null;
let currentVideoId = '';
let usedMinimalEmbed = false;

function loadYoutubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!apiReady) {
    apiReady = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      if (!document.querySelector('script[data-livepraise-yt-api]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.dataset.livepraiseYtApi = '1';
        document.head.appendChild(tag);
      }
    });
  }
  return apiReady;
}

function prepareAudio(playerInstance: YtPlayer): void {
  playerInstance.unMute();
  playerInstance.setVolume(100);
}

function embedOptions(minimal = false): YoutubeEmbedOptions & { minimal?: boolean } {
  return {
    origin: location.origin,
    widgetReferrer: location.href,
    minimal,
  };
}

function resetPlayerHost(): void {
  const host = document.getElementById('youtube-player');
  if (host) host.innerHTML = '';
}

function destroyPlayer(): void {
  if (!player) return;
  player.stopVideo();
  player.destroy();
  player = null;
  resetPlayerHost();
}

function createPlayer(videoId: string, minimal: boolean): Promise<YtPlayer> {
  return new Promise((resolve, reject) => {
    player = new window.YT!.Player('youtube-player', {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: youtubePlayerVars(videoId, embedOptions(minimal)),
      events: {
        onReady: (event) => {
          prepareAudio(event.target);
          event.target.playVideo();
          resolve(event.target);
        },
        onError: (event) => {
          if (!usedMinimalEmbed && !minimal) {
            usedMinimalEmbed = true;
            destroyPlayer();
            void createPlayer(videoId, true).then(resolve).catch(reject);
            return;
          }
          reject(new Error(`youtube-player-error-${event.data}`));
        },
      },
    });
  });
}

function ensurePlayer(videoId: string): Promise<YtPlayer> {
  return loadYoutubeIframeApi().then(async () => {
    if (player && currentVideoId === videoId) {
      player.loadVideoById(videoId);
      prepareAudio(player);
      player.playVideo();
      return player;
    }

    if (player) {
      destroyPlayer();
    }

    currentVideoId = videoId;
    usedMinimalEmbed = false;
    return createPlayer(videoId, false);
  });
}

export async function playYoutubeProjection(videoId: string): Promise<void> {
  try {
    await ensurePlayer(videoId);
  } catch (err) {
    console.error('[livepraise] YouTube embed indisponível:', err);
  }
}

export function stopYoutubeProjection(): void {
  currentVideoId = '';
  usedMinimalEmbed = false;
  destroyPlayer();
}
