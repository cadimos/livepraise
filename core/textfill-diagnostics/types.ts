export interface TextfillDiagnosticEntry {
  id: string;
  ts: string;
  appVersion: string;
  surface: string;
  mode: 'preview' | 'output';
  pass: number;
  measurePhase?: string;
  minFontPx: number;
  maxFontPx: number;
  textfillEnabled: boolean;
  loBound: number;
  hiBound: number;
  slackPx: number;
  resultFontPx: number;
  fits: boolean;
  spanOffsetH?: number;
  spanOffsetW?: number;
  spanClientH?: number;
  visualOverflowPx?: number;
  computedFontPx?: number;
  styleFontPx?: number;
  fontSizeMismatchPx?: number;
  usedProbe?: boolean;
  maxH?: number;
  heightOverflow?: number;
  widthOverflow?: number;
  computedAreaW?: number;
  computedAreaH?: number;
  rootConcealed?: boolean;
  box: {
    clientW: number;
    clientH: number;
    scrollW: number;
    scrollH: number;
  };
  root: {
    clientW: number;
    clientH: number;
  };
  stage?: {
    clientW: number;
    clientH: number;
    dataScreen?: string;
  };
  viewport: {
    innerW: number;
    innerH: number;
    devicePixelRatio: number;
  };
  rodapeH: number;
  tituloH: number;
  textSnippet: string;
  userAgent: string;
  location: string;
}

export type AppendTextfillDiagnosticInput = Omit<TextfillDiagnosticEntry, 'id' | 'ts'>;
