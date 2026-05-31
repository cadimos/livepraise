import fs from 'node:fs';
import path from 'node:path';
import {
  defaultProjectionTypographyPrefs,
  sanitizeProjectionTypographyPrefs,
  type ProjectionTypographyPrefs,
} from '../../shared/projection-typography.js';

const FILE_NAME = 'projection-typography.json';

export function projectionTypographyFilePath(home: string): string {
  return path.join(home, FILE_NAME);
}

export function loadProjectionTypographyPrefs(
  home: string,
): ProjectionTypographyPrefs {
  const filePath = projectionTypographyFilePath(home);
  try {
    if (!fs.existsSync(filePath)) {
      return defaultProjectionTypographyPrefs();
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
    const parsed = raw as { projectionTypography?: unknown };
    return sanitizeProjectionTypographyPrefs(
      parsed.projectionTypography ?? raw,
    );
  } catch {
    return defaultProjectionTypographyPrefs();
  }
}

export function saveProjectionTypographyPrefs(
  home: string,
  prefs: ProjectionTypographyPrefs,
): ProjectionTypographyPrefs {
  const normalized = sanitizeProjectionTypographyPrefs(prefs);
  const filePath = projectionTypographyFilePath(home);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${JSON.stringify({ projectionTypography: normalized, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  );
  return normalized;
}
