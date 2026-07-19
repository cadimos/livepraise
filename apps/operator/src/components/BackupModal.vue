<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { X } from '@lucide/vue';
import {
  postBackupCreate,
  BackupApiError,
  type BackupGroupId,
} from '../utils/backup-restore-api';
import { collectOperatorUiFiles } from '../utils/operator-ui-export';
import { useBackupRestore } from '../composables/useBackupRestore';
import { useDialogA11y } from '../composables/useDialogA11y';

const open = defineModel<boolean>('open', { default: false });

const { t } = useI18n();
const { setClientBackupMode } = useBackupRestore();
const panelRef = useTemplateRef<HTMLElement>('panel');

type UiState = 'idle' | 'generating' | 'success' | 'error';

const ALL_GROUPS: BackupGroupId[] = [
  'database',
  'media_images',
  'media_videos',
  'themes',
  'locales',
  'displays',
  'projection_state',
  'biblias',
  'error_log',
  'operator_ui',
];

const selected = ref<Set<BackupGroupId>>(
  new Set(ALL_GROUPS.filter((g) => g !== 'error_log')),
);
const uiState = ref<UiState>('idle');
const errorMessage = ref('');
const successDetail = ref('');
const generatingGroups = ref<BackupGroupId[]>([]);
const currentGroupIndex = ref(0);
let progressTimer: ReturnType<typeof setInterval> | null = null;

function toggleGroup(id: BackupGroupId, checked: boolean): void {
  const next = new Set(selected.value);
  if (checked) next.add(id);
  else next.delete(id);
  selected.value = next;
}

function selectAll(): void {
  selected.value = new Set(ALL_GROUPS);
}

function selectNone(): void {
  selected.value = new Set();
}

const showUnencryptedWarning = computed(
  () => selected.value.has('database'),
);

const canGenerate = computed(
  () => selected.value.size > 0 && uiState.value !== 'generating',
);

function groupLabel(id: BackupGroupId): string {
  const camel =
    id === 'media_images'
      ? 'mediaImages'
      : id === 'media_videos'
        ? 'mediaVideos'
        : id === 'projection_state'
          ? 'projectionState'
          : id === 'error_log'
            ? 'errorLog'
            : id === 'operator_ui'
              ? 'operatorUi'
              : id;
  return t(`settings.backup.groups.${camel}`);
}

function groupHint(id: BackupGroupId): string | null {
  const hints: Partial<Record<BackupGroupId, string>> = {
    database: t('settings.backup.groups.databaseHint'),
    media_images: t('settings.backup.groups.mediaImagesHint'),
    media_videos: t('settings.backup.groups.mediaVideosHint'),
    error_log: t('settings.backup.groups.errorLogHint'),
    operator_ui: t('settings.backup.groups.operatorUiHint'),
  };
  return hints[id] ?? null;
}

function mapError(err: unknown): string {
  if (err instanceof BackupApiError) {
    const map: Record<string, string> = {
      disk_full: t('settings.backup.errors.diskFull'),
      permission_denied: t('settings.backup.errors.permissionDenied'),
      invalid_groups: t('settings.backup.errors.noGroupsSelected'),
    };
    return map[err.code] ?? err.message;
  }
  return err instanceof Error ? err.message : t('settings.backup.errors.failed');
}

const generatingGroupText = computed(() => {
  const groups = generatingGroups.value;
  if (groups.length === 0) return t('settings.backup.generating');
  const id = groups[currentGroupIndex.value] ?? groups[0];
  return t('settings.backup.generatingGroup', { group: groupLabel(id) });
});

const generatingProgress = computed(() => {
  const total = generatingGroups.value.length;
  if (total === 0) return 0;
  return Math.round(((currentGroupIndex.value + 1) / total) * 100);
});

function startGroupProgress(groups: BackupGroupId[]): void {
  stopGroupProgress();
  generatingGroups.value = groups;
  currentGroupIndex.value = 0;
  if (groups.length <= 1) return;
  progressTimer = setInterval(() => {
    if (currentGroupIndex.value < groups.length - 1) {
      currentGroupIndex.value += 1;
    }
  }, 600);
}

function stopGroupProgress(): void {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
  generatingGroups.value = [];
  currentGroupIndex.value = 0;
}

async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function onGenerate(): Promise<void> {
  if (!canGenerate.value) return;
  uiState.value = 'generating';
  errorMessage.value = '';
  setClientBackupMode(true);
  const groups = [...selected.value];
  startGroupProgress(groups);
  try {
    const operatorUiFiles = groups.includes('operator_ui')
      ? collectOperatorUiFiles()
      : [];
    const blob = await postBackupCreate(groups, operatorUiFiles);
    const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
    await downloadBlob(blob, `livepraise-backup-${Date.now()}.zip`);
    successDetail.value = t('settings.backup.successSize', {
      size: `${sizeMb} MB`,
      groups: groups.join(', '),
    });
    uiState.value = 'success';
  } catch (e) {
    errorMessage.value = mapError(e);
    uiState.value = 'error';
  } finally {
    stopGroupProgress();
    setClientBackupMode(false);
  }
}

