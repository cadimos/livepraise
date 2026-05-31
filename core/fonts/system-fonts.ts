import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { SystemFontItem } from './types.js';

const execFileAsync = promisify(execFile);

function dedupeAndSort(items: SystemFontItem[]): SystemFontItem[] {
  const byFamily = new Map<string, SystemFontItem>();
  for (const item of items) {
    const key = item.family.trim();
    if (!key) continue;
    if (!byFamily.has(key)) {
      byFamily.set(key, { family: key, localizedName: item.localizedName.trim() || key });
    }
  }
  return [...byFamily.values()].sort((a, b) =>
    a.family.localeCompare(b.family, 'pt-BR', { sensitivity: 'base' }),
  );
}

async function listLinuxFonts(): Promise<SystemFontItem[]> {
  try {
    const { stdout } = await execFileAsync('fc-list', [':family'], {
      encoding: 'utf8',
      timeout: 15_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    const items: SystemFontItem[] = [];
    for (const line of stdout.split('\n')) {
      const family = line.split(',')[0]?.trim();
      if (!family) continue;
      items.push({ family, localizedName: family });
    }
    return dedupeAndSort(items);
  } catch {
    return [];
  }
}

async function listDarwinFonts(): Promise<SystemFontItem[]> {
  try {
    const { stdout } = await execFileAsync(
      'system_profiler',
      ['SPFontsDataType', '-json'],
      { encoding: 'utf8', timeout: 30_000, maxBuffer: 16 * 1024 * 1024 },
    );
    const data = JSON.parse(stdout) as {
      SPFontsDataType?: Array<{ _name?: string; family?: string }>;
    };
    const rows = data.SPFontsDataType ?? [];
    const items: SystemFontItem[] = [];
    for (const row of rows) {
      const family = String(row.family ?? row._name ?? '').trim();
      if (!family) continue;
      items.push({ family, localizedName: family });
    }
    return dedupeAndSort(items);
  } catch {
    return [];
  }
}

async function listWindowsFonts(): Promise<SystemFontItem[]> {
  const ps = [
    '-NoProfile',
    '-Command',
    "Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts' | Select-Object -ExpandProperty PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object { $_.Name -replace '\\s*\\(TrueType\\)$','' } | Sort-Object -Unique",
  ];
  try {
    const { stdout } = await execFileAsync('powershell.exe', ps, {
      encoding: 'utf8',
      timeout: 20_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    const items: SystemFontItem[] = [];
    for (const line of stdout.split('\n')) {
      const family = line.trim();
      if (!family) continue;
      items.push({ family, localizedName: family });
    }
    return dedupeAndSort(items);
  } catch {
    return [];
  }
}

/** Enumera fontes instaladas no SO (sem paths absolutos). */
export async function listSystemFonts(): Promise<SystemFontItem[]> {
  switch (process.platform) {
    case 'linux':
      return listLinuxFonts();
    case 'darwin':
      return listDarwinFonts();
    case 'win32':
      return listWindowsFonts();
    default:
      return [];
  }
}
