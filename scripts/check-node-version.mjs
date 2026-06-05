#!/usr/bin/env node
const [major, minor, patch] = process.versions.node.split('.').map(Number);
const ok =
  major > 22 ||
  (major === 22 && (minor > 12 || (minor === 12 && patch >= 0)));
if (!ok) {
  console.error(
    `Node ${process.versions.node} não suportado. Use Node >= 22.12 (Electron 42; ex.: nvm install 22 && nvm use 22).`,
  );
  process.exit(1);
}
