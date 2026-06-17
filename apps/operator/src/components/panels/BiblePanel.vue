<script setup lang="ts">
import { computed, ref, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  fetchJson,
  type BibleEntry,
  type BibleBook,
  type BibleVerse,
} from '../../composables/useApi';
import { usePreferences } from '../../composables/usePreferences';
import { useLiveSocket } from '../../composables/useLiveSocket';
import { useShortcuts } from '../../composables/useShortcuts';
import { buildBibleHtml, buildBibleStageHtml } from '../../utils/projection';
import {
  parseBibleReference,
  findBookByReference,
  findBookFallbackForReference,
} from '@shared/bible-reference';
import { computeNextVerseIndex } from '@shared/bible-navigation';
import { useQueueDrag } from '../../composables/useQueueDrag';

const emit = defineEmits<{
  preview: [html: string];
}>();

const { t } = useI18n();
const {
  prefs,
  setBibleFile,
  setBibleSearchQuery,
  setBibleSelection,
  pushBibleSearchHistory,
} = usePreferences();
const { onDragStart } = useQueueDrag();
const { sendAction } = useLiveSocket();
const { matches: matchesShortcut } = useShortcuts();

const REFERENCE_DEBOUNCE_MS = 500;

const bibles = ref<BibleEntry[]>([]);
const books = ref<BibleBook[]>([]);
const selectedBook = ref<BibleBook | null>(null);
const chapterCount = ref(0);
const selectedChapter = ref<number | null>(null);
const selectedVerse = ref<number | null>(null);
const verses = ref<BibleVerse[]>([]);
const bookName = ref('');
const error = ref('');
const searchInputRef = ref<HTMLInputElement | null>(null);

let referenceTimer: ReturnType<typeof setTimeout> | undefined;

const searchQuery = computed({
  get: () => prefs.value.bibleSearchQuery,
  set: (value: string) => setBibleSearchQuery(value),
});

const parsedReference = computed(() => parseBibleReference(searchQuery.value));

const bibleSearchHistoryVisible = computed(() => {
  if (!prefs.value.bibleSearchHistoryEnabled) return [];
  return prefs.value.bibleSearchHistory;
});

const filteredBooks = computed(() => {
  if (parsedReference.value) return books.value;
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return books.value;
  return books.value.filter((book) => book.nome.toLowerCase().includes(q));
});

