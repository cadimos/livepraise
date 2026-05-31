<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  fetchJson,
  mediaUrl,
  quickBackgroundDisplayUrl,
  type MediaFileProperties,
  type QuickBackground,
} from '../composables/useApi';
import { usePreferences } from '../composables/usePreferences';
import { useLiveSocket } from '../composables/useLiveSocket';
import { useQuickBackgrounds } from '../composables/useQuickBackgrounds';
import {
  projectTabImageBackground,
  projectTabVideoBackground,
} from '../utils/projection-actions';
import { summarizeLabel } from '@shared/queue-items';
import { isVideoMediaUrl } from '../utils/projection-mode';

const props = defineProps<{
  mediaPath: string;
  mediaKind: 'imagens' | 'videos';
  categories: string[];
  thumbPath?: string;
  pipelineStatus?: 'ready' | 'processing' | 'error';
  displayName?: string;
}>();

const emit = defineEmits<{
  previewBg: [url: string];
  refresh: [];
}>();

const { t } = useI18n();
const { prefs, addQueueItem } = usePreferences();
const { sendAction } = useLiveSocket();
const { quickBackgrounds, reload: reloadQuickBackgrounds, setInitial: setInitialQuickBackground } =
  useQuickBackgrounds();

const setInitialBusy = ref(false);
const setInitialError = ref('');

const menuOpen = ref(false);
const menuX = ref(0);
const menuY = ref(0);

const propertiesOpen = ref(false);
const properties = ref<MediaFileProperties | null>(null);
const propertiesError = ref('');

const replaceOpen = ref(false);
const replaceBusy = ref(false);
const replaceError = ref('');

const categoryOpen = ref(false);
const targetCategory = ref('');
const categoryBusy = ref(false);
const categoryError = ref('');

const deleteBusy = ref(false);

const apiPrefix = computed(() => (props.mediaKind === 'imagens' ? '/imagem' : '/video'));

const currentCategory = computed(() => {
  const parts = props.mediaPath.replaceAll('\\', '/').split('/');
  return parts.length >= 2 ? parts[1] : '';
});

const otherCategories = computed(() =>
  props.categories.filter((c) => c !== currentCategory.value),
);

const hasActiveQueue = computed(() => {
  const tab = prefs.value.chromeTabs.find((item) => item.id === prefs.value.activeTabId);
  return Boolean(tab);
});

const mediaDisplayName = computed(() => {
  if (props.displayName) return summarizeLabel(props.displayName, 48);
  const parts = props.mediaPath.replaceAll('\\', '/').split('/');
  return summarizeLabel(parts[parts.length - 1] ?? props.mediaPath, 48);
});

const deleteDisabled = computed(
  () =>
    deleteBusy.value ||
    (props.mediaKind === 'videos' && props.pipelineStatus === 'processing'),
);

function closeMenu(): void {
  menuOpen.value = false;
}

function onContextMenu(event: MouseEvent): void {
  event.preventDefault();
  menuX.value = Math.min(event.clientX, window.innerWidth - 224);
  menuY.value = event.clientY;
  menuOpen.value = true;
}

function onDocumentClick(): void {
  closeMenu();
}

function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    closeMenu();
    propertiesOpen.value = false;
    replaceOpen.value = false;
    categoryOpen.value = false;
  }
}

async function openProperties(): Promise<void> {
  closeMenu();
  propertiesError.value = '';
  properties.value = null;
  propertiesOpen.value = true;
  try {
    const data = await fetchJson<MediaFileProperties & { status: string }>(
      `${apiPrefix.value}/propriedades?path=${encodeURIComponent(props.mediaPath)}`,
    );
    const { status: _s, ...rest } = data;
    properties.value = rest;
  } catch (e) {
    propertiesError.value =
      e instanceof Error ? e.message : t('mediaContext.errors.properties');
  }
}

function openReplaceQuick(): void {
  closeMenu();
  replaceError.value = '';
  replaceOpen.value = true;
  void reloadQuickBackgrounds();
}

