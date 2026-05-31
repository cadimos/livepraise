import type { DisplayAssignment, DisplayRole } from './types.js';

export interface ConnectedDisplay {
  id: number;
  label?: string | null;
  bounds: { x: number; y: number; width: number; height: number };
}

function defaultScreenSize(): DisplayAssignment['screenSize'] {
  return {
    preset: 'padrao',
    largura: '',
    altura: '',
    livePreview: false,
    position: 'centro',
    offsetX: '',
    offsetY: '',
    contentFit: 'estender',
  };
}

function displayLabel(display: ConnectedDisplay, index: number): string {
  const size = `${display.bounds.width}×${display.bounds.height}`;
  return display.label?.trim() || `Monitor ${index + 1} (${size})`;
}

/** Papéis por defeito para monitores novos (CA-R16): principal=operador; 1.º secundário=projeção; 2.º=retorno. */
export function inferDefaultRoleForNewDisplay(
  displayId: number,
  primaryDisplayId: number,
  connected: ConnectedDisplay[],
  savedAssignments: DisplayAssignment[],
): DisplayRole {
  if (displayId === primaryDisplayId) return 'operator';

  const activeRoles = new Set(
    savedAssignments
      .filter((a) => connected.some((d) => d.id === a.displayId))
      .map((a) => a.role),
  );

  if (!activeRoles.has('projection')) return 'projection';
  if (!activeRoles.has('stage-return')) return 'stage-return';
  return 'off';
}

/**
 * Funde monitores ligados com config guardada, preservando papéis de monitores desligados
 * e atribuindo papéis por defeito a monitores novos (CAD-175).
 */
export function mergeDisplayAssignments(
  connected: ConnectedDisplay[],
  saved: DisplayAssignment[] | null | undefined,
  primaryDisplayId: number,
): DisplayAssignment[] {
  const savedList = saved ?? [];
  const byId = new Map(connected.map((d) => [d.id, d]));

  const assignments: DisplayAssignment[] = connected.map((display, index) => {
    const existing = savedList.find((a) => a.displayId === display.id);
    const primary = display.id === primaryDisplayId;
    const role =
      existing?.role ??
      inferDefaultRoleForNewDisplay(display.id, primaryDisplayId, connected, savedList);

    return {
      displayId: display.id,
      label: displayLabel(display, index),
      role,
      bounds: { ...display.bounds },
      primary,
      screenSize: existing?.screenSize ?? defaultScreenSize(),
    };
  });

  for (const item of savedList) {
    if (!byId.has(item.displayId) && item.role !== 'off') {
      assignments.push({
        ...item,
        screenSize: item.screenSize ?? defaultScreenSize(),
      });
    }
  }

  return assignments;
}
