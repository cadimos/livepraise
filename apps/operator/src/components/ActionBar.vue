<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import DropdownMenu from './DropdownMenu.vue';
import { useLiveSocket } from '../composables/useLiveSocket';
import { useRemoteSync } from '../composables/useRemoteSync';
import { usePreferences } from '../composables/usePreferences';
import {
  exportPlaylistFile,
  importPlaylistFile,
} from '../composables/usePlaylistTransfer';
import { useShortcuts } from '../composables/useShortcuts';
import { Music, NotebookPen, Presentation, RotateCw, Snowflake } from '@lucide/vue';

export type SettingsPanel = 'displays' | 'users' | 'appearance' | 'approvals' | 'errorLog' | 'shortcuts';

const emit = defineEmits<{
  openSettings: [panel: SettingsPanel];
  openNewSong: [];
  openNotepad: [];
  openAbout: [];
}>();

const { t } = useI18n();
const { frozen, toggleFrozen, sendAction } = useLiveSocket();
const { pendingApprovals } = useRemoteSync();
const { prefs, replaceChromeTabs } = usePreferences();
const { comboLabel } = useShortcuts();

const importInput = ref<HTMLInputElement | null>(null);
const playlistImportBusy = ref(false);

function onExportPlaylist(): void {
  if (!prefs.value.chromeTabs.length) {
    window.alert(t('actions.playlistExportEmpty'));
    return;
  }
  exportPlaylistFile(prefs.value.chromeTabs);
}

function onImportPlaylistClick(): void {
  importInput.value?.click();
}

async function onImportPlaylistFile(ev: Event): Promise<void> {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  playlistImportBusy.value = true;
  try {
    const raw = await file.text();
    const tabs = await importPlaylistFile(raw, t('tabs.missingSong'));
    replaceChromeTabs(tabs);
  } catch (e) {
    const message = e instanceof Error ? e.message : t('tabs.importError');
    window.alert(message);
  } finally {
    playlistImportBusy.value = false;
  }
}

const approvalBadge = computed(() => {
  const n = pendingApprovals.value.length;
  return n > 0 ? ` (${n})` : '';
});

const HELP_MANUAL_URL = 'https://github.com/cadimos/livepraise/wiki';
const HELP_ISSUES_URL = 'https://github.com/cadimos/livepraise/issues';

function clearScreen() {
  sendAction('removeConteudo', '');
}

function reloadApp() {
  window.location.reload();
}
</script>

