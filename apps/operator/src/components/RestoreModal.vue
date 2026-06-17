<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { X } from '@lucide/vue';
import {
  postRestoreApply,
  postRestoreInspect,
  postRestoreOverwriteCheck,
  BackupApiError,
  type BackupGroupId,
} from '../utils/backup-restore-api';
import { applyOperatorUiFiles } from '../utils/operator-ui-export';
import { useBackupRestore } from '../composables/useBackupRestore';
import { useDialogA11y } from '../composables/useDialogA11y';

const open = defineModel<boolean>('open', { default: false });

type Step = 'pick' | 'select' | 'confirm' | 'progress' | 'done';

const { t } = useI18n();
const { setClientBackupMode } = useBackupRestore();
const panelRef = useTemplateRef<HTMLElement>('panel');

const step = ref<Step>('pick');
const errorMessage = ref('');
const tempZipPath = ref('');
const manifestSummary = ref('');
const presentGroups = ref<BackupGroupId[]>([]);
const absentGroups = ref<BackupGroupId[]>([]);
const allGroups = ref<BackupGroupId[]>([]);
const selected = ref<Set<BackupGroupId>>(new Set());
const overwriteAck = ref(false);
const overwriteGroups = ref<BackupGroupId[]>([]);
const progressLabel = ref('');
const restoringGroups = ref<BackupGroupId[]>([]);
const currentGroupIndex = ref(0);
const needsRelogin = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
let progressTimer: ReturnType<typeof setInterval> | null = null;

function reset(): void {
  step.value = 'pick';
  errorMessage.value = '';
  tempZipPath.value = '';
  presentGroups.value = [];
  absentGroups.value = [];
  allGroups.value = [];
  selected.value = new Set();
  overwriteAck.value = false;
  overwriteGroups.value = [];
  stopGroupProgress();
}

function onClose(): void {
  if (step.value === 'progress') return;
  open.value = false;
  reset();
}

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

function isPresent(id: BackupGroupId): boolean {
  return presentGroups.value.includes(id);
}

function toggleSelected(id: BackupGroupId, checked: boolean): void {
  const next = new Set(selected.value);
  if (checked) next.add(id);
  else next.delete(id);
  selected.value = next;
}

const restoringGroupText = computed(() => {
  const groups = restoringGroups.value;
  if (groups.length === 0) return progressLabel.value;
  const id = groups[currentGroupIndex.value] ?? groups[0];
  return t('settings.backup.restoringGroup', {
    current: currentGroupIndex.value + 1,
    total: groups.length,
    group: groupLabel(id),
  });
});

const restoringProgress = computed(() => {
  const total = restoringGroups.value.length;
  if (total === 0) return 0;
  return Math.round(((currentGroupIndex.value + 1) / total) * 100);
});

function startGroupProgress(groups: BackupGroupId[]): void {
  stopGroupProgress();
  restoringGroups.value = groups;
  currentGroupIndex.value = 0;
  progressLabel.value = t('settings.backup.restoring');
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
  restoringGroups.value = [];
  currentGroupIndex.value = 0;
  progressLabel.value = '';
}

async function onFilePicked(ev: Event): Promise<void> {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  errorMessage.value = '';
  try {
    const result = await postRestoreInspect(file);
    tempZipPath.value = result.tempZipPath;
    presentGroups.value = result.presentGroups;
    absentGroups.value = result.absentGroups as BackupGroupId[];
    allGroups.value = result.allGroups as BackupGroupId[];
    selected.value = new Set(result.presentGroups);
    const d = new Date(result.manifest.createdAt);
    manifestSummary.value = t('settings.backup.manifestSummary', {
      date: d.toLocaleString(),
      appVersion: result.manifest.appVersion,
      groupCount: result.presentGroups.length,
    });
    step.value = 'select';
  } catch (e) {
    errorMessage.value =
      e instanceof BackupApiError && e.code === 'invalid_zip'
        ? t('settings.backup.errors.invalidZip')
        : e instanceof Error
          ? e.message
          : t('settings.backup.errors.failed');
  }
}

