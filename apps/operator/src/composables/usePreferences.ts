import { ref, watch } from 'vue';
import {
  migrateTabVerses,
  newQueueItemId,
  reorderQueueItems,
  type LegacyChromeTabVerse,
  type QueueItem,
} from '@shared/queue-items';
import {
  BIBLE_SEARCH_HISTORY_DEFAULT_LIMIT,
  clampBibleSearchHistoryLimit,
  pushBibleSearchHistoryEntry,
  sanitizeBibleSearchHistory,
} from '@shared/bible-search-history';
import {
  clampMaxEstofreLines,
  DEFAULT_MAX_ESTOFRE_LINES,
} from '@shared/verse-estofres';
import {
  defaultProjectionTypographyPrefs,
  sanitizeProjectionTypographyPrefs,
  type ProjectionTypographyPrefs,
  type ProjectionTypographyProfile,
  type ProjectionTypographyProfileKey,
} from '@shared/projection-typography';

export type OperatorPanel = 'imagens' | 'videos' | 'louvor' | 'biblia';

/** @deprecated Use {@link QueueItem} — mantido para import/export legado. */
export type ChromeTabVerse = LegacyChromeTabVerse;

export interface ChromeTab {
  id: string;
  label: string;
  songId?: number;
  songName?: string;
  artist?: string;
  /** Itens da fila; ausente em tabs legadas até migração. */
  items?: QueueItem[];
  /** Legado — migrado para `items` ao carregar preferências. */
  verses?: ChromeTabVerse[];
  /** Música referenciada no export mas ausente na BD destino (import). */
  missing?: boolean;
  missingMessage?: string;
}

export interface OperatorPreferences {
  activePanel: OperatorPanel;
  musicCategoryId: string;
  bibleFile: string;
  imageCategory: string;
  videoCategory: string;
  chromeTabs: ChromeTab[];
  activeTabId: string | null;
  themeId: string;
  /** Escala da UI do operador (100–125), persistida em localStorage. */
  fontScalePercent: number;
  /** Badge de última acção WS nas vistas de projeção/externas (CAD-179). */
  displayDebugOverlay: boolean;
  locale: string;
  worshipSearchQuery: string;
  bibleSearchQuery: string;
  imageSearchQuery: string;
  videoSearchQuery: string;
  bibleSelectedBookId: number | null;
  bibleSelectedChapter: number | null;
  bibleSelectedVerse: number | null;
  /** Referências recentes no campo de pesquisa da Bíblia (CAD-190). */
  bibleSearchHistory: string[];
  bibleSearchHistoryEnabled: boolean;
  bibleSearchHistoryLimit: number;
  /** Máximo de linhas por estofre na fila/exibição (CAD-182); não altera a BD. */
  maxEstofreLines: number;
  /** Tipografia por destino de projeção (CAD-312). */
  projectionTypography: ProjectionTypographyPrefs;
}

const STORAGE_KEY = 'livepraise.operator.prefs';

const defaults: OperatorPreferences = {
  activePanel: 'louvor',
  musicCategoryId: '',
  bibleFile: '',
  imageCategory: '',
  videoCategory: '',
  chromeTabs: [],
  activeTabId: null,
  themeId: 'default',
  fontScalePercent: 100,
  displayDebugOverlay: false,
  locale: 'pt-BR',
  worshipSearchQuery: '',
  bibleSearchQuery: '',
  imageSearchQuery: '',
  videoSearchQuery: '',
  bibleSelectedBookId: null,
  bibleSelectedChapter: null,
  bibleSelectedVerse: null,
  bibleSearchHistory: [],
  bibleSearchHistoryEnabled: true,
  bibleSearchHistoryLimit: BIBLE_SEARCH_HISTORY_DEFAULT_LIMIT,
  maxEstofreLines: DEFAULT_MAX_ESTOFRE_LINES,
  projectionTypography: defaultProjectionTypographyPrefs(),
};

function load(): OperatorPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = { ...defaults, ...JSON.parse(raw) } as OperatorPreferences & {
      activePanel?: string;
    };
    const legacyPanel = parsed.activePanel as string | undefined;
    if (legacyPanel === 'fundos') parsed.activePanel = 'imagens';
    if (legacyPanel === 'monitores') parsed.activePanel = 'louvor';
    parsed.chromeTabs = (parsed.chromeTabs ?? []).map((tab) => {
      const legacy = tab as ChromeTab & { verses?: ChromeTabVerse[] };
      const items =
        legacy.items?.length
          ? legacy.items
          : migrateTabVerses(legacy.verses ?? []);
      return { ...legacy, items };
    });
    const scale = Number(parsed.fontScalePercent);
    parsed.fontScalePercent = Number.isFinite(scale)
      ? Math.min(125, Math.max(100, Math.round(scale)))
      : defaults.fontScalePercent;
    parsed.displayDebugOverlay = Boolean(parsed.displayDebugOverlay);
    parsed.maxEstofreLines = clampMaxEstofreLines(
      parsed.maxEstofreLines ?? defaults.maxEstofreLines,
    );
    parsed.bibleSearchHistoryEnabled =
      parsed.bibleSearchHistoryEnabled !== false;
    parsed.bibleSearchHistoryLimit = clampBibleSearchHistoryLimit(
      parsed.bibleSearchHistoryLimit ?? defaults.bibleSearchHistoryLimit,
    );
    parsed.bibleSearchHistory = sanitizeBibleSearchHistory(
      parsed.bibleSearchHistory,
      parsed.bibleSearchHistoryLimit,
    );
    parsed.projectionTypography = sanitizeProjectionTypographyPrefs(
      parsed.projectionTypography,
    );
    return parsed;
  } catch {
    return { ...defaults };
  }
}

