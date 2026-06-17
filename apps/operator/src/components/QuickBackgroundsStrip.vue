<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  quickBackgroundDisplayUrl,
  quickBackgroundProjectionUrl,
  type QuickBackground,
} from '../composables/useApi';
import { useQuickBackgrounds } from '../composables/useQuickBackgrounds';
import { useLiveSocket, whenLiveSocketReady } from '../composables/useLiveSocket';
import { projectQuickBackground } from '../utils/projection-actions';
import {
  isProjectionBackgroundAction,
  projectionBackgroundPreviewUrl,
} from '../utils/projection-background';
import { PREVIEW_COLUMN_WIDTH } from '../constants/layout';

const emit = defineEmits<{
  previewBg: [url: string];
  /** Limpa HTML da prévia — fundo rápido substitui a tela inteira. */
  clearPreview: [];
}>();

const { t } = useI18n();
const { sendAction, lastAction } = useLiveSocket();

const { quickBackgrounds, error, reload, setInitial } = useQuickBackgrounds();

const visibleBackgrounds = computed(() => quickBackgrounds.value.slice(0, 5));

const menuOpen = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const menuItem = ref<QuickBackground | null>(null);
const setInitialBusy = ref(false);

function closeMenu(): void {
  menuOpen.value = false;
  menuItem.value = null;
}

function onContextMenu(event: MouseEvent, item: QuickBackground): void {
  event.preventDefault();
  menuX.value = event.clientX;
  menuY.value = event.clientY;
  menuItem.value = item;
  menuOpen.value = true;
}

function onDocumentClick(): void {
  closeMenu();
}

function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeMenu();
}

function projectQuick(item: QuickBackground) {
  emit('previewBg', quickBackgroundDisplayUrl(item));
  emit('clearPreview');
  projectQuickBackground(sendAction, quickBackgroundProjectionUrl(item));
}

function projectInitialQuick(item: QuickBackground): void {
  emit('previewBg', quickBackgroundDisplayUrl(item));
  emit('clearPreview');
  projectQuickBackground(sendAction, quickBackgroundProjectionUrl(item));
}

function restorePreviewFromLiveState(): boolean {
  const action = lastAction.value;
  if (!isProjectionBackgroundAction(action)) return false;
  emit('previewBg', projectionBackgroundPreviewUrl(action));
  return true;
}

function canSetInitial(item: QuickBackground | null): boolean {
  if (!item) return false;
  if (item.id != null && Number(item.id) >= 1) return true;
  return Boolean(item.url && item.diretorio);
}

async function setAsInitial(): Promise<void> {
  const item = menuItem.value;
  if (!canSetInitial(item)) return;
  closeMenu();
  setInitialBusy.value = true;
  try {
    if (item!.id != null && Number(item!.id) >= 1) {
      await setInitial({ id: Number(item!.id) });
    } else {
      await setInitial({
        url: item!.url,
        diretorio: item!.diretorio === 'videos' ? 'videos' : 'imagens',
      });
    }
  } catch (e) {
    window.alert(
      e instanceof Error ? e.message : t('backgrounds.errors.setInitial'),
    );
  } finally {
    setInitialBusy.value = false;
  }
}

onMounted(async () => {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);
  try {
    await reload();
    whenLiveSocketReady(() => {
      if (restorePreviewFromLiveState()) return;
      const initial = quickBackgrounds.value.find((b) => b.inicial === 'S');
      if (initial) projectInitialQuick(initial);
    });
  } catch {
    /* error ref preenchido em reload */
  }
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onDocumentKeydown);
});
</script>

<template>
  <section
    class="shrink-0"
    :style="{ width: PREVIEW_COLUMN_WIDTH }"
  >
    <p class="mb-1.5 text-[10px] uppercase tracking-wider text-lp-muted">
      {{ t('backgrounds.quick') }}
    </p>
    <p
      v-if="error"
      class="mb-2 text-xs text-rose-300"
    >
      {{ error }}
    </p>
    <div class="grid grid-cols-5 gap-2">
      <button
        v-for="(item, index) in visibleBackgrounds"
        :key="item.id ?? index"
        type="button"
        class="aspect-[4/3] w-full overflow-hidden rounded-md border border-lp-surface transition hover:border-lp-primary"
        @click="projectQuick(item)"
        @contextmenu="onContextMenu($event, item)"
      >
        <img
          :src="quickBackgroundDisplayUrl(item)"
          alt=""
          class="h-full w-full object-cover"
        >
      </button>
    </div>
  </section>

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
        :disabled="setInitialBusy || !canSetInitial(menuItem)"
        @click="setAsInitial"
      >
        {{ t('backgrounds.setInitial') }}
      </button>
    </li>
  </ul>
</template>
