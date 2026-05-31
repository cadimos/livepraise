import type { QueueItem } from '@shared/queue-items';
import { mediaUrl } from '../composables/useApi';
import type { SendLiveAction } from './projection-actions';
import {
  projectTabImageBackground,
  projectTabVideoBackground,
  projectTabYoutubeBackground,
} from './projection-actions';
import { youtubeThumbnailUrl } from '@shared/youtube';
import {
  buildBibleHtml,
  buildBibleStageHtml,
  buildMusicHtml,
  buildMusicStageHtml,
} from './projection';
import { queueItemTileRelativePath } from '@shared/queue-items';

/** ID YouTube para thumb da fila e embed enquanto o download local não termina. */
export function youtubeQueueVideoId(item: QueueItem): string | undefined {
  return item.previewVideoId ?? item.youtubeVideoId;
}

/** Download local ainda em curso (sem ficheiro pronto). */
export function youtubeImportInProgress(item: QueueItem): boolean {
  return Boolean(
    item.youtubeImportJobId &&
      item.youtubeImportPhase !== 'failed' &&
      !item.mediaPath,
  );
}

function queueVideoPreviewUrl(item: QueueItem): string | undefined {
  const thumbRel = queueItemTileRelativePath(item);
  if (thumbRel) return mediaUrl(thumbRel);
  const ytId = youtubeQueueVideoId(item);
  if (ytId) return youtubeThumbnailUrl(ytId);
  return undefined;
}

function projectYoutubeVideo(
  sendAction: SendLiveAction,
  videoId: string,
  onPreviewBg?: (url: string) => void,
): void {
  onPreviewBg?.(youtubeThumbnailUrl(videoId));
  projectTabYoutubeBackground(sendAction, videoId);
}

export function projectQueueItem(
  sendAction: SendLiveAction,
  item: QueueItem,
  tabFooter: string,
  nextMusicText: string | null,
  onPreviewHtml: (html: string) => void,
  onPreviewBg?: (url: string) => void,
): void {
  switch (item.kind) {
    case 'music': {
      if (!item.text) return;
      const html = buildMusicHtml(item.text, tabFooter);
      onPreviewHtml(html);
      sendAction('viewMusica', html);
      sendAction(
        'viewMusicaRetorno',
        buildMusicStageHtml(item.text, nextMusicText, tabFooter, true),
      );
      break;
    }
    case 'bible': {
      if (
        !item.text ||
        item.bookName == null ||
        item.chapter == null ||
        item.verseNum == null
      ) {
        return;
      }
      const html = buildBibleHtml(
        item.bookName,
        item.chapter,
        item.verseNum,
        item.text,
      );
      onPreviewHtml(html);
      sendAction('viewBiblia', html);
      sendAction(
        'viewBibliaRetorno',
        buildBibleStageHtml(
          item.bookName,
          item.chapter,
          item.verseNum,
          item.text,
        ),
      );
      break;
    }
    case 'image': {
      if (!item.mediaPath) return;
      const url = mediaUrl(item.mediaPath);
      onPreviewBg?.(url);
      projectTabImageBackground(sendAction, url);
      break;
    }
    case 'video': {
      const ytId = youtubeQueueVideoId(item);

      if (youtubeImportInProgress(item) && ytId) {
        projectYoutubeVideo(sendAction, ytId, onPreviewBg);
        break;
      }

      if (item.youtubeImportPhase === 'failed' && !item.youtubeVideoId && !ytId) {
        return;
      }

      if (item.mediaPath) {
        const url = mediaUrl(item.mediaPath);
        const previewUrl = queueVideoPreviewUrl(item);
        if (previewUrl) onPreviewBg?.(previewUrl);
        projectTabVideoBackground(sendAction, url);
        break;
      }

      if (ytId) {
        projectYoutubeVideo(sendAction, ytId, onPreviewBg);
        break;
      }
      break;
    }
    case 'blank': {
      sendAction('removeConteudo', '');
      onPreviewHtml('');
      break;
    }
    default:
      break;
  }
}

export function nextMusicTextInTab(
  items: QueueItem[],
  fromIndex: number,
): string | null {
  for (let i = fromIndex + 1; i < items.length; i += 1) {
    const hit = items[i];
    if (hit?.kind === 'music' && hit.text) return hit.text;
  }
  return null;
}

export function tabProjectionFooter(tab: {
  label: string;
  songName?: string;
  artist?: string;
}): string {
  return tab.artist
    ? `${tab.songName ?? tab.label} (${tab.artist})`
    : (tab.songName ?? tab.label);
}

/** Rodapé de projeção para item de música — prioriza metadados do item (verso arrastado). */
export function musicProjectionFooter(
  item: QueueItem,
  tab: { label: string; songName?: string; artist?: string },
): string {
  if (item.kind !== 'music') {
    return tabProjectionFooter(tab);
  }
  const songName = item.songName ?? tab.songName;
  const artist = item.artist ?? tab.artist;
  if (artist?.trim()) {
    return `${songName ?? tab.label} (${artist.trim()})`;
  }
  return songName ?? tab.label;
}