async function scrollToId(id: string): Promise<void> {
  await nextTick();
  const deadline = Date.now() + 500;
  while (Date.now() < deadline) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return;
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

function persistSelection(): void {
  setBibleSelection(
    selectedBook.value?.id ?? null,
    selectedChapter.value,
    selectedVerse.value,
  );
}

async function loadBibles() {
  try {
    const data = await fetchJson<{ status: string; biblias: BibleEntry[] }>('/biblias');
    bibles.value = data.biblias ?? [];
    if (!prefs.value.bibleFile && bibles.value[0]) {
      setBibleFile(bibles.value[0].arquivo);
    }
    if (prefs.value.bibleFile) {
      await loadBooks(prefs.value.bibleFile);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('bible.errors.bibles');
  }
}

async function loadBooks(file: string) {
  setBibleFile(file);
  selectedBook.value = null;
  selectedChapter.value = null;
  selectedVerse.value = null;
  verses.value = [];
  try {
    const data = await fetchJson<{ status: string; items: BibleBook[] }>(
      `/biblias/livros/${file}`,
    );
    books.value = data.items ?? [];
    await restoreSavedSelection();
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('bible.errors.books');
  }
}

async function restoreSavedSelection() {
  const { bibleSelectedBookId, bibleSelectedChapter, bibleSelectedVerse } = prefs.value;
  if (!bibleSelectedBookId) return;
  const book = books.value.find((b) => b.id === bibleSelectedBookId);
  if (!book) return;
  await selectBook(book);
  if (bibleSelectedChapter != null) {
    await selectChapter(bibleSelectedChapter);
  }
  if (bibleSelectedVerse != null && selectedBook.value && selectedChapter.value != null) {
    selectedVerse.value = bibleSelectedVerse;
    await scrollToId(
      `bible-verse-${selectedBook.value.id}-${selectedChapter.value}-${bibleSelectedVerse}`,
    );
  }
}

async function selectBook(book: BibleBook) {
  selectedBook.value = book;
  selectedChapter.value = null;
  selectedVerse.value = null;
  verses.value = [];
  try {
    const data = await fetchJson<{ status: string; items: { capitulos: number }[] }>(
      `/biblias/capitulo/${prefs.value.bibleFile}/${book.id}`,
    );
    chapterCount.value = data.items?.[0]?.capitulos ?? 0;
    await scrollToId(`bible-book-${book.id}`);
    persistSelection();
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('bible.errors.chapters');
  }
}

async function selectChapter(chapter: number) {
  if (!selectedBook.value) return;
  selectedChapter.value = chapter;
  selectedVerse.value = null;
  try {
    const data = await fetchJson<{
      status: string;
      livro: string;
      items: BibleVerse[];
    }>(
      `/biblias/versiculo/${prefs.value.bibleFile}/${selectedBook.value.id}/${chapter}`,
    );
    bookName.value = data.livro;
    verses.value = data.items ?? [];
    await scrollToId(`bible-chapter-${selectedBook.value.id}-${chapter}`);
    persistSelection();
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('bible.errors.verses');
  }
}

function onVerseDragStart(event: DragEvent, verse: BibleVerse): void {
  if (!selectedBook.value || selectedChapter.value === null) return;
  onDragStart(event, {
    kind: 'bible',
    label: `${bookName.value || selectedBook.value.nome} ${selectedChapter.value}:${verse.versiculo}`,
    text: verse.texto,
    bibleFile: prefs.value.bibleFile,
    bookId: selectedBook.value.id,
    bookName: bookName.value || selectedBook.value.nome,
    chapter: selectedChapter.value,
    verseNum: verse.versiculo,
  });
}

async function projectVerse(verse: BibleVerse) {
  if (!selectedBook.value || selectedChapter.value === null) return;
  selectedVerse.value = verse.versiculo;
  await scrollToId(
    `bible-verse-${selectedBook.value.id}-${selectedChapter.value}-${verse.versiculo}`,
  );
  const html = buildBibleHtml(
    bookName.value || selectedBook.value.nome,
    selectedChapter.value,
    verse.versiculo,
    verse.texto,
  );
  emit('preview', html);
  sendAction('viewBiblia', html);
  sendAction(
    'viewBibliaRetorno',
    buildBibleStageHtml(
      bookName.value || selectedBook.value.nome,
      selectedChapter.value,
      verse.versiculo,
      verse.texto,
    ),
  );
  persistSelection();
}

function applySearchHistoryEntry(entry: string): void {
  setBibleSearchQuery(entry);
}

async function navigateToReference() {
  const ref = parsedReference.value;
  if (!ref || books.value.length === 0) return;

  let book = findBookByReference(books.value, ref.bookQuery);
  if (!book) {
    error.value = t('bible.errors.bookNotFound', { query: ref.bookQuery });
    return;
  }

  error.value = '';
  pushBibleSearchHistory(searchQuery.value);
  await selectBook(book);

  if (ref.chapter != null && ref.chapter > chapterCount.value) {
    const fallback = findBookFallbackForReference(
      books.value,
      ref.bookQuery,
      book,
      ref.chapter,
      chapterCount.value,
    );
    if (fallback) {
      book = fallback;
      await selectBook(book);
    }
  }

  if (ref.chapter != null && ref.chapter <= chapterCount.value) {
    await selectChapter(ref.chapter);
    if (ref.verse != null) {
      const verse = verses.value.find((v) => v.versiculo === ref.verse);
      if (verse) {
        await projectVerse(verse);
      }
    }
  }
}

function navigateVerse(delta: number): void {
  const nextIdx = computeNextVerseIndex(verses.value, selectedVerse.value, delta);
  if (nextIdx == null) return;
  void projectVerse(verses.value[nextIdx]);
}

function onKeydown(event: KeyboardEvent): void {
  if (prefs.value.activePanel !== 'biblia') return;
  if (!verses.value.length) return;
  const down = matchesShortcut(event, 'verse_next');
  const up = matchesShortcut(event, 'verse_prev');
  if (!down && !up) return;

  event.preventDefault();
  searchInputRef.value?.blur();
  navigateVerse(down ? 1 : -1);
}

const chapters = () =>
  Array.from({ length: chapterCount.value }, (_, i) => i + 1);

watch(
  () => prefs.value.bibleFile,
  (file) => {
    if (file) void loadBooks(file);
  },
);

watch(searchQuery, () => {
  clearTimeout(referenceTimer);
  if (!parsedReference.value) return;
  referenceTimer = setTimeout(() => {
    void navigateToReference();
  }, REFERENCE_DEBOUNCE_MS);
});

onMounted(() => {
  void loadBibles();
  window.addEventListener('keydown', onKeydown, true);
});

onUnmounted(() => {
  clearTimeout(referenceTimer);
  window.removeEventListener('keydown', onKeydown, true);
});
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <div
      v-if="error"
      class="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
    >
      {{ error }}
    </div>

    <div class="lp-panel-field-row">
      <label
        class="lp-panel-label"
        for="bible-translation"
      >{{ t('bible.translation') }}</label>
      <select
        id="bible-translation"
        :value="prefs.bibleFile"
        class="rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text"
        @change="loadBooks(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="b in bibles"
          :key="b.arquivo"
          :value="b.arquivo"
        >
          {{ b.nome }}
        </option>
      </select>
    </div>

    <div class="lp-panel-field-row">
      <label
        class="lp-panel-label"
        for="bible-search"
      >{{ t('common.search') }}</label>
      <input
        id="bible-search"
        ref="searchInputRef"
        v-model="searchQuery"
        type="search"
        class="rounded-lg border border-lp-surface bg-lp-background px-3 py-2 text-sm text-lp-text placeholder:text-lp-muted"
        :placeholder="t('bible.searchReferencePlaceholder')"
      >
    </div>
    <div
      v-if="bibleSearchHistoryVisible.length"
      class="flex flex-wrap gap-1.5"
      role="list"
      :aria-label="t('bible.searchHistoryLabel')"
    >
      <button
        v-for="entry in bibleSearchHistoryVisible"
        :key="entry"
        type="button"
        role="listitem"
        class="rounded-full border border-lp-selection-nav-chip-border bg-lp-selection-nav-chip-bg px-2.5 py-0.5 text-xs text-lp-selection-nav-text transition hover:bg-lp-selection-nav-chip-hover"
        @click="applySearchHistoryEntry(entry)"
      >
        {{ entry }}
      </button>
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-3 gap-3">
      <div class="flex min-h-0 flex-col">
        <p class="mb-2 lp-panel-label">
          {{ t('bible.books') }}
        </p>
        <ul class="min-h-0 flex-1 overflow-y-auto rounded-lg border border-lp-surface bg-lp-background/50 p-2 text-sm">
          <li
            v-for="book in filteredBooks"
            :id="`bible-book-${book.id}`"
            :key="book.id"
            class="cursor-pointer rounded px-2 py-1.5 transition hover:bg-lp-selection-nav-hover"
            :class="
              selectedBook?.id === book.id
                ? 'bg-lp-selection-nav text-lp-selection-nav-text'
                : 'text-lp-text/90'
            "
            @click="selectBook(book)"
          >
            {{ book.nome }}
          </li>
        </ul>
      </div>

      <div class="flex min-h-0 flex-col">
        <p class="mb-2 lp-panel-label">
          {{ t('bible.chapters') }}
        </p>
        <ul class="grid min-h-0 flex-1 grid-cols-4 gap-1 overflow-y-auto rounded-lg border border-lp-surface bg-lp-background/50 p-2 text-sm">
          <li
            v-for="ch in chapters()"
            :id="selectedBook ? `bible-chapter-${selectedBook.id}-${ch}` : undefined"
            :key="ch"
            class="cursor-pointer rounded px-2 py-1 text-center transition hover:bg-lp-selection-nav-hover"
            :class="
              selectedChapter === ch
                ? 'bg-lp-selection-nav text-lp-selection-nav-text'
                : 'text-lp-text/90'
            "
            @click="selectChapter(ch)"
          >
            {{ ch }}
          </li>
        </ul>
      </div>

      <div class="flex min-h-0 flex-col">
        <p class="mb-2 lp-panel-label">
          {{ t('bible.verses') }}
        </p>
        <ul class="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border border-lp-surface bg-lp-background/50 p-2 text-sm">
          <li
            v-for="verse in verses"
            :id="
              selectedBook && selectedChapter != null
                ? `bible-verse-${selectedBook.id}-${selectedChapter}-${verse.versiculo}`
                : undefined
            "
            :key="verse.id"
            draggable="true"
            class="cursor-grab rounded px-2 py-1.5 transition hover:bg-lp-selection-active-hover active:cursor-grabbing"
            :class="
              selectedVerse === verse.versiculo
                ? 'bg-lp-selection-active text-lp-selection-active-text ring-1 ring-lp-selection-active-ring'
                : 'text-lp-text/90'
            "
            :title="t('tabs.dragHint')"
            @click="projectVerse(verse)"
            @dragstart="onVerseDragStart($event, verse)"
          >
            <span class="mr-2 font-semibold text-slate-500">{{ verse.versiculo }}</span>
            {{ verse.texto }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>