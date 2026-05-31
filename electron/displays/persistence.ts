import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DisplaysConfig } from './types.js';

function livepraiseHome(): string {
  return path.join(process.env.LIVEPRAISE_HOME ?? os.homedir(), 'livepraise');
}

function configPath(): string {
  return path.join(livepraiseHome(), 'displays.json');
}

export function readDisplaysConfigFile(): DisplaysConfig | null {
  const file = configPath();
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as DisplaysConfig;
  } catch {
    return null;
  }
}

export function writeDisplaysConfigFile(config: DisplaysConfig): void {
  const file = configPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(config, null, 2), 'utf8');
}
