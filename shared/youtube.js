/** Extração e validação de IDs YouTube (CAD-194). */
const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const URL_PATTERNS = [
    /(?:youtube\.com\/watch\?[^#]*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
];
export function isValidYouTubeVideoId(id) {
    return YOUTUBE_ID_RE.test(id);
}
export function parseYouTubeVideoId(input) {
    const trimmed = input.trim();
    if (!trimmed)
        return null;
    if (isValidYouTubeVideoId(trimmed))
        return trimmed;
    for (const pattern of URL_PATTERNS) {
        const match = trimmed.match(pattern);
        if (match?.[1] && isValidYouTubeVideoId(match[1]))
            return match[1];
    }
    return null;
}
export function youtubePlayerVars(videoId, options) {
    const vars = {
        autoplay: 1,
        mute: 0,
        enablejsapi: 1,
        playsinline: 1,
    };
    if (!options?.minimal) {
        vars.controls = 0;
        vars.rel = 0;
        vars.modestbranding = 1;
    }
    const origin = options?.origin?.trim();
    if (origin) {
        vars.origin = origin;
        vars.widget_referrer =
            options?.widgetReferrer?.trim() || `${origin.replace(/\/$/, '')}/projector/`;
    }
    return vars;
}
export function youtubeWatchUrl(videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
}
export function youtubeEmbedUrl(videoId, options) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(youtubePlayerVars(videoId, options))) {
        params.set(key, String(value));
    }
    return `https://www.youtube.com/embed/${videoId}?${params}`;
}
/** Miniatura estática do YouTube (prévia no operador). */
export function youtubeThumbnailUrl(videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
