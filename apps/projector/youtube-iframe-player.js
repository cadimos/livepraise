import { youtubePlayerVars } from '/shared/youtube.js';
let apiReady = null;
let player = null;
let currentVideoId = '';
let usedMinimalEmbed = false;
function loadYoutubeIframeApi() {
    if (window.YT?.Player)
        return Promise.resolve();
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
function prepareAudio(playerInstance) {
    playerInstance.unMute();
    playerInstance.setVolume(100);
}
function embedOptions(minimal = false) {
    return {
        origin: location.origin,
        widgetReferrer: location.href,
        minimal,
    };
}
function resetPlayerHost() {
    const host = document.getElementById('youtube-player');
    if (host)
        host.innerHTML = '';
}
function destroyPlayer() {
    if (!player)
        return;
    player.stopVideo();
    player.destroy();
    player = null;
    resetPlayerHost();
}
function createPlayer(videoId, minimal) {
    return new Promise((resolve, reject) => {
        player = new window.YT.Player('youtube-player', {
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
function ensurePlayer(videoId) {
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
export async function playYoutubeProjection(videoId) {
    try {
        await ensurePlayer(videoId);
    }
    catch (err) {
        console.error('[livepraise] YouTube embed indisponível:', err);
    }
}
export function stopYoutubeProjection() {
    currentVideoId = '';
    usedMinimalEmbed = false;
    destroyPlayer();
}
