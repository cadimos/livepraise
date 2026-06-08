import { screen, type Display } from 'electron';
import { mergeDisplayAssignments } from './merge-assignments.js';
import type { DisplayAssignment, DisplaysConfig } from './types.js';
import { readDisplaysConfigFile, writeDisplaysConfigFile } from './persistence.js';

function mergedAssignmentsDiffer(
  saved: DisplayAssignment[],
  merged: DisplayAssignment[],
): boolean {
  const savedConnected = saved.filter((a) => a.connected !== false);
  const mergedConnected = merged.filter((a) => a.connected !== false);

  if (savedConnected.length !== mergedConnected.length) return true;

  for (const assignment of mergedConnected) {
    const previous = savedConnected.find((a) => a.displayId === assignment.displayId);
    if (!previous) return true;
    if (previous.role !== assignment.role) return true;
    if (JSON.stringify(previous.bounds) !== JSON.stringify(assignment.bounds)) {
      return true;
    }
  }

  const staleConnected = savedConnected.some(
    (a) => !mergedConnected.some((m) => m.displayId === a.displayId),
  );
  return staleConnected;
}

function isPrimaryDisplay(display: Display): boolean {
  return display.id === screen.getPrimaryDisplay().id;
}

function toConnected(display: Display): {
  id: number;
  label?: string | null;
  bounds: Display['bounds'];
} {
  return { id: display.id, label: display.label, bounds: display.bounds };
}

export function loadOrCreateConfig(): DisplaysConfig {
  const displays = screen.getAllDisplays();
  const saved = readDisplaysConfigFile();
  const primaryId = screen.getPrimaryDisplay().id;

  if (saved?.assignments?.length) {
    const assignments = mergeDisplayAssignments(
      displays.map(toConnected),
      saved.assignments,
      primaryId,
    );
    if (mergedAssignmentsDiffer(saved.assignments, assignments)) {
      const config: DisplaysConfig = {
        assignments,
        updatedAt: new Date().toISOString(),
      };
      writeDisplaysConfigFile(config);
      return config;
    }
    return { assignments, updatedAt: saved.updatedAt };
  }

  const assignments = mergeDisplayAssignments(
    displays.map(toConnected),
    null,
    primaryId,
  );
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
