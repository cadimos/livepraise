#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.ELECTRON_DISABLE_SANDBOX = '1';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronBinary = require('electron');

const child = spawn(electronBinary, ['.', '--no-sandbox'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
