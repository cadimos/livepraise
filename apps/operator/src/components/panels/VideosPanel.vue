<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchJson, mediaUrl } from '../../composables/useApi';
import { usePreferences } from '../../composables/usePreferences';
import { useLiveSocket } from '../../composables/useLiveSocket';
import MediaTileContextMenu from '../MediaTileContextMenu.vue';
import { projectTabVideoBackground } from '../../utils/projection-actions';

interface VideoItem {
  video: string;
  thumb: string;
  pipelineStatus?: 'ready' | 'processing' | 'error';
  pipelinePercent?: number;
  pipelineError?: string;
}

const emit = defineEmits<{
  previewBg: [url: string];
}>();

const { t } = useI18n();
const { prefs, setVideoCategory, setVideoSearchQuery } = usePreferences();
const { sendAction } = useLiveSocket();

const videoCategories = ref<string[]>([]);
const videos = ref<VideoItem[]>([]);
const error = ref('');
const searchQuery = computed({
  get: () => prefs.value.videoSearchQuery,
  set: (value: string) => setVideoSearchQuery(value),
});

const filteredVideos = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return videos.value;
  return videos.value.filter((item) => item.video.toLowerCase().includes(q));
});

const hasProcessingVideos = computed(() =>
  videos.value.some((item) => item.pipelineStatus && item.pipelineStatus !== 'ready'),
);

let pollTimer: ReturnType<typeof setInterval> | null = null;

function clearPollTimer(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function syncPollTimer(): void {
  if (hasProcessingVideos.value && !pollTimer) {
    pollTimer = setInterval(() => {
      reloadCurrentCategory();
    }, 3000);
  } else if (!hasProcessingVideos.value) {
    clearPollTimer();
  }
}

async function loadVideoCategories() {
  try {
    const data = await fetchJson<{ status: string; videos: string[] }>(
      '/video/categoria',
    );
    videoCategories.value = data.videos ?? [];
    if (!prefs.value.videoCategory && videoCategories.value[0]) {
      setVideoCategory(videoCategories.value[0]);
    }
    if (prefs.value.videoCategory) {
      await loadVideos(prefs.value.videoCategory);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('videos.errors.categories');
  }
}

function reloadCurrentCategory(): void {
  const cat = prefs.value.videoCategory;
  if (cat) void loadVideos(cat);
}

async function loadVideos(category: string) {
  setVideoCategory(category);
  try {
    const data = await fetchJson<{ status: string; videos: VideoItem[] }>(
      `/video/categoria/${encodeURIComponent(category)}`,
    );
    videos.value = data.videos ?? [];
    syncPollTimer();
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('videos.errors.videos');
  }
}

function projectVideo(item: VideoItem) {
  const url = mediaUrl(item.video);
  if (item.thumb) {
    emit('previewBg', mediaUrl(item.thumb));
  }
  projectTabVideoBackground(sendAction, url);
}

watch(
  () => prefs.value.videoCategory,
  (cat) => {
    if (cat) void loadVideos(cat);
  },
);

onMounted(() => {
  void loadVideoCategories();
});

onUnmounted(() => {
  clearPollTimer();
});
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <div v-if="error" class="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
      {{ error }}
    </div>

    <label class="text-xs uppercase tracking-wider text-lp-muted">{{ t('videos.category') }}</label>
    <select
      :value="prefs.videoCategory"
      class="rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text"
      @change="loadVideos(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="cat in videoCategories" :key="cat" :value="cat">
        {{ cat }}
      </option>
    </select>

    <label class="text-xs uppercase tracking-wider text-lp-muted">{{ t('common.search') }}</label>
    <input
      v-model="searchQuery"
      type="search"
      class="rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text placeholder:text-lp-muted"
      :placeholder="t('common.searchPlaceholder')"
    />

    <ul class="grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
      <li v-for="item in filteredVideos" :key="item.video">
        <MediaTileContextMenu
          :media-path="item.video"
          media-kind="videos"
          :categories="videoCategories"
          :thumb-path="item.thumb"
          @preview-bg="emit('previewBg', $event)"
          @refresh="reloadCurrentCategory"
        >
          <button
            type="button"
            class="relative aspect-video w-full overflow-hidden rounded-lg border border-lp-surface transition hover:border-lp-primary"
            :class="{
              'pointer-events-none opacity-70':
                item.pipelineStatus && item.pipelineStatus !== 'ready',
            }"
            @click="projectVideo(item)"
          >
            <img
              v-if="item.thumb"
              :src="mediaUrl(item.thumb)"
              alt=""
              class="h-full w-full object-cover"
            />
            <span v-else class="flex h-full items-center justify-center text-xs text-lp-muted">
              {{ t('videos.noThumb') }}
            </span>
            <span
              v-if="item.pipelineStatus === 'processing'"
              class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-xs font-medium text-white"
            >
              <span
                class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden="true"
              />
              {{ item.pipelinePercent ?? 0 }}%
            </span>
            <span
              v-else-if="item.pipelineStatus === 'error'"
              class="absolute inset-0 flex items-center justify-center bg-rose-950/80 px-2 text-center text-xs text-rose-100"
              :title="item.pipelineError"
            >
              {{ t('videos.pipelineError') }}
            </span>
          </button>
        </MediaTileContextMenu>
      </li>
    </ul>
  </div>
</template>
