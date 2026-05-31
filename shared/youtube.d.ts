export function isValidYouTubeVideoId(id: string): boolean;
export function parseYouTubeVideoId(input: string): string | null;
export interface YoutubeEmbedOptions {
  origin?: string;
  widgetReferrer?: string;
}
export function youtubePlayerVars(
  videoId: string,
  options?: YoutubeEmbedOptions & { minimal?: boolean },
): Record<string, string | number>;
export function youtubeWatchUrl(videoId: string): string;
export function youtubeEmbedUrl(
  videoId: string,
  options?: YoutubeEmbedOptions,
): string;
export function youtubeThumbnailUrl(videoId: string): string;
