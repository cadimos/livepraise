import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isSafePathSegment } from '../security/safe-segment.js';

function appRoot(): string {
  return process.env.LIVEPRAISE_APP_ROOT ?? process.cwd();
}

function livepraiseHome(): string {
  return path.join(process.env.LIVEPRAISE_HOME ?? os.homedir(), 'livepraise');
}

function localeCandidates(locale: string): string[] {
  const file = `${locale}.json`;
  return [
    path.join(livepraiseHome(), 'locales', file),
    path.join(appRoot(), 'locales', file),
    path.join(appRoot(), 'install', 'locales', file),
  ];
}

export function listLocales(): string[] {
  const locales = new Set<string>();

  for (const root of [
    path.join(appRoot(), 'locales'),
    path.join(appRoot(), 'install', 'locales'),
    path.join(livepraiseHome(), 'locales'),
  ]) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root)) {
      if (entry.endsWith('.json')) {
        locales.add(entry.replace(/\.json$/, ''));
      }
    }
  }

  return [...locales].sort();
}

export function resolveLocale(locale: string): Record<string, unknown> | null {
  if (!isSafePathSegment(locale)) return null;

  for (const candidate of localeCandidates(locale)) {
    if (!fs.existsSync(candidate)) continue;
    try {
      return JSON.parse(fs.readFileSync(candidate, 'utf8')) as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  return null;
}
