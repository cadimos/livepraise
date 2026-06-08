export type DisplayRole = 'operator' | 'projection' | 'stage-return' | 'off';

export interface DisplayScreenSize {
  preset: string;
  largura: string;
  altura: string;
  livePreview?: boolean;
  position?: 'centro' | 'topo' | 'personalizado';
  offsetX?: string;
  offsetY?: string;
  contentFit?: 'estender' | 'centralizar' | 'proporcional';
}

export interface DisplayAssignment {
  displayId: number;
  label: string;
  role: DisplayRole;
  bounds: { x: number; y: number; width: number; height: number };
  primary: boolean;
  connected?: boolean;
  screenSize?: DisplayScreenSize;
}

export interface DisplaysConfig {
  assignments: DisplayAssignment[];
  updatedAt: string;
}
