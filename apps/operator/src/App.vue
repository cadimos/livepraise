<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ActionBar, { type SettingsPanel } from './components/ActionBar.vue';
import ChromeTabs from './components/ChromeTabs.vue';
import ChromeTabPanel from './components/ChromeTabPanel.vue';
import NewSongModal from './components/NewSongModal.vue';
import NotepadModal from './components/NotepadModal.vue';
import AboutModal from './components/AboutModal.vue';
import ApprovalQueue from './components/ApprovalQueue.vue';
import SettingsModal from './components/SettingsModal.vue';
import MultiOutputPreviewColumn from './components/MultiOutputPreviewColumn.vue';
import QuickBackgroundsStrip from './components/QuickBackgroundsStrip.vue';
import { PREVIEW_COLUMN_WIDTH } from './constants/layout';
import AppUpdateBanner from './components/AppUpdateBanner.vue';
import StatusBar from './components/StatusBar.vue';
import WorshipPanel from './components/panels/WorshipPanel.vue';
import BiblePanel from './components/panels/BiblePanel.vue';
import ImagesPanel from './components/panels/ImagesPanel.vue';
import VideosPanel from './components/panels/VideosPanel.vue';
import DisplaysPanel from './components/panels/DisplaysPanel.vue';
import UsersPanel from './components/panels/UsersPanel.vue';
import AppearancePanel from './components/panels/AppearancePanel.vue';
import ApprovalsPanel from './components/panels/ApprovalsPanel.vue';
import ErrorLogPanel from './components/panels/ErrorLogPanel.vue';
import ShortcutsPanel from './components/panels/ShortcutsPanel.vue';
import WorshipSettingsPanel from './components/panels/WorshipSettingsPanel.vue';
import BibleSettingsPanel from './components/panels/BibleSettingsPanel.vue';
import BackupRestorePanel from './components/panels/BackupRestorePanel.vue';
import ProjectionTypographyPanel from './components/panels/ProjectionTypographyPanel.vue';
import QueueSyncPanel from './components/panels/QueueSyncPanel.vue';
import { useBackupRestore } from './composables/useBackupRestore';
import ServiceTimerModal from './components/ServiceTimerModal.vue';
import FooterAlertModal from './components/FooterAlertModal.vue';
import { usePreferences, type OperatorPanel } from './composables/usePreferences';
import { useFooterAlert } from './composables/useFooterAlert';
import { connectLiveSocket, useLiveSocket } from './composables/useLiveSocket';
import { startProjectionTypographySync } from './composables/useProjectionTypographySync';
import { startOperatorQueueSync } from './composables/useOperatorQueueSync';
import { useShortcuts } from './composables/useShortcuts';
import { useLocale } from './composables/useLocale';

const { t } = useI18n();
const { prefs, setPanel } = usePreferences();
const { refreshLocales } = useLocale();
const { matches: matchesShortcut, shouldIgnoreGlobalShortcuts } = useShortcuts();
const { backupMode } = useBackupRestore();
const { toggleFrozen, sendAction } = useLiveSocket();
const { previewPlayback } = useFooterAlert();

const previewHtml = ref('');
const previewBg = ref('');
const settingsPanel = ref<SettingsPanel | null>(null);
const newSongOpen = ref(false);
const editSongId = ref<number | null>(null);

function openNewSong() {
  editSongId.value = null;
  newSongOpen.value = true;
}

function openEditSong(songId: number) {
  editSongId.value = songId;
  newSongOpen.value = true;
}
const notepadOpen = ref(false);
const aboutOpen = ref(false);
const serviceTimerOpen = ref(false);
const footerAlertOpen = ref(false);

function toggleAbout(): void {
  aboutOpen.value = !aboutOpen.value;
}

function onGlobalKeydown(event: KeyboardEvent): void {
  if (shouldIgnoreGlobalShortcuts()) return;

  if (matchesShortcut(event, 'about')) {
    event.preventDefault();
    toggleAbout();
    return;
  }
  if (matchesShortcut(event, 'clear_screen')) {
    event.preventDefault();
    sendAction('removeConteudo', '');
    return;
  }
  if (matchesShortcut(event, 'freeze_toggle')) {
    event.preventDefault();
    toggleFrozen();
    return;
  }
  if (matchesShortcut(event, 'reload_data')) {
    event.preventDefault();
    window.location.reload();
  }
}

const settingsTitle = computed(() => {
  switch (settingsPanel.value) {
    case 'displays':
      return t('actions.projectorScreen');
    case 'users':
      return t('settings.users.title');
    case 'appearance':
      return t('settings.appearance.title');
    case 'projectionTypography':
      return t('settings.projectionTypography.title');
    case 'queueSync':
      return t('settings.queueSync.title');
    case 'worship':
      return t('settings.worship.title');
    case 'bible':
      return t('settings.bible.title');
    case 'approvals':
      return t('settings.approvals.title');
    case 'errorLog':
      return t('settings.errorLog.title');
    case 'shortcuts':
      return t('settings.shortcuts.title');
    case 'backupRestore':
      return t('settings.backup.panelTitle');
    default:
      return '';
  }
});