const prefs = ref<OperatorPreferences>(load());

function applyFontScale(percent: number): void {
  const clamped = Math.min(125, Math.max(100, Math.round(percent)));
  const scale = clamped / 100;
  document.documentElement.style.setProperty('--lp-ui-scale', String(scale));
}

applyFontScale(prefs.value.fontScalePercent);

watch(
  () => prefs.value.fontScalePercent,
  (percent) => applyFontScale(percent),
);

watch(
  prefs,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  },
  { deep: true },
);

export function usePreferences() {
  function setPanel(panel: OperatorPanel): void {
    prefs.value.activePanel = panel;
  }

  function setMusicCategory(id: string): void {
    prefs.value.musicCategoryId = id;
  }

  function setBibleFile(file: string): void {
    prefs.value.bibleFile = file;
  }

  function setImageCategory(cat: string): void {
    prefs.value.imageCategory = cat;
  }

  function setVideoCategory(cat: string): void {
    prefs.value.videoCategory = cat;
  }

  function addChromeTab(tab: Omit<ChromeTab, 'id'>): ChromeTab {
    const items =
      tab.items?.length
        ? tab.items
        : migrateTabVerses(tab.verses ?? []);
    const entry: ChromeTab = {
      ...tab,
      id: `tab-${Date.now()}`,
      items,
    };
    prefs.value.chromeTabs.push(entry);
    prefs.value.activeTabId = entry.id;
    return entry;
  }

  function addBlankChromeTab(label: string): ChromeTab {
    return addChromeTab({ label, items: [] });
  }

  function tabItems(tab: ChromeTab): QueueItem[] {
    if (!tab.items) {
      tab.items = migrateTabVerses(tab.verses ?? []);
    }
    return tab.items;
  }

  function addQueueItem(
    tabId: string,
    item: QueueItem | Omit<QueueItem, 'id'>,
    index?: number,
  ): void {
    const tab = prefs.value.chromeTabs.find((t) => t.id === tabId);
    if (!tab) return;
    const items = tabItems(tab);
    const entry: QueueItem =
      'id' in item && item.id ? item : { ...item, id: newQueueItemId() };
    if (index == null || index < 0 || index > items.length) {
      items.push(entry);
    } else {
      items.splice(index, 0, entry);
    }
  }

  function reorderQueueItemsInTab(
    tabId: string,
    fromIndex: number,
    toIndex: number,
  ): void {
    const tab = prefs.value.chromeTabs.find((t) => t.id === tabId);
    if (!tab) return;
    const items = tabItems(tab);
    tab.items = reorderQueueItems(items, fromIndex, toIndex);
  }

  function removeQueueItem(tabId: string, itemId: string): void {
    const tab = prefs.value.chromeTabs.find((t) => t.id === tabId);
    if (!tab) return;
    const items = tabItems(tab);
    if (!items.some((i) => i.id === itemId)) return;
    tab.items = items.filter((i) => i.id !== itemId);
  }

  function updateQueueItem(
    tabId: string,
    itemId: string,
    patch: Partial<QueueItem>,
  ): void {
    const tab = prefs.value.chromeTabs.find((t) => t.id === tabId);
    if (!tab) return;
    const items = tabItems(tab);
    const idx = items.findIndex((item) => item.id === itemId);
    if (idx < 0) return;
    items[idx] = { ...items[idx], ...patch };
  }

  function moveQueueItemInTab(
    fromTabId: string,
    itemId: string,
    toTabId: string,
    toIndex?: number,
  ): void {
    const fromTab = prefs.value.chromeTabs.find((t) => t.id === fromTabId);
    const toTab = prefs.value.chromeTabs.find((t) => t.id === toTabId);
    if (!fromTab || !toTab) return;
    const fromItems = tabItems(fromTab);
    const toItems = tabItems(toTab);
    const fromIdx = fromItems.findIndex((i) => i.id === itemId);
    if (fromIdx < 0) return;
    const [item] = fromItems.splice(fromIdx, 1);
    if (!item) return;
    const idx =
      toIndex == null || toIndex < 0 || toIndex > toItems.length
        ? toItems.length
        : toIndex;
    toItems.splice(idx, 0, item);
  }

  function updateChromeTab(id: string, patch: Partial<Omit<ChromeTab, 'id'>>): void {
    const idx = prefs.value.chromeTabs.findIndex((t) => t.id === id);
    if (idx < 0) return;
    prefs.value.chromeTabs[idx] = { ...prefs.value.chromeTabs[idx], ...patch };
  }

  function removeChromeTab(id: string): void {
    prefs.value.chromeTabs = prefs.value.chromeTabs.filter((t) => t.id !== id);
    if (prefs.value.activeTabId === id) {
      prefs.value.activeTabId = prefs.value.chromeTabs[0]?.id ?? null;
    }
  }

  function replaceChromeTabs(tabs: Omit<ChromeTab, 'id'>[]): void {
    prefs.value.chromeTabs = tabs.map((tab, index) => ({
      ...tab,
      id: `tab-import-${Date.now()}-${index}`,
      items:
        tab.items?.length
          ? tab.items
          : migrateTabVerses(tab.verses ?? []),
    }));
    prefs.value.activeTabId = prefs.value.chromeTabs[0]?.id ?? null;
  }

  function removeChromeTabsForSong(songId: number): void {
    const removed = prefs.value.chromeTabs.filter((t) => t.songId === songId);
    if (!removed.length) return;
    prefs.value.chromeTabs = prefs.value.chromeTabs.filter((t) => t.songId !== songId);
    if (prefs.value.activeTabId && removed.some((t) => t.id === prefs.value.activeTabId)) {
      prefs.value.activeTabId = prefs.value.chromeTabs[0]?.id ?? null;
    }
  }

  function setActiveTab(id: string): void {
    prefs.value.activeTabId = id;
  }

  function setThemeId(themeId: string): void {
    prefs.value.themeId = themeId;
  }

  function setFontScalePercent(percent: number): void {
    prefs.value.fontScalePercent = Math.min(125, Math.max(100, Math.round(percent)));
  }

  function setDisplayDebugOverlay(enabled: boolean): void {
    prefs.value.displayDebugOverlay = enabled;
  }

  function setLocale(locale: string): void {
    prefs.value.locale = locale;
  }

  function setWorshipSearchQuery(query: string): void {
    prefs.value.worshipSearchQuery = query;
  }

  function setBibleSearchQuery(query: string): void {
    prefs.value.bibleSearchQuery = query;
  }

  function setImageSearchQuery(query: string): void {
    prefs.value.imageSearchQuery = query;
  }

  function setVideoSearchQuery(query: string): void {
    prefs.value.videoSearchQuery = query;
  }

  function setBibleSelection(
    bookId: number | null,
    chapter: number | null,
    verse: number | null,
  ): void {
    prefs.value.bibleSelectedBookId = bookId;
    prefs.value.bibleSelectedChapter = chapter;
    prefs.value.bibleSelectedVerse = verse;
  }

  function setMaxEstofreLines(lines: number): void {
    prefs.value.maxEstofreLines = clampMaxEstofreLines(lines);
  }

  function setBibleSearchHistoryEnabled(enabled: boolean): void {
    prefs.value.bibleSearchHistoryEnabled = enabled;
  }

  function setBibleSearchHistoryLimit(limit: number): void {
    const capped = clampBibleSearchHistoryLimit(limit);
    prefs.value.bibleSearchHistoryLimit = capped;
    prefs.value.bibleSearchHistory = sanitizeBibleSearchHistory(
      prefs.value.bibleSearchHistory,
      capped,
    );
  }

  function pushBibleSearchHistory(query: string): void {
    if (!prefs.value.bibleSearchHistoryEnabled) return;
    prefs.value.bibleSearchHistory = pushBibleSearchHistoryEntry(
      prefs.value.bibleSearchHistory,
      query,
      prefs.value.bibleSearchHistoryLimit,
    );
  }

  function clearBibleSearchHistory(): void {
    prefs.value.bibleSearchHistory = [];
  }

  function patchProjectionTypographyProfile(
    key: ProjectionTypographyProfileKey,
    patch: Partial<ProjectionTypographyProfile>,
  ): void {
    prefs.value.projectionTypography[key] = {
      ...prefs.value.projectionTypography[key],
      ...patch,
    };
  }

  function setProjectionTypography(next: ProjectionTypographyPrefs): void {
    prefs.value.projectionTypography = sanitizeProjectionTypographyPrefs(next);
  }

  return {
    prefs,
    setPanel,
    setMusicCategory,
    setBibleFile,
    setImageCategory,
    setVideoCategory,
    addChromeTab,
    addBlankChromeTab,
    addQueueItem,
    removeQueueItem,
    updateQueueItem,
    reorderQueueItemsInTab,
    moveQueueItemInTab,
    updateChromeTab,
    removeChromeTab,
    removeChromeTabsForSong,
    replaceChromeTabs,
    setActiveTab,
    setThemeId,
    setFontScalePercent,
    setDisplayDebugOverlay,
    setLocale,
    setWorshipSearchQuery,
    setBibleSearchQuery,
    setImageSearchQuery,
    setVideoSearchQuery,
    setBibleSelection,
    setMaxEstofreLines,
    setBibleSearchHistoryEnabled,
    setBibleSearchHistoryLimit,
    pushBibleSearchHistory,
    clearBibleSearchHistory,
    patchProjectionTypographyProfile,
    setProjectionTypography,
  };
}
