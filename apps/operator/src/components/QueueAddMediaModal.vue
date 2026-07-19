<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { FolderOpen, Globe, Link2, Plus, X } from '@lucide/vue';
import { usePreferences } from '../composables/usePreferences';
import { mediaUrl as resolveMediaUrl } from '../composables/useApi';
import type { QueueItem } from '@shared/queue-items';
import { newQueueItemId } from '@shared/queue-items';
import { MEDIA_URL_IMPORT_CATEGORY } from '@shared/queue-import';
import { postMediaUrlImport, postQueueUpload, postYoutubeImportStart, queueItemFromYoutubeJobResponse } from '../utils/queue-import-api';

const open = defineModel<boolean>('open', { default: false });

const props = defineProps<{
  tabId: string | null;
}>();

const emit = defineEmits<{
  added: [items: QueueItem[]];
}>();

const { t } = useI18n();
const { prefs } = usePreferences();

type Step = 'menu' | 'local' | 'youtube' | 'mediaUrl';

const step = ref<Step>('menu');
const youtubeUrl = ref('');
const mediaUrlInput = ref('');
const busy = ref(false);
const error = ref('');
const warning = ref('');
const success = ref('');
const youtubeImportDone = ref(false);
const mediaUrlImportDone = ref(false);
const mediaUrlPreviewSrc = ref<string | null>(null);

function reset(): void {
  step.value = 'menu';
  youtubeUrl.value = '';
  mediaUrlInput.value = '';
  error.value = '';
  warning.value = '';
  success.value = '';
  youtubeImportDone.value = false;
  mediaUrlImportDone.value = false;
  mediaUrlPreviewSrc.value = null;
  busy.value = false;
}

function close(): void {
  open.value = false;
  reset();
}

function queueCategory(): string {
  const img = prefs.value.imageCategory?.trim();
  const vid = prefs.value.videoCategory?.trim();
  return vid || img || 'fila';
}

function mapMediaUrlError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('youtube') || lower.includes('youtu.be')) {
    return t('queueAdd.errors.mediaUrlUseYoutube');
  }
  if (lower.includes('ssrf') || lower.includes('privad') || lower.includes('127.0.0.1') || lower.includes('localhost')) {
    return t('queueAdd.errors.mediaUrlSsrf');
  }
  if (lower.includes('timeout') || lower.includes('tempo')) {
    return t('queueAdd.errors.mediaUrlTimeout');
  }
  if (lower.includes('ssl') || lower.includes('tls') || lower.includes('certific')) {
    return t('queueAdd.errors.mediaUrlSsl');
  }
  if (lower.includes('tamanho') || lower.includes('size') || lower.includes('large') || lower.includes('exced')) {
    return t('queueAdd.errors.mediaUrlTooLarge');
  }
  if (
    lower.includes('content-type') ||
    lower.includes('text/html') ||
    lower.includes('não suportad') ||
    lower.includes('unsupported')
  ) {
    return t('queueAdd.errors.mediaUrlUnsupported');
  }
  return message;
}

const previewAlt = computed(() => t('queueAdd.mediaUrlPreviewAlt'));

async function uploadFile(file: File): Promise<QueueItem> {
  const data = await postQueueUpload(file, queueCategory());
  return { ...(data.item as Omit<QueueItem, 'id'>), id: newQueueItemId() };
}

async function onLocalFiles(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (!files?.length || !props.tabId) return;

  busy.value = true;
  error.value = '';
  warning.value = '';
  const added: QueueItem[] = [];

  try {
    for (const file of Array.from(files)) {
      added.push(await uploadFile(file));
    }
    emit('added', added);
    close();
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('queueAdd.errors.uploadFailed');
  } finally {
    busy.value = false;
    input.value = '';
  }
}