async function onContinue(): Promise<void> {
  const groups = [...selected.value];
  if (groups.length === 0) {
    errorMessage.value = t('settings.backup.errors.noGroupsSelected');
    return;
  }
  try {
    overwriteGroups.value = await postRestoreOverwriteCheck(groups);
    if (overwriteGroups.value.length > 0) {
      step.value = 'confirm';
      overwriteAck.value = false;
      return;
    }
    await runRestore(false);
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : t('settings.backup.errors.failed');
  }
}

const overwriteList = computed(() =>
  overwriteGroups.value.map((g) => groupLabel(g)).join(', '),
);

async function runRestore(confirmOverwrite: boolean): Promise<void> {
  step.value = 'progress';
  setClientBackupMode(true);
  const groups = [...selected.value];
  startGroupProgress(groups);
  try {
    const result = await postRestoreApply(
      tempZipPath.value,
      groups,
      confirmOverwrite,
    );
    if (result.operatorUiFiles.length > 0) {
      applyOperatorUiFiles(result.operatorUiFiles);
    }
    needsRelogin.value = result.needsRelogin;
    step.value = 'done';
  } catch (e) {
    step.value = 'select';
    if (e instanceof BackupApiError) {
      const map: Record<string, string> = {
        migration_newer: t('settings.backup.errors.migrationNewer'),
        confirm_required: t('settings.backup.errors.confirmRequired'),
        invalid_zip: t('settings.backup.errors.invalidZip'),
      };
      errorMessage.value = map[e.code] ?? e.message;
    } else {
      errorMessage.value =
        e instanceof Error ? e.message : t('settings.backup.errors.failed');
    }
  } finally {
    stopGroupProgress();
    setClientBackupMode(false);
  }
}

function onConfirmRestore(): void {
  if (!overwriteAck.value) return;
  void runRestore(true);
}

function onRestart(): void {
  window.location.reload();
}

