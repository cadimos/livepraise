import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AppendTextfillDiagnosticInput, TextfillDiagnosticEntry } from './types.js';

const LOG_FILENAME = 'textfill-diagnostics.jsonl';
const MAX_ENTRIES = 800;
const MAX_BYTES = 1024 * 1024;

function livepraiseHome(): string {
  return path.join(process.env.LIVEPRAISE_HOME ?? os.homedir(), 'livepraise');
}

export function getTextfillDiagnosticsPath(): string {
  return path.join(livepraiseHome(), LOG_FILENAME);
}

function ensureLogDir(): void {
  fs.mkdirSync(livepraiseHome(), { recursive: true });
}

function parseLine(line: string): TextfillDiagnosticEntry | null {
  try {
    const parsed = JSON.parse(line) as TextfillDiagnosticEntry;
    if (
      typeof parsed.id === 'string' &&
      typeof parsed.ts === 'string' &&
      typeof parsed.surface === 'string' &&
      typeof parsed.resultFontPx === 'number'
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function readEntries(): TextfillDiagnosticEntry[] {
  const filePath = getTextfillDiagnosticsPath();
  if (!fs.existsSync(filePath)) return [];

  const raw = fs.readFileSync(filePath, 'utf8');
  const entries: TextfillDiagnosticEntry[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const entry = parseLine(trimmed);
    if (entry) entries.push(entry);
  }
  return entries;
}

function trimEntries(entries: TextfillDiagnosticEntry[]): TextfillDiagnosticEntry[] {
  let trimmed = entries.slice(-MAX_ENTRIES);
  while (trimmed.length > 1) {
    const payload = `${trimmed.map((entry) => JSON.stringify(entry)).join('\n')}\n`;
    if (Buffer.byteLength(payload, 'utf8') <= MAX_BYTES) break;
    trimmed = trimmed.slice(1);
  }
  return trimmed;
}

function writeEntries(entries: TextfillDiagnosticEntry[]): void {
  ensureLogDir();
  const trimmed = trimEntries(entries);
  const payload =
    trimmed.length > 0 ? `${trimmed.map((entry) => JSON.stringify(entry)).join('\n')}\n` : '';
  fs.writeFileSync(getTextfillDiagnosticsPath(), payload, 'utf8');
}

function sanitizeSnippet(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 120);
}

export function appendTextfillDiagnostic(
  input: AppendTextfillDiagnosticInput,
): TextfillDiagnosticEntry {
  const entry: TextfillDiagnosticEntry = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    ...input,
    textSnippet: sanitizeSnippet(input.textSnippet),
    surface: String(input.surface ?? 'unknown').slice(0, 64),
    location: String(input.location ?? '').slice(0, 512),
    userAgent: String(input.userAgent ?? '').slice(0, 512),
  };
  const entries = readEntries();
  entries.push(entry);
  writeEntries(entries);
  return entry;
}

export function appendTextfillDiagnostics(
  inputs: AppendTextfillDiagnosticInput[],
): TextfillDiagnosticEntry[] {
  if (!inputs.length) return [];
  const entries = readEntries();
  const created = inputs.map((input) => {
    const entry: TextfillDiagnosticEntry = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      ...input,
      textSnippet: sanitizeSnippet(input.textSnippet),
      surface: String(input.surface ?? 'unknown').slice(0, 64),
      location: String(input.location ?? '').slice(0, 512),
      userAgent: String(input.userAgent ?? '').slice(0, 512),
    };
    entries.push(entry);
    return entry;
  });
  writeEntries(entries);
  return created;
}

export function listTextfillDiagnostics(limit = 200): TextfillDiagnosticEntry[] {
  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(1, Math.trunc(limit)), MAX_ENTRIES)
    : 200;
  return readEntries().slice(-safeLimit);
}

export function clearTextfillDiagnostics(): void {
  const filePath = getTextfillDiagnosticsPath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function textfillDiagnosticsMeta(): {
  path: string;
  count: number;
  bytes: number;
} {
  const filePath = getTextfillDiagnosticsPath();
  if (!fs.existsSync(filePath)) {
    return { path: filePath, count: 0, bytes: 0 };
  }
  const stat = fs.statSync(filePath);
  const count = readEntries().length;
  return { path: filePath, count, bytes: stat.size };
}
