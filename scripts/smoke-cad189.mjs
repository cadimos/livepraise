#!/usr/bin/env node
/**
 * Smoke CAD-189: fila com itens mistos e payload de drag-and-drop.
 */
import {
  migrateTabVerses,
  musicVersesForExport,
  parseQueueDragPayload,
  queueItemFromPayload,
  queueItemTileRelativePath,
  reorderQueueItems,
  serializeQueueDragPayload,
  videoThumbRelativePath,
} from '../dist/shared/queue-items.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const legacy = migrateTabVerses([
  { id: 1, text: 'Linha um\nLinha dois', active: true },
  { id: 2, text: 'Segundo verso' },
]);
assert(legacy.length === 2, 'migrateTabVerses length');
assert(legacy[0]?.kind === 'music', 'kind music');
assert(legacy[0]?.verseId === 1, 'verseId preserved');

const exported = musicVersesForExport([
  ...legacy,
  {
    id: 'b1',
    kind: 'bible',
    label: 'Jo 3:16',
    text: 'Porque Deus amou…',
  },
]);
assert(exported.length === 2, 'export only music items');

const thumb = videoThumbRelativePath('videos/culto/intro.mp4');
assert(thumb === 'videos/culto/thumb/intro.jpg', 'videoThumbRelativePath');

const videoTile = queueItemTileRelativePath({
  kind: 'video',
  mediaPath: 'videos/culto/intro.mp4',
  thumbPath: 'videos/culto/thumb/custom.jpg',
});
assert(videoTile === 'videos/culto/thumb/custom.jpg', 'prefers explicit thumbPath');

const videoTileDerived = queueItemTileRelativePath({
  kind: 'video',
  mediaPath: 'videos/culto/intro.mp4',
});
assert(videoTileDerived === thumb, 'derives thumb from video path');

const payload = {
  kind: 'image',
  label: 'fundo.jpg',
  mediaPath: 'imagens/default/fundo.jpg',
};
const raw = serializeQueueDragPayload(payload);
const parsed = parseQueueDragPayload(raw);
assert(parsed?.mediaPath === payload.mediaPath, 'parse drag payload');

const item = queueItemFromPayload(payload);
assert(item.kind === 'image' && item.id.startsWith('qi-'), 'queue item id');

const videoPayload = {
  kind: 'video',
  label: 'intro.mp4',
  mediaPath: 'videos/culto/intro.mp4',
  thumbPath: 'videos/culto/thumb/intro.jpg',
};
const videoItem = queueItemFromPayload(videoPayload);
assert(videoItem.thumbPath === videoPayload.thumbPath, 'thumbPath on queue item');

const reordered = reorderQueueItems(
  [
    { id: 'a', kind: 'music', label: 'A' },
    { id: 'b', kind: 'music', label: 'B' },
    { id: 'c', kind: 'music', label: 'C' },
  ],
  0,
  2,
);
assert(reordered[2]?.id === 'a', 'reorder moves first to last');

const {
  buildPlaylistExport,
  buildImportTabsFromExport,
  parsePlaylistExport,
} = await import('../dist/shared/playlist-transfer.js');
const { classifyYoutubeDownloadFailure } = await import('../dist/server/services/youtubeImport.js');

assert(
  classifyYoutubeDownloadFailure({
    success: false,
    progressPercent: 0,
    output: 'ERROR: Private video. Sign in if you have access',
    spawnFailed: false,
  }) === 'unavailable',
  'protected video is unavailable',
);
assert(
  classifyYoutubeDownloadFailure({
    success: false,
    progressPercent: 42,
    output: 'ERROR: connection reset',
    spawnFailed: false,
  }) === 'interrupted',
  'partial progress is interrupted',
);
assert(
  classifyYoutubeDownloadFailure({
    success: false,
    progressPercent: 0,
    output: '',
    spawnFailed: true,
  }) === 'unavailable',
  'missing bundled yt-dlp is unavailable',
);

const mixedTab = {
  label: 'Fila 1',
  items: [
    {
      id: 'b1',
      kind: 'bible',
      label: 'Jo 3:16',
      text: 'Porque Deus amou…',
      bibleFile: 'acf.json',
      bookId: 43,
      bookName: 'João',
      chapter: 3,
      verseNum: 16,
    },
    {
      id: 'm1',
      kind: 'music',
      label: 'O segredo de Deus',
      text: 'O segredo de Deus…',
      verseId: 42,
    },
    {
      id: 'v1',
      kind: 'video',
      label: 'intro.mp4',
      mediaPath: 'videos/culto/intro.mp4',
      thumbPath: 'videos/culto/thumb/intro.jpg',
    },
    {
      id: 'y1',
      kind: 'video',
      label: 'YouTube',
      youtubeVideoId: 'dQw4w9WgXcQ',
    },
    {
      id: 'i1',
      kind: 'image',
      label: 'fundo.jpg',
      mediaPath: 'imagens/default/fundo.jpg',
    },
  ],
};

const exportedPlaylist = buildPlaylistExport([mixedTab]);
assert(exportedPlaylist.items.length === 1, 'export one tab');
assert(exportedPlaylist.items[0]?.queueItems?.length === 5, 'export all queue kinds');

const parsedPlaylist = parsePlaylistExport(JSON.stringify(exportedPlaylist));
assert(parsedPlaylist.items[0]?.queueItems?.length === 5, 'parse queueItems');

const imported = buildImportTabsFromExport(parsedPlaylist, new Map(), new Map(), 'missing');
assert(imported[0]?.items?.length === 5, 'import restores queue items');
assert(imported[0]?.items?.[0]?.kind === 'bible', 'bible item preserved');
assert(imported[0]?.items?.[3]?.youtubeVideoId === 'dQw4w9WgXcQ', 'youtube id preserved');

console.log('smoke-cad189: OK');