useDialogA11y(open, panelRef, {
  onClose,
  canClose: () => step.value !== 'progress',
  initialFocus: () => {
    if (step.value === 'pick') {
      return panelRef.value?.querySelector<HTMLElement>('button') ?? undefined;
    }
    return panelRef.value?.querySelector<HTMLElement>('input[type="checkbox"]') ?? undefined;
  },
});
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="'restore-modal-title'"
  >
    <div
      ref="panel"
      class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-lp-surface bg-lp-background shadow-xl"
    >
      <header class="flex items-center justify-between border-b border-lp-surface px-4 py-3">
        <h2
          id="restore-modal-title"
          class="text-sm font-semibold text-lp-text"
        >
          {{ t('settings.backup.restoreModalTitle') }}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-lp-muted hover:bg-lp-surface"
          :aria-label="t('settings.backup.close')"
          :disabled="step === 'progress'"
          @click="onClose"
        >
          <X
            class="h-4 w-4"
            aria-hidden="true"
          />
        </button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto p-4">
        <template v-if="step === 'pick'">
          <p class="text-sm text-lp-muted">
            {{ t('settings.backup.restoreIntro') }}
          </p>
          <p class="mt-2 text-xs text-lp-muted">
            {{ t('settings.backup.restorePrivacyNote') }}
          </p>
          <input
            ref="fileInput"
            type="file"
            accept=".zip,application/zip"
            class="hidden"
            @change="onFilePicked"
          >
          <button
            type="button"
            class="mt-4 rounded-lg bg-lp-primary px-4 py-2 text-sm font-medium text-white"
            @click="fileInput?.click()"
          >
            {{ t('settings.backup.chooseZip') }}
          </button>
        </template>

        <template v-else-if="step === 'select'">
          <p class="text-xs text-lp-muted">
            {{ manifestSummary }}
          </p>
          <ul class="mt-4 space-y-2">
            <li
              v-for="id in allGroups"
              :key="id"
              class="flex items-start gap-2 rounded border border-lp-surface px-3 py-2"
              :class="!isPresent(id) ? 'cursor-not-allowed opacity-50' : ''"
            >
              <input
                :id="`restore-${id}`"
                type="checkbox"
                class="mt-1"
                :checked="selected.has(id)"
                :disabled="!isPresent(id)"
                :aria-disabled="!isPresent(id) || undefined"
                :aria-describedby="!isPresent(id) ? `restore-${id}-hint` : undefined"
                @change="
                  toggleSelected(id, ($event.target as HTMLInputElement).checked)
                "
              >
              <label
                :for="`restore-${id}`"
                class="flex-1"
              >
                <span class="font-medium text-lp-text">{{ groupLabel(id) }}</span>
                <span
                  v-if="!isPresent(id)"
                  :id="`restore-${id}-hint`"
                  class="mt-0.5 block text-xs text-lp-muted"
                >
                  {{ t('settings.backup.groupNotInBackup') }}
                </span>
              </label>
            </li>
          </ul>
          <div
            v-if="selected.has('database')"
            class="mt-4 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
          >
            {{ t('settings.backup.databaseReloginWarning') }}
          </div>
        </template>

        <template v-else-if="step === 'confirm'">
          <div
            class="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
          >
            <strong>{{ t('settings.backup.overwriteTitle') }}</strong>
            <p class="mt-1">
              {{
                t('settings.backup.overwriteBody', {
                  groups: overwriteList,
                })
              }}
            </p>
          </div>
          <label class="mt-4 flex items-start gap-2 text-sm">
            <input
              v-model="overwriteAck"
              type="checkbox"
              class="mt-1"
            >
            {{ t('settings.backup.overwriteAcknowledge') }}
          </label>
        </template>

        <template v-else-if="step === 'progress'">
          <div
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="restoringProgress"
            :aria-valuetext="restoringGroupText"
          >
            <p class="text-sm text-lp-muted">
              {{ restoringGroupText }}
            </p>
            <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-lp-surface">
              <div
                class="h-full bg-lp-primary transition-all duration-300 motion-reduce:transition-none"
                :style="{ width: `${restoringProgress}%` }"
              />
            </div>
          </div>
        </template>

        <template v-else-if="step === 'done'">
          <div
            class="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100"
          >
            <strong>{{ t('settings.backup.restoreSuccessTitle') }}</strong>
            <p>{{ t('settings.backup.restoreSuccessMessage') }}</p>
            <p
              v-if="needsRelogin"
              class="mt-2"
            >
              {{ t('settings.backup.reloginRequired') }}
            </p>
          </div>
          <button
            v-if="needsRelogin"
            type="button"
            class="mt-4 rounded-lg bg-lp-primary px-4 py-2 text-sm font-medium text-white"
            @click="onRestart"
          >
            {{ t('settings.backup.restartApp') }}
          </button>
        </template>

        <p
          v-if="errorMessage"
          role="alert"
          class="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
        >
          {{ errorMessage }}
        </p>
      </div>

      <footer
        v-if="step !== 'pick' && step !== 'progress'"
        class="flex justify-end gap-2 border-t border-lp-surface px-4 py-3"
      >
        <button
          v-if="step === 'select'"
          type="button"
          class="rounded-lg border border-lp-surface px-4 py-2 text-sm text-lp-muted"
          @click="reset()"
        >
          {{ t('settings.backup.back') }}
        </button>
        <button
          v-if="step === 'confirm'"
          type="button"
          class="rounded-lg border border-lp-surface px-4 py-2 text-sm text-lp-muted"
          @click="step = 'select'"
        >
          {{ t('settings.backup.back') }}
        </button>
        <button
          v-if="step === 'select'"
          type="button"
          class="rounded-lg bg-lp-primary px-4 py-2 text-sm font-medium text-white"
          @click="onContinue"
        >
          {{ t('settings.backup.continue') }}
        </button>
        <button
          v-if="step === 'confirm'"
          type="button"
          class="rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          :disabled="!overwriteAck"
          @click="onConfirmRestore"
        >
          {{ t('settings.backup.overwriteConfirm') }}
        </button>
        <button
          v-if="step === 'done'"
          type="button"
          class="rounded-lg border border-lp-surface px-4 py-2 text-sm text-lp-muted"
          @click="onClose"
        >
          {{ t('settings.backup.close') }}
        </button>
      </footer>
    </div>
  </div>
</template>