async function confirmReplace(slot: QuickBackground): Promise<void> {
  if (!slot.id) return;
  replaceBusy.value = true;
  replaceError.value = '';
  try {
    await fetchJson(`/background-rapido/${slot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: props.mediaPath.replaceAll('\\', '/'),
        diretorio: props.mediaKind,
      }),
    });
    replaceOpen.value = false;
    await reloadQuickBackgrounds();
  } catch (e) {
    replaceError.value =
      e instanceof Error ? e.message : t('mediaContext.errors.replaceQuick');
  } finally {
    replaceBusy.value = false;
  }
}

function openChangeCategory(): void {
  closeMenu();
  categoryError.value = '';
  targetCategory.value = otherCategories.value[0] ?? '';
  categoryOpen.value = true;
}

async function confirmChangeCategory(): Promise<void> {
  if (!targetCategory.value) return;
  categoryBusy.value = true;
  categoryError.value = '';
  try {
    await fetchJson(`${apiPrefix.value}/categoria`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: props.mediaPath,
        toCategory: targetCategory.value,
      }),
    });
    categoryOpen.value = false;
    emit('refresh');
  } catch (e) {
    categoryError.value =
      e instanceof Error ? e.message : t('mediaContext.errors.changeCategory');
  } finally {
    categoryBusy.value = false;
  }
}

async function setAsInitialBackground(): Promise<void> {
  closeMenu();
  setInitialBusy.value = true;
  setInitialError.value = '';
  try {
    await setInitialQuickBackground({
      url: props.mediaPath.replaceAll('\\', '/'),
      diretorio: props.mediaKind,
    });
  } catch (e) {
    setInitialError.value =
      e instanceof Error ? e.message : t('mediaContext.errors.setInitial');
    window.alert(setInitialError.value);
  } finally {
    setInitialBusy.value = false;
  }
}

function applyToQueue(): void {
  closeMenu();
  const tabId = prefs.value.activeTabId;
  if (!tabId || !hasActiveQueue.value) {
    window.alert(t('mediaContext.errors.noActiveQueue'));
    return;
  }

  const parts = props.mediaPath.replaceAll('\\', '/').split('/');
  const label = summarizeLabel(parts[parts.length - 1] ?? props.mediaPath, 32);
  const url = mediaUrl(props.mediaPath);
  const isVideo = props.mediaKind === 'videos' || isVideoMediaUrl(url);

  addQueueItem(tabId, {
    kind: isVideo ? 'video' : 'image',
    label,
    mediaPath: props.mediaPath,
    thumbPath: isVideo ? props.thumbPath : undefined,
  });

  if (isVideo) {
    if (props.thumbPath) emit('previewBg', mediaUrl(props.thumbPath));
    projectTabVideoBackground(sendAction, url);
  } else {
    emit('previewBg', url);
    projectTabImageBackground(sendAction, url);
  }
}

function isDeleteProcessingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('processamento') ||
    normalized.includes('processing') ||
    normalized.includes('409')
  );
}

async function deleteFromLibrary(): Promise<void> {
  closeMenu();
  const name = mediaDisplayName.value;
  const msg = `${t('mediaContext.deleteConfirm', { name })}\n\n${t('mediaContext.deleteConfirmQueueHint')}`;
  if (!window.confirm(msg)) return;

  deleteBusy.value = true;
  try {
    await fetchJson<{ status: string; path?: string }>(`${apiPrefix.value}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: props.mediaPath }),
    });
    await reloadQuickBackgrounds();
    emit('refresh');
  } catch (e) {
    const raw = e instanceof Error ? e.message : t('mediaContext.errors.delete');
    const message = isDeleteProcessingError(raw)
      ? t('mediaContext.errors.deleteProcessing')
      : raw || t('mediaContext.errors.delete');
    window.alert(message);
  } finally {
    deleteBusy.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onDocumentKeydown);
});
</script>