function onClose(): void {
  if (uiState.value === 'generating') return;
  open.value = false;
  uiState.value = 'idle';
  errorMessage.value = '';
}

useDialogA11y(open, panelRef, {
  onClose,
  canClose: () => uiState.value !== 'generating',
  initialFocus: () =>
    panelRef.value?.querySelector<HTMLElement>('input[type="checkbox"]') ?? undefined,
});
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="'backup-modal-title'"
  >
    <div
      ref="panel"
      class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-lp-surface bg-lp-background shadow-xl"
    >
      <header class="flex items-center justify-between border-b border-lp-surface px-4 py-3">
        <h2
          id="backup-modal-title"
          class="text-sm font-semibold text-lp-text"
        >
          {{ t('settings.backup.backupModalTitle') }}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-lp-muted hover:bg-lp-surface"
          :aria-label="t('settings.backup.close')"
          :disabled="uiState === 'generating'"
          @click="onClose"
        >
          <X
            class="h-4 w-4"
            aria-hidden="true"
          />
        </button>
      </header>
      <div class="min-h-0 flex-1 overflow-y-auto p-4">
        <p class="mb-4 text-sm text-lp-muted">
          {{ t('settings.backup.backupIntro') }}
        </p>

        <div
          class="mb-4 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
        >
          <strong class="block">{{ t('settings.backup.privacyTitle') }}</strong>
          <p class="mt-1">
            {{ t('settings.backup.privacyBody') }}
          </p>
          <p
            v-if="showUnencryptedWarning"
            class="mt-2 text-amber-200"
          >
            {{ t('settings.backup.privacyUnencryptedWarning') }}
          </p>
        </div>

        <div class="mb-2 flex gap-3 text-xs text-lp-primary">
          <button
            type="button"
            class="hover:underline"
            @click="selectAll"
          >
            {{ t('settings.backup.selectAll') }}
          </button>
          <button
            type="button"
            class="hover:underline"
            @click="selectNone"
          >
            {{ t('settings.backup.selectNone') }}
          </button>
        </div>

        <ul class="mb-4 space-y-2">
          <li
            v-for="id in ALL_GROUPS"
            :key="id"
            class="flex items-start gap-2 rounded border border-lp-surface px-3 py-2"
          >
            <input
              :id="`backup-${id}`"
              type="checkbox"
              class="mt-1"
              :checked="selected.has(id)"
              :disabled="uiState === 'generating'"
              @change="toggleGroup(id, ($event.target as HTMLInputElement).checked)"
            >
            <label
              :for="`backup-${id}`"
              class="flex-1 cursor-pointer"
            >
              <span class="font-medium text-lp-text">{{ groupLabel(id) }}</span>
              <span
                v-if="groupHint(id)"
                class="mt-0.5 block text-xs text-lp-muted"
              >
                {{ groupHint(id) }}
              </span>
            </label>
          </li>
        </ul>

        <div
          v-if="uiState === 'success'"
          class="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100"
        >
          <strong>{{ t('settings.backup.successTitle') }}</strong>
          <p>{{ t('settings.backup.successMessage') }}</p>
          <p class="text-xs">
            {{ successDetail }}
          </p>
        </div>

        <p
          v-if="uiState === 'error'"
          role="alert"
          class="mb-4 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
        >
          {{ errorMessage }}
        </p>

        <div
          v-if="uiState === 'generating'"
          class="mb-4"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="generatingProgress"
          :aria-valuetext="generatingGroupText"
        >
          <p class="text-sm text-lp-muted">
            {{ generatingGroupText }}
          </p>
          <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-lp-surface">
            <div
              class="h-full bg-lp-primary transition-all duration-300 motion-reduce:transition-none"
              :style="{ width: `${generatingProgress}%` }"
            />
          </div>
        </div>
      </div>

      <footer class="flex justify-end gap-2 border-t border-lp-surface px-4 py-3">
        <button
          type="button"
          class="rounded-lg border border-lp-surface px-4 py-2 text-sm text-lp-muted"
          :disabled="uiState === 'generating'"
          @click="onClose"
        >
          {{ t('settings.backup.close') }}
        </button>
        <button
          type="button"
          class="rounded-lg bg-lp-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          :disabled="!canGenerate"
          @click="onGenerate"
        >
          {{ t('settings.backup.generate') }}
        </button>
      </footer>
    </div>
  </div>
</template>
