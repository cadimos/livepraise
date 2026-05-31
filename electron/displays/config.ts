import { screen, type Display } from 'electron';
import type {
  DisplayAssignment,
  DisplayRole,
  DisplayScreenSize,
  DisplaysConfig,
} from './types.js';

function defaultScreenSize(): DisplayScreenSize {
  return { preset: 'padrao', largura: '', altura: '' };
}
import { readDisplaysConfigFile, writeDisplaysConfigFile } from './persistence.js';

function displayLabel(display: Display, index: number): string {
  const size = `${display.bounds.width}×${display.bounds.height}`;
  return display.label?.trim() || `Monitor ${index + 1} (${size})`;
}

/** Papéis por defeito: principal=operador; secundários=projeção e retorno (CA-R16). */
function isPrimaryDisplay(display: Display): boolean {
  const primaryId = screen.getPrimaryDisplay().id;
  return display.id === primaryId;
}

export function defaultAssignments(displays: Display[]): DisplayAssignment[] {
  const sorted = [...displays].sort(
    (a, b) => Number(isPrimaryDisplay(b)) - Number(isPrimaryDisplay(a)),
  );
  let projectionAssigned = false;
  let stageAssigned = false;

  return sorted.map((display, index) => {
    let role: DisplayRole = 'off';
    if (isPrimaryDisplay(display)) {
      role = 'operator';
    } else if (!projectionAssigned) {
      role = 'projection';
      projectionAssigned = true;
    } else if (!stageAssigned) {
      role = 'stage-return';
      stageAssigned = true;
    }

    return {
      displayId: display.id,
      label: displayLabel(display, index),
      role,
      bounds: { ...display.bounds },
      primary: isPrimaryDisplay(display),
      screenSize: defaultScreenSize(),
    };
  });
}

export function loadOrCreateConfig(): DisplaysConfig {
  const displays = screen.getAllDisplays();
  const saved = readDisplaysConfigFile();

  if (saved?.assignments?.length) {
    const byId = new Map(displays.map((d) => [d.id, d]));
    const assignments = displays.map((display, index) => {
      const existing = saved.assignments.find((a) => a.displayId === display.id);
      const role = existing?.role ?? 'off';
      return {
        displayId: display.id,
        label: displayLabel(display, index),
        role,
        bounds: { ...display.bounds },
        primary: isPrimaryDisplay(display),
        screenSize: existing?.screenSize ?? defaultScreenSize(),
      };
    });

    for (const item of saved.assignments) {
      if (!byId.has(item.displayId) && item.role !== 'off') {
        // monitor desligado — mantém entrada para quando voltar
        assignments.push({
          ...item,
          screenSize: item.screenSize ?? defaultScreenSize(),
        });
      }
    }

    return { assignments, updatedAt: saved.updatedAt };
  }

  const assignments = defaultAssignments(displays);
  const config: DisplaysConfig = {
    assignments,
    updatedAt: new Date().toISOString(),
  };
  writeDisplaysConfigFile(config);
  return config;
}

export function saveAssignments(assignments: DisplayAssignment[]): DisplaysConfig {
  const config: DisplaysConfig = {
    assignments,
    updatedAt: new Date().toISOString(),
  };
  writeDisplaysConfigFile(config);
  return config;
}
