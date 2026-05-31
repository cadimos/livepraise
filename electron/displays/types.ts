export type DisplayRole = 'operator' | 'projection' | 'stage-return' | 'off';

export interface DisplayScreenSize {
  preset: string;
  largura: string;
  altura: string;
}

export interface DisplayAssignment {
  displayId: number;
  label: string;
  role: DisplayRole;
  bounds: { x: number; y: number; width: number; height: number };
  primary: boolean;
  screenSize?: DisplayScreenSize;
}

export interface DisplaysConfig {
  assignments: DisplayAssignment[];
  updatedAt: string;
}
