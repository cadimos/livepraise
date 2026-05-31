/** Schema mínimo de `themes/{nome}/theme.json` (CA-R22). */
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