const settingsOpen = computed({
  get: () => settingsPanel.value !== null,
  set: (open: boolean) => {
    if (!open) settingsPanel.value = null;
  },
});

function openSettings(panel: SettingsPanel) {
  settingsPanel.value = panel;
}

const panels = computed(() => {
  const items: { id: OperatorPanel; label: string }[] = [
    { id: 'imagens', label: t('panels.images') },
    { id: 'videos', label: t('panels.videos') },
    { id: 'louvor', label: t('panels.worship') },
    { id: 'biblia', label: t('panels.bible') },
  ];
  return items;
});

function onPreview(html: string) {
  previewHtml.value = html;
}

function onPreviewBg(url: string) {
  previewBg.value = url;
}

function onQuickBackground(url: string) {
  previewBg.value = url;
  previewHtml.value = '';
}

onMounted(() => {
  connectLiveSocket();
  startOperatorQueueSync();
  startProjectionTypographySync();
  void refreshLocales();
  window.addEventListener('keydown', onGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-lp-background font-lp text-lp-text">
    <div
      v-if="backupMode"
      class="border-b border-amber-500/40 bg-amber-950/50 px-4 py-2 text-center text-sm text-amber-100"
      role="status"
    >
      {{ t('settings.backup.globalBanner') }}
    </div>
    <AppUpdateBanner />
    <ActionBar
      @open-settings="openSettings"
      @open-new-song="openNewSong"
      @open-notepad="notepadOpen = true"
      @open-about="aboutOpen = true"
      @open-service-timer="serviceTimerOpen = true"
      @open-footer-alert="footerAlertOpen = true"
    />
    <ApprovalQueue />

    <div class="flex min-h-0 flex-1 gap-3 p-3">
      <section class="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-lp-surface bg-lp-surface/40">
        <nav class="flex shrink-0 border-b border-lp-surface">
          <button
            v-for="panel in panels"
            :key="panel.id"
            type="button"
            class="px-4 py-2.5 text-sm font-medium transition"
            :class="
              prefs.activePanel === panel.id
                ? 'border-b-2 border-lp-primary bg-lp-surface/60 text-lp-text'
                : 'text-lp-muted hover:bg-lp-surface/30 hover:text-lp-text'
            "
            @click="setPanel(panel.id)"
          >
            {{ panel.label }}
          </button>
        </nav>

        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          <ImagesPanel
            v-if="prefs.activePanel === 'imagens'"
            @preview-bg="onPreviewBg"
          />
          <VideosPanel
            v-else-if="prefs.activePanel === 'videos'"
            @preview-bg="onPreviewBg"
          />
          <WorshipPanel
            v-else-if="prefs.activePanel === 'louvor'"
            @preview="onPreview"
            @edit-song="openEditSong"
          />
          <BiblePanel
            v-else
            @preview="onPreview"
          />
        </div>
      </section>

      <aside
        class="flex min-h-0 shrink-0 flex-col gap-2"
        :style="{ width: PREVIEW_COLUMN_WIDTH }"
      >
        <QuickBackgroundsStrip
          @preview-bg="onQuickBackground"
          @clear-preview="previewHtml = ''"
        />
        <MultiOutputPreviewColumn :footer-alert-preview="previewPlayback" />
      </aside>
    </div>

    <ChromeTabs />
    <ChromeTabPanel
      @preview="onPreview"
      @preview-bg="onPreviewBg"
    />
    <StatusBar @open-displays="openSettings('displays')" />

    <NewSongModal
      v-model:open="newSongOpen"
      v-model:edit-song-id="editSongId"
    />
    <NotepadModal
      v-model:open="notepadOpen"
      @preview="onPreview"
    />
    <AboutModal v-model:open="aboutOpen" />
    <ServiceTimerModal v-model:open="serviceTimerOpen" />
    <FooterAlertModal v-model:open="footerAlertOpen" />

    <SettingsModal
      v-model:open="settingsOpen"
      :title="settingsTitle"
      :wide="settingsPanel === 'shortcuts' || settingsPanel === 'projectionTypography'"
    >
      <DisplaysPanel v-if="settingsPanel === 'displays'" />
      <UsersPanel v-else-if="settingsPanel === 'users'" />
      <WorshipSettingsPanel v-else-if="settingsPanel === 'worship'" />
      <BibleSettingsPanel v-else-if="settingsPanel === 'bible'" />
      <AppearancePanel v-else-if="settingsPanel === 'appearance'" />
      <ProjectionTypographyPanel v-else-if="settingsPanel === 'projectionTypography'" />
      <QueueSyncPanel v-else-if="settingsPanel === 'queueSync'" />
      <ApprovalsPanel v-else-if="settingsPanel === 'approvals'" />
      <ErrorLogPanel v-else-if="settingsPanel === 'errorLog'" />
      <BackupRestorePanel v-else-if="settingsPanel === 'backupRestore'" />
      <ShortcutsPanel v-else-if="settingsPanel === 'shortcuts'" />
    </SettingsModal>
  </div>
</template>
