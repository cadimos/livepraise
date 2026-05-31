export interface BundledFontFamilyManifest {
  id: string;
  label: string;
  cssFamily: string;
  files: string[];
}

export interface BundledFontsManifest {
  version: number;
  families: BundledFontFamilyManifest[];
}

export interface SystemFontItem {
  family: string;
  localizedName: string;
}
