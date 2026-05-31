#!/usr/bin/env node
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 5)) {
  console.error(
    `Node ${process.versions.node} não suportado. Use Node >= 22.5 (ex.: nvm use 22).`,
  );
  process.exit(1);
}
