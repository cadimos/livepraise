import { ref, watch } from 'vue';

export type OperatorPanel = 'imagens' | 'videos' | 'louvor' | 'biblia';

export interface ChromeTabVerse {
  id: number;
  text: string;
  active?: boolean;
}

export interface ChromeTab {
  id: string;
  label: string;
  songId?: number;
  songName?: string;
  artist?: string;
  verses: ChromeTabVerse[];
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
  locale: string;
  worshipSearchQuery: string;
  bibleSearchQuery: string;
  imageSearchQuery: string;
  videoSearchQuery: string;
  bibleSelectedBookId: number | null;
  bibleSelectedChapter: number | null;
  bibleSelectedVerse: number | null;
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
  locale: 'pt-BR',
  worshipSearchQuery: '',
  bibleSearchQuery: '',
  imageSearchQuery: '',
  videoSearchQuery: '',
  bibleSelectedBookId: null,
  bibleSelectedChapter: null,
  bibleSelectedVerse: null,
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
    parsed.chromeTabs = (parsed.chromeTabs ?? []).map((tab) => ({
      ...tab,
      verses: tab.verses ?? [],
    }));
    const scale = Number(parsed.fontScalePercent);
    parsed.fontScalePercent = Number.isFinite(scale)
      ? Math.min(125, Math.max(100, Math.round(scale)))
      : defaults.fontScalePercent;
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
    const entry: ChromeTab = {
      ...tab,
      id: `tab-${Date.now()}`,
      verses: tab.verses ?? [],
    };
    prefs.value.chromeTabs.push(entry);
    prefs.value.activeTabId = entry.id;
    return entry;
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
      verses: tab.verses ?? [],
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

  return {
    prefs,
    setPanel,
    setMusicCategory,
    setBibleFile,
    setImageCategory,
    setVideoCategory,
    addChromeTab,
    updateChromeTab,
    removeChromeTab,
    removeChromeTabsForSong,
    replaceChromeTabs,
    setActiveTab,
    setThemeId,
    setFontScalePercent,
    setLocale,
    setWorshipSearchQuery,
    setBibleSearchQuery,
    setImageSearchQuery,
    setVideoSearchQuery,
    setBibleSelection,
  };
}
