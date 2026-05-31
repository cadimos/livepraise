import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sanitizeErrorLogEntry, sanitizeErrorLogText } from './sanitize.js';
import type { AppendErrorLogInput, ErrorLogEntry } from './types.js';

const LOG_FILENAME = 'error-log.jsonl';
const MAX_ENTRIES = 500;
const MAX_BYTES = 512 * 1024;

function livepraiseHome(): string {
  return path.join(process.env.LIVEPRAISE_HOME ?? os.homedir(), 'livepraise');
}

function getLogPath(): string {
  return path.join(livepraiseHome(), LOG_FILENAME);
}

function ensureLogDir(): void {
  fs.mkdirSync(livepraiseHome(), { recursive: true });
}

function parseLine(line: string): ErrorLogEntry | null {
  try {
    const parsed = JSON.parse(line) as ErrorLogEntry;
    if (
      typeof parsed.id === 'string' &&
      typeof parsed.ts === 'string' &&
      (parsed.level === 'error' || parsed.level === 'warn') &&
      typeof parsed.source === 'string' &&
      typeof parsed.message === 'string'
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function readEntries(): ErrorLogEntry[] {
  const filePath = getLogPath();
  if (!fs.existsSync(filePath)) return [];

  const raw = fs.readFileSync(filePath, 'utf8');
  const entries: ErrorLogEntry[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const entry = parseLine(trimmed);
    if (entry) entries.push(entry);
  }
  return entries;
}

function trimEntries(entries: ErrorLogEntry[]): ErrorLogEntry[] {
  let trimmed = entries.slice(-MAX_ENTRIES);
  while (trimmed.length > 1) {
    const payload = `${trimmed.map((entry) => JSON.stringify(entry)).join('\n')}\n`;
    if (Buffer.byteLength(payload, 'utf8') <= MAX_BYTES) break;
    trimmed = trimmed.slice(1);
  }
  return trimmed;
}

function writeEntries(entries: ErrorLogEntry[]): void {
  ensureLogDir();
  const trimmed = trimEntries(entries);
  const payload =
    trimmed.length > 0 ? `${trimmed.map((entry) => JSON.stringify(entry)).join('\n')}\n` : '';
  fs.writeFileSync(getLogPath(), payload, 'utf8');
}

export function appendErrorLog(input: AppendErrorLogInput): ErrorLogEntry {
  const entry = sanitizeErrorLogEntry({
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    level: input.level,
    source: sanitizeErrorLogText(input.source),
    message: sanitizeErrorLogText(input.message),
    ...(input.detail ? { detail: sanitizeErrorLogText(input.detail) } : {}),
  }) as ErrorLogEntry;

  const entries = readEntries();
  entries.push(entry);
  writeEntries(entries);
  return entry;
}

export function listErrorLogs(limit = 200): ErrorLogEntry[] {
  const entries = readEntries();
  return entries.slice(-limit).reverse();
}

export function clearErrorLogs(): void {
  ensureLogDir();
  fs.writeFileSync(getLogPath(), '', 'utf8');
}

export function getErrorLogPath(): string {
  return getLogPath();
}