<template>
  <nav
    class="flex flex-wrap items-center gap-1 border-b border-lp-action-bar/80 bg-lp-action-bar px-3 py-2 text-sm text-lp-text shadow-sm"
    aria-label="Ações rápidas"
  >
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium transition hover:bg-white/15"
      :class="frozen ? 'bg-white/20 ring-1 ring-white/40' : ''"
      :title="
        (frozen ? t('actions.unfreeze') : t('actions.freeze')) +
        (comboLabel('freeze_toggle') !== '—' ? ` (${comboLabel('freeze_toggle')})` : '')
      "
      @click="toggleFrozen()"
    >
      <Snowflake class="h-5 w-5 shrink-0" aria-hidden="true" />
      {{ frozen ? t('actions.unfreeze') : t('actions.freeze') }}
    </button>

    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium transition hover:bg-white/15"
      :title="t('actions.clearScreen')"
      :aria-label="t('actions.clearScreen')"
      @click="clearScreen"
    >
      <Presentation class="h-5 w-5 shrink-0" aria-hidden="true" />
      {{ t('actions.clearScreen') }}
    </button>

    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium transition hover:bg-white/15"
      :title="t('actions.newSong')"
      @click="emit('openNewSong')"
    >
      <Music class="h-5 w-5 shrink-0" aria-hidden="true" />
      {{ t('actions.newSong') }}
    </button>

    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium transition hover:bg-white/15"
      :title="t('actions.notepad')"
      @click="emit('openNotepad')"
    >
      <NotebookPen class="h-5 w-5 shrink-0" aria-hidden="true" />
      {{ t('actions.notepad') }}
    </button>

    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium transition hover:bg-white/15"
      :title="t('actions.reload')"
      @click="reloadApp"
    >
      <RotateCw class="h-5 w-5 shrink-0" aria-hidden="true" />
      {{ t('actions.reload') }}
    </button>

    <div class="ml-auto flex items-center gap-1">
      <input
        ref="importInput"
        type="file"
        accept="application/json,.json"
        class="hidden"
        @change="onImportPlaylistFile"
      />

      <DropdownMenu :label="t('actions.playlist')">
        <template #default="{ close }">
          <li role="none">
            <button
              type="button"
              role="menuitem"
              class="block w-full px-4 py-2 text-left hover:bg-lp-surface/80 disabled:opacity-50"
              :disabled="!prefs.chromeTabs.length"
              @click="
                onExportPlaylist();
                close();
              "
            >
              {{ t('actions.playlistExport') }}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              class="block w-full px-4 py-2 text-left hover:bg-lp-surface/80 disabled:opacity-50"
              :disabled="playlistImportBusy"
              @click="
                onImportPlaylistClick();
                close();
              "
            >
              {{
                playlistImportBusy
                  ? t('actions.playlistImporting')
                  : t('actions.playlistImport')
              }}
            </button>
          </li>
        </template>
      </DropdownMenu>

      <DropdownMenu :label="t('actions.settings')">
        <template #default="{ close }">
          <li role="none">
            <button
              type="button"
              role="menuitem"
              class="block w-full px-4 py-2 text-left hover:bg-lp-surface/80"
              @click="
                emit('openSettings', 'shortcuts');
                close();
              "
            >
              {{ t('actions.keyboardShortcuts') }}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              class="block w-full px-4 py-2 text-left hover:bg-lp-surface/80"
              @click="
                emit('openSettings', 'displays');
                close();
              "
            >
              {{ t('actions.projectorScreen') }}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              class="block w-full px-4 py-2 text-left hover:bg-lp-surface/80"
              @click="
                emit('openSettings', 'users');
                close();
              "
            >
              {{ t('actions.manageUsers') }}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              class="block w-full px-4 py-2 text-left hover:bg-lp-surface/80"
              @click="
                emit('openSettings', 'appearance');
                close();
              "
            >
              {{ t('actions.appearance') }}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              class="block w-full px-4 py-2 text-left hover:bg-lp-surface/80"
              @click="
                emit('openSettings', 'approvals');
                close();
              "
            >
              {{ t('actions.approvalQueue') }}{{ approvalBadge }}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              class="block w-full px-4 py-2 text-left hover:bg-lp-surface/80"
              @click="
                emit('openSettings', 'errorLog');
                close();
              "
            >
              {{ t('actions.errorLog') }}
            </button>
          </li>
        </template>
      </DropdownMenu>

      <DropdownMenu :label="t('actions.help')">
        <template #default="{ close }">
          <li role="none">
            <button
              type="button"
              role="menuitem"
              class="block w-full px-4 py-2 text-left hover:bg-lp-surface/80"
              @click="
                emit('openAbout');
                close();
              "
            >
              {{ t('actions.helpAbout') }}
              <span class="text-lp-muted"> ({{ t('actions.helpAboutShortcut') }})</span>
            </button>
          </li>
          <li role="separator" class="my-1 border-t border-lp-surface" />
          <li role="none">
            <a
              role="menuitem"
              :href="HELP_MANUAL_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="block px-4 py-2 hover:bg-lp-surface/80"
            >
              {{ t('actions.helpManual') }}
            </a>
          </li>
          <li role="none">
            <a
              role="menuitem"
              :href="HELP_ISSUES_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="block px-4 py-2 hover:bg-lp-surface/80"
            >
              {{ t('actions.helpReport') }}
            </a>
          </li>
        </template>
      </DropdownMenu>
    </div>
  </nav>
</template>
