/** Itens da fila de projeção (chrome tabs) e payload de drag-and-drop (CAD-189). */
export const QUEUE_DRAG_MIME = 'application/x-livepraise-queue-drag';
/** Paridade `server/routes/media.ts` / operador — thumb JPEG por vídeo. */
export function videoThumbRelativePath(videoRelativePath) {
    const normalized = videoRelativePath.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    if (parts[0] !== 'videos' || parts.length < 2)
        return '';
    const cat = parts[1];
    const file = parts[parts.length - 1] ?? '';
    const base = file.replace(/\.[^.]+$/i, '');
    if (!base)
        return '';
    return `videos/${cat}/thumb/${base}.jpg`;
}
/** Caminho relativo para `<img>` no tile da fila (imagem ou thumb de vídeo). */
export function queueItemTileRelativePath(item) {
    if (item.kind === 'image')
        return item.mediaPath ?? '';
    if (item.kind === 'video') {
        if (item.thumbPath)
            return item.thumbPath;
        return videoThumbRelativePath(item.mediaPath ?? '');
    }
    return '';
}
let itemSeq = 0;
export function newQueueItemId() {
    itemSeq += 1;
    return `qi-${Date.now()}-${itemSeq}`;
}
export function migrateTabVerses(verses) {
    return verses.map((v) => ({
        id: `music-${v.id}`,
        kind: 'music',
        label: summarizeLabel(v.text),
        text: v.text,
        verseId: v.id,
        active: v.active,
    }));
}
export function summarizeLabel(text, max = 48) {
    const oneLine = text.replace(/\s+/g, ' ').trim();
    if (oneLine.length <= max)
        return oneLine;
    return `${oneLine.slice(0, max - 1)}…`;
}
export function musicVersesForExport(items) {
    return items
        .filter((item) => item.kind === 'music' && item.text != null && item.verseId != null)
        .map((item) => ({ id: item.verseId, text: item.text }));
}
/** ID YouTube para thumb da fila e embed enquanto o download local não termina. */
export function youtubeQueueVideoId(item) {
    return item.previewVideoId ?? item.youtubeVideoId;
}
/** Vídeo YouTube sem ficheiro local — reprodução online. */
export function isYoutubeOnlinePlayback(item) {
    return item.kind === 'video' && !item.mediaPath && Boolean(youtubeQueueVideoId(item));
}
export function queueItemsForExport(items) {
    return items.map(({ id: _id, active: _active, youtubeImportJobId: _job, youtubeImportPhase: _phase, youtubeImportProgress: _progress, youtubeImportAttempt: _attempt, youtubeImportMaxAttempts: _max, youtubeImportError: _error, ...item }) => item);
}
export function queueItemsFromExport(items) {
    return items.map((item) => ({
        ...item,
        id: newQueueItemId(),
    }));
}
export function queueItemFromPayload(payload) {
    return {
        id: newQueueItemId(),
        kind: payload.kind,
        label: payload.label,
        text: payload.text,
        verseId: payload.verseId,
        songId: payload.songId,
        songName: payload.songName,
        artist: payload.artist,
        bibleFile: payload.bibleFile,
        bookId: payload.bookId,
        bookName: payload.bookName,
        chapter: payload.chapter,
        verseNum: payload.verseNum,
        mediaPath: payload.mediaPath,
        thumbPath: payload.thumbPath,
        youtubeVideoId: payload.youtubeVideoId,
    };
}
export function serializeQueueDragPayload(payload) {
    return JSON.stringify(payload);
}
export function parseQueueDragPayload(raw) {
    if (!raw)
        return null;
    try {
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object' || typeof data.kind !== 'string')
            return null;
        if (typeof data.label !== 'string' || !data.label.trim())
            return null;
        return data;
    }
    catch {
        return null;
    }
}
export function reorderQueueItems(items, fromIndex, toIndex) {
    if (fromIndex === toIndex)
        return items;
    if (fromIndex < 0 || fromIndex >= items.length)
        return items;
    if (toIndex < 0 || toIndex >= items.length)
        return items;
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
}