<template>
  <div class="contents" @contextmenu="onContextMenu">
    <slot />
  </div>

  <ul
    v-if="menuOpen"
    class="fixed z-[60] min-w-[14rem] rounded-md border border-lp-surface bg-lp-background py-1 text-sm text-lp-text shadow-lg"
    :style="{ left: `${menuX}px`, top: `${menuY}px` }"
    role="menu"
    @click.stop
  >
    <li>
      <button
        type="button"
        class="w-full px-3 py-2 text-left hover:bg-lp-surface disabled:opacity-50"
        role="menuitem"
        :disabled="setInitialBusy"
        @click="setAsInitialBackground"
      >
        {{ t('mediaContext.setInitial') }}
      </button>
    </li>
    <li>
      <button
        type="button"
        class="w-full px-3 py-2 text-left hover:bg-lp-surface"
        role="menuitem"
        @click="openReplaceQuick"
      >
        {{ t('mediaContext.replaceQuick') }}
      </button>
    </li>
    <li>
      <button
        type="button"
        class="w-full px-3 py-2 text-left hover:bg-lp-surface"
        role="menuitem"
        @click="openProperties"
      >
        {{ t('mediaContext.properties') }}
      </button>
    </li>
    <li>
      <button
        type="button"
        class="w-full px-3 py-2 text-left hover:bg-lp-surface"
        role="menuitem"
        :disabled="otherCategories.length === 0"
        @click="openChangeCategory"
      >
        {{ t('mediaContext.changeCategory') }}
      </button>
    </li>
    <li>
      <button
        type="button"
        class="w-full px-3 py-2 text-left hover:bg-lp-surface"
        role="menuitem"
        @click="applyToQueue"
      >
        {{ t('mediaContext.applyToQueue') }}
      </button>
    </li>
    <li role="separator" class="my-1 border-t border-lp-surface" aria-hidden="true" />
    <li>
      <button
        type="button"
        class="w-full px-3 py-2 text-left text-rose-400 transition hover:bg-rose-950/50 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
        role="menuitem"
        :disabled="deleteDisabled"
        :title="
          props.pipelineStatus === 'processing'
            ? t('mediaContext.errors.deleteProcessing')
            : undefined
        "
        :aria-label="t('mediaContext.deleteAria', { name: mediaDisplayName })"
        @click="deleteFromLibrary"
      >
        {{ t('mediaContext.delete') }}
      </button>
    </li>
  </ul>

  <!-- Propriedades -->
  <div
    v-if="propertiesOpen"
    class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
    role="dialog"
    aria-modal="true"
    @click.self="propertiesOpen = false"
  >
    <div class="w-full max-w-md rounded-xl border border-lp-surface bg-lp-background p-4 shadow-xl">
      <h3 class="mb-3 text-sm font-semibold text-lp-text">{{ t('mediaContext.properties') }}</h3>
      <p v-if="propertiesError" class="mb-2 text-sm text-rose-300">{{ propertiesError }}</p>
      <dl v-else-if="properties" class="space-y-2 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="text-lp-muted">{{ t('mediaContext.fields.name') }}</dt>
          <dd class="text-right text-lp-text">{{ properties.name }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-lp-muted">{{ t('mediaContext.fields.category') }}</dt>
          <dd class="text-right text-lp-text">{{ properties.category }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-lp-muted">{{ t('mediaContext.fields.size') }}</dt>
          <dd class="text-right text-lp-text">{{ properties.sizeLabel }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-lp-muted">{{ t('mediaContext.fields.modified') }}</dt>
          <dd class="text-right text-lp-text">{{ new Date(properties.modifiedAt).toLocaleString() }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-lp-muted">{{ t('mediaContext.fields.path') }}</dt>
          <dd class="break-all text-right text-xs text-lp-text">{{ properties.path }}</dd>
        </div>
      </dl>
      <p v-else class="text-sm text-lp-muted">{{ t('common.loading') }}</p>
      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="rounded-md border border-lp-surface px-3 py-1.5 text-sm hover:bg-lp-surface"
          @click="propertiesOpen = false"
        >
          {{ t('common.close') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Alterar fundo rápido -->
  <div
    v-if="replaceOpen"
    class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
    role="dialog"
    aria-modal="true"
    @click.self="replaceOpen = false"
  >
    <div class="w-full max-w-lg rounded-xl border border-lp-surface bg-lp-background p-4 shadow-xl">
      <h3 class="mb-2 text-sm font-semibold text-lp-text">{{ t('mediaContext.replaceQuickTitle') }}</h3>
      <p class="mb-3 text-xs text-lp-muted">{{ t('mediaContext.replaceQuickHint') }}</p>
      <p v-if="replaceError" class="mb-2 text-sm text-rose-300">{{ replaceError }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="slot in quickBackgrounds"
          :key="slot.id ?? slot.url"
          type="button"
          class="h-16 w-24 overflow-hidden rounded-lg border border-lp-surface transition hover:border-lp-primary disabled:opacity-50"
          :disabled="replaceBusy || !slot.id"
          @click="confirmReplace(slot)"
        >
          <img :src="quickBackgroundDisplayUrl(slot)" alt="" class="h-full w-full object-cover" />
        </button>
      </div>
      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="rounded-md border border-lp-surface px-3 py-1.5 text-sm hover:bg-lp-surface"
          @click="replaceOpen = false"
        >
          {{ t('common.cancel') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Mudar categoria -->
  <div
    v-if="categoryOpen"
    class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
    role="dialog"
    aria-modal="true"
    @click.self="categoryOpen = false"
  >
    <div class="w-full max-w-sm rounded-xl border border-lp-surface bg-lp-background p-4 shadow-xl">
      <h3 class="mb-3 text-sm font-semibold text-lp-text">{{ t('mediaContext.changeCategory') }}</h3>
      <p v-if="categoryError" class="mb-2 text-sm text-rose-300">{{ categoryError }}</p>
      <select
        v-model="targetCategory"
        class="mb-4 w-full rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text"
      >
        <option v-for="cat in otherCategories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md border border-lp-surface px-3 py-1.5 text-sm hover:bg-lp-surface"
          @click="categoryOpen = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="rounded-md bg-lp-primary px-3 py-1.5 text-sm text-white disabled:opacity-50"
          :disabled="categoryBusy || !targetCategory"
          @click="confirmChangeCategory"
        >
          {{ t('common.confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>
