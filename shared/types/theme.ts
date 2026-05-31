/** Cores de selecção / hover em listas (Louvor, Bíblia, etc.). */
export interface ThemeSelectionColors {
  /** Lista principal (ex.: músicas). */
  listBackground: string;
  listText: string;
  listHover: string;
  listRing: string;
  /** Navegação hierárquica (ex.: livros, capítulos, chips de histórico). */
  navBackground: string;
  navText: string;
  navHover: string;
  navChipBackground: string;
  navChipBorder: string;
  navChipHover: string;
  /** Item activo (ex.: verso seleccionado). */
  activeBackground: string;
  activeText: string;
  activeHover: string;
  activeRing: string;
}

/** Schema de `themes/{nome}/theme.json` (CA-R22). */
export interface ThemeDefinition {
  name: string;
  version: string;
  label?: string;
  colors: {
    primary: string;
    actionBar?: string;
    background: string;
    surface: string;
    text: string;
    muted?: string;
    accent?: string;
    selection?: Partial<ThemeSelectionColors>;
  };
  typography?: {
    fontFamily?: string;
  };
}

export interface ThemeSummary {
  id: string;
  label: string;
  version: string;
}

/** Valores por defeito (tema `default` — sky / violet / emerald actuais). */
export const DEFAULT_THEME_SELECTION: ThemeSelectionColors = {
  listBackground: 'rgba(12, 74, 110, 0.4)',
  listText: '#e0f2fe',
  listHover: 'rgba(8, 47, 73, 0.5)',
  listRing: 'rgba(3, 105, 161, 0.4)',
  navBackground: 'rgba(76, 29, 149, 0.4)',
  navText: '#ede9fe',
  navHover: 'rgba(46, 16, 101, 0.5)',
  navChipBackground: 'rgba(46, 16, 101, 0.4)',
  navChipBorder: 'rgba(91, 33, 182, 0.6)',
  navChipHover: 'rgba(76, 29, 149, 0.5)',
  activeBackground: 'rgba(6, 78, 59, 0.4)',
  activeText: '#d1fae5',
  activeHover: 'rgba(2, 44, 34, 0.5)',
  activeRing: 'rgba(4, 120, 87, 0.4)',
};
