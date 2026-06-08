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

/** Reutiliza config guardada quando o SO muda o displayId (ex.: SyncMaster). */
function findSavedAssignment(
  display: ConnectedDisplay,
  savedList: DisplayAssignment[],
  claimedSavedIds: Set<number>,
): DisplayAssignment | undefined {
  const byId = savedList.find((a) => a.displayId === display.id);
  if (byId) {
    claimedSavedIds.add(byId.displayId);
    return byId;
  }

  const label = display.label?.trim().toLowerCase();
  if (label) {
    const byLabel = savedList.find(
      (a) =>
        !claimedSavedIds.has(a.displayId) &&
        a.label?.toLowerCase().includes(label),
    );
    if (byLabel) {
      claimedSavedIds.add(byLabel.displayId);
      return byLabel;
    }
  }

  const bySize = savedList.find(
    (a) =>
      !claimedSavedIds.has(a.displayId) &&
      a.bounds.width === display.bounds.width &&
      a.bounds.height === display.bounds.height,
  );
  if (bySize) {
    claimedSavedIds.add(bySize.displayId);
    return bySize;
  }

  return undefined;
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
  const claimedSavedIds = new Set<number>();

  const assignments: DisplayAssignment[] = connected.map((display, index) => {
    const existing = findSavedAssignment(display, savedList, claimedSavedIds);
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
      connected: true,
      screenSize: existing?.screenSize ?? defaultScreenSize(),
    };
  });

  for (const item of savedList) {
    if (byId.has(item.displayId) || claimedSavedIds.has(item.displayId)) continue;
    if (item.role === 'off') continue;
    assignments.push({
      ...item,
      connected: false,
      screenSize: item.screenSize ?? defaultScreenSize(),
    });
  }

  return ensureConnectedOperatorRole(assignments, primaryDisplayId);
}

/**
 * Garante operador num monitor ligado (ex.: portátil desligado, só projetor na tomada).
 */
export function ensureConnectedOperatorRole(
  assignments: DisplayAssignment[],
  primaryDisplayId: number,
): DisplayAssignment[] {
  const connected = assignments.filter((a) => a.connected !== false);
  if (connected.some((a) => a.role === 'operator')) {
    return assignments;
  }

  const fallbackId =
    connected.find((a) => a.displayId === primaryDisplayId)?.displayId ??
    connected[0]?.displayId;

  if (fallbackId === undefined) {
    return assignments;
  }

  return assignments.map((a) => {
    if (a.displayId === fallbackId) {
      if (a.role === 'operator') return a;
      return { ...a, role: 'operator' as DisplayRole };
    }
    if (a.role === 'operator' && a.connected === false) {
      return { ...a, role: 'off' as DisplayRole };
    }
    return a;
  });
}