async function importYoutube(): Promise<void> {
  if (!props.tabId) return;
  const url = youtubeUrl.value.trim();
  if (!url) {
    error.value = t('queueAdd.errors.urlRequired');
    return;
  }

  busy.value = true;
  error.value = '';
  warning.value = '';
  success.value = '';

  try {
    const data = await postYoutubeImportStart({ url, category: queueCategory() });
    const item = queueItemFromYoutubeJobResponse(data, newQueueItemId());
    emit('added', [item]);
    close();
  } catch (e) {
    const message = e instanceof Error ? e.message : t('queueAdd.errors.youtubeFailed');
    error.value = message.includes('HTTP 404')
      ? t('queueAdd.errors.serverOutdated')
      : message;
  } finally {
    busy.value = false;
  }
}

function setMediaUrlPreview(item: QueueItem): void {
  mediaUrlPreviewSrc.value = null;
  if (item.kind === 'image' && item.mediaPath) {
    mediaUrlPreviewSrc.value = resolveMediaUrl(item.mediaPath);
    return;
  }
  const thumb = item.thumbPath?.trim();
  if (thumb) {
    mediaUrlPreviewSrc.value = resolveMediaUrl(thumb);
  }
}

async function importMediaUrl(): Promise<void> {
  if (!props.tabId) return;
  const url = mediaUrlInput.value.trim();
  if (!url) {
    error.value = t('queueAdd.errors.mediaUrlRequired');
    return;
  }

  busy.value = true;
  error.value = '';
  warning.value = '';
  success.value = '';
  mediaUrlPreviewSrc.value = null;

  try {
    const data = await postMediaUrlImport({ url, category: MEDIA_URL_IMPORT_CATEGORY });
    const item = { ...(data.item as Omit<QueueItem, 'id'>), id: newQueueItemId() } as QueueItem;
    emit('added', [item]);

    mediaUrlImportDone.value = true;
    if (data.mode === 'reference') {
      success.value = '';
      warning.value = t('queueAdd.mediaUrlResultReference');
    } else {
      success.value = t('queueAdd.mediaUrlResultDownload');
      warning.value = '';
    }
    setMediaUrlPreview(item);
  } catch (e) {
    const raw = e instanceof Error ? e.message : t('queueAdd.errors.mediaUrlFailed');
    error.value = raw.includes('HTTP 404')
      ? t('queueAdd.errors.serverOutdated')
      : mapMediaUrlError(raw);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    role="dialog"
    aria-modal="true"
    :aria-label="t('queueAdd.title')"
    @click.self="close"
  >
    <div
      class="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-lp-surface bg-lp-background shadow-xl"
    >
      <header class="flex items-center justify-between border-b border-lp-surface px-4 py-3">
        <h2 class="text-sm font-semibold text-lp-text">
          {{ t('queueAdd.title') }}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-lp-muted hover:bg-lp-surface hover:text-lp-text"
          :aria-label="t('queueAdd.cancel')"
          @click="close"
        >
          <X
            class="h-4 w-4"
            aria-hidden="true"
          />
        </button>
      </header>

      <div class="space-y-3 p-4">
        <p
          v-if="success"
          role="alert"
          class="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100"
        >
          {{ success }}
        </p>
        <p
          v-if="warning"
          role="alert"
          class="rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
        >
          {{ warning }}
        </p>
        <p
          v-if="error"
          role="alert"
          class="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
        >
          {{ error }}
        </p>

        <template v-if="step === 'menu'">
          <p class="text-sm text-lp-muted">
            {{ t('queueAdd.intro') }}
          </p>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg border border-lp-surface px-4 py-3 text-left text-sm text-lp-text hover:border-lp-primary/50 hover:bg-lp-surface/50"
            :disabled="busy"
            @click="step = 'local'"
          >
            <FolderOpen
              class="h-5 w-5 shrink-0 text-lp-primary"
              aria-hidden="true"
            />
            <span>{{ t('queueAdd.optionLocal') }}</span>
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg border border-lp-surface px-4 py-3 text-left text-sm text-lp-text hover:border-lp-primary/50 hover:bg-lp-surface/50"
            :disabled="busy"
            @click="step = 'youtube'"
          >
            <Link2
              class="h-5 w-5 shrink-0 text-lp-primary"
              aria-hidden="true"
            />
            <span>{{ t('queueAdd.optionYoutube') }}</span>
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg border border-lp-surface px-4 py-3 text-left text-sm text-lp-text hover:border-lp-primary/50 hover:bg-lp-surface/50"
            :disabled="busy"
            @click="step = 'mediaUrl'"
          >
            <Globe
              class="h-5 w-5 shrink-0 text-lp-primary"
              aria-hidden="true"
            />
            <span>{{ t('queueAdd.optionMediaUrl') }}</span>
          </button>
        </template>

        <template v-else-if="step === 'local'">
          <p class="text-sm text-lp-muted">
            {{ t('queueAdd.localHint') }}
          </p>
          <label
            class="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-lp-surface px-4 py-6 text-sm text-lp-muted hover:border-lp-primary/50"
          >
            <Plus
              class="h-6 w-6 text-lp-primary"
              aria-hidden="true"
            />
            <span>{{ busy ? t('queueAdd.uploading') : t('queueAdd.pickFiles') }}</span>
            <input
              type="file"
              class="sr-only"
              accept="image/*,video/*"
              multiple
              :disabled="busy"
              @change="onLocalFiles"
            >
          </label>
          <button
            type="button"
            class="text-sm text-lp-muted hover:text-lp-text"
            @click="step = 'menu'"
          >
            {{ t('queueAdd.back') }}
          </button>
        </template>

        <template v-else-if="step === 'youtube'">
          <p class="text-sm text-lp-muted">
            {{ t('queueAdd.youtubeHint') }}
          </p>
          <label class="block text-xs uppercase tracking-wider text-lp-muted">
            {{ t('queueAdd.youtubeUrl') }}
            <input
              v-model="youtubeUrl"
              type="url"
              autocomplete="url"
              class="mt-1 w-full rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text"
              :placeholder="t('queueAdd.youtubePlaceholder')"
              :disabled="busy"
            >
          </label>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm text-lp-muted hover:bg-lp-surface"
              :disabled="busy"
              @click="step = 'menu'"
            >
              {{ t('queueAdd.back') }}
            </button>
            <button
              type="button"
              class="rounded-lg bg-lp-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              :disabled="busy"
              @click="importYoutube"
            >
              {{ busy ? t('queueAdd.importing') : t('queueAdd.import') }}
            </button>
          </div>
        </template>

        <template v-else>
          <template v-if="mediaUrlImportDone">
            <div
              v-if="mediaUrlPreviewSrc"
              class="aspect-video max-h-40 w-full overflow-hidden rounded-lg border border-lp-surface bg-black"
            >
              <img
                :src="mediaUrlPreviewSrc"
                :alt="previewAlt"
                class="h-full w-full object-contain"
              >
            </div>
            <p class="text-sm text-lp-muted">
              {{ t('queueAdd.mediaUrlDoneHint') }}
            </p>
            <div class="flex justify-end">
              <button
                type="button"
                class="rounded-lg bg-lp-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                @click="close"
              >
                {{ t('queueAdd.done') }}
              </button>
            </div>
          </template>
          <template v-else>
            <p class="text-sm text-lp-muted">
              {{ t('queueAdd.mediaUrlHint') }}
            </p>
            <label class="block text-xs uppercase tracking-wider text-lp-muted">
              {{ t('queueAdd.mediaUrlLabel') }}
              <input
                v-model="mediaUrlInput"
                type="url"
                autocomplete="url"
                class="mt-1 w-full rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text"
                :placeholder="t('queueAdd.mediaUrlPlaceholder')"
                :disabled="busy"
              >
            </label>
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm text-lp-muted hover:bg-lp-surface"
                :disabled="busy"
                @click="step = 'menu'"
              >
                {{ t('queueAdd.back') }}
              </button>
              <button
                type="button"
                class="rounded-lg bg-lp-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                :disabled="busy"
                @click="importMediaUrl"
              >
                {{ busy ? t('queueAdd.importing') : t('queueAdd.import') }}
              </button>
            </div>
          </template>
        </template>
      </div>

      <footer
        v-if="step === 'menu'"
        class="flex justify-end border-t border-lp-surface px-4 py-3"
      >
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm text-lp-muted hover:bg-lp-surface"
          @click="close"
        >
          {{ t('queueAdd.cancel') }}
        </button>
      </footer>
    </div>
  </div>
</template>
