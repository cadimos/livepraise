<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePreferences, type ChromeTabVerse } from '../composables/usePreferences';
import { useLiveSocket } from '../composables/useLiveSocket';
import { useShortcuts } from '../composables/useShortcuts';
import { buildMusicHtml, buildMusicStageHtml } from '../utils/projection';

const emit = defineEmits<{
  preview: [html: string];
}>();

const { t } = useI18n();
const { prefs } = usePreferences();
const { sendAction } = useLiveSocket();
const { matches: matchesShortcut } = useShortcuts();

const activeTab = computed(() =>
  prefs.value.chromeTabs.find((tab) => tab.id === prefs.value.activeTabId) ?? null,
);

const activeVerses = computed(() => activeTab.value?.verses ?? []);

function projectVerse(verse: ChromeTabVerse, index: number): void {
  const tab = activeTab.value;
  if (!tab) return;

  const footer = tab.artist
    ? `${tab.songName ?? tab.label} (${tab.artist})`
    : (tab.songName ?? tab.label);
  const html = buildMusicHtml(verse.text, footer);
  emit('preview', html);
  sendAction('viewMusica', html);

  const nextVerse = activeVerses.value[index + 1];
  const stageHtml = buildMusicStageHtml(verse.text, nextVerse?.text ?? null, footer, true);
  sendAction('viewMusicaRetorno', stageHtml);
}

function onKeydown(event: KeyboardEvent): void {
  if (!activeVerses.value.length) return;
  const target = event.target as HTMLElement | null;
  if (target?.matches('input, textarea, select')) return;

  const prev = matchesShortcut(event, 'stanza_prev');
  const next = matchesShortcut(event, 'stanza_next');
  if (!prev && !next) return;

  const currentIdx = activeVerses.value.findIndex((v) => v.active);
  let nextIdx = currentIdx < 0 ? 0 : currentIdx;

  if (next) {
    nextIdx = Math.min(activeVerses.value.length - 1, nextIdx + 1);
  } else {
    nextIdx = Math.max(0, nextIdx - 1);
  }

  if (nextIdx === currentIdx && currentIdx >= 0) return;

  const tab = activeTab.value;
  if (!tab) return;

  tab.verses.forEach((v, i) => {
    v.active = i === nextIdx;
  });

  event.preventDefault();
  projectVerse(activeVerses.value[nextIdx], nextIdx);
}

function onVerseClick(verse: ChromeTabVerse, index: number): void {
  const tab = activeTab.value;
  if (!tab) return;
  tab.verses.forEach((v, i) => {
    v.active = i === index;
  });
  projectVerse(verse, index);
}

function onVerseKeydown(event: KeyboardEvent, verse: ChromeTabVerse, index: number): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  onVerseClick(verse, index);
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <section
    v-if="activeTab && activeVerses.length"
    class="shrink-0 border-t border-lp-surface bg-lp-background/80"
  >
    <div class="px-3 pb-2 pt-1">
      <p
        v-if="activeTab.missing"
        class="mb-2 rounded border border-amber-500/50 bg-amber-950/40 px-2 py-1.5 text-xs text-amber-100"
        role="status"
      >
        {{ activeTab.missingMessage ?? t('tabs.missingSong') }}
      </p>
      <ul
        class="playlist-verses-track flex flex-nowrap items-stretch gap-2 overflow-x-auto overflow-y-hidden pb-4"
      >
        <li
          v-for="(verse, index) in activeVerses"
          :key="verse.id"
          role="button"
          tabindex="0"
          class="playlist-verse-tile w-[10rem] shrink-0 cursor-pointer rounded-md border-2 text-sm transition"
          :class="
            verse.active
              ? 'border-lp-primary bg-lp-primary/20 text-lp-text shadow-[0_3px_0_0_var(--lp-color-primary)]'
              : 'border-lp-surface bg-lp-surface text-lp-muted hover:border-lp-primary/40 hover:text-lp-text'
          "
          :aria-pressed="verse.active"
          @click="onVerseClick(verse, index)"
          @keydown="onVerseKeydown($event, verse, index)"
        >
          <pre class="playlist-verse-text whitespace-pre-wrap p-2 font-sans text-sm leading-snug">{{ verse.text }}</pre>
        </li>
      </ul>
    </div>
  </section>
  <p
    v-else-if="activeTab && !activeVerses.length"
    class="shrink-0 border-t border-lp-surface px-3 py-2 text-xs text-lp-muted"
  >
    {{ t('tabs.noVerses') }}
  </p>
</template>
