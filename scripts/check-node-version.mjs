#!/usr/bin/env node
const [major] = process.versions.node.split('.').map(Number);
const ok = major >= 24;
if (!ok) {
  console.error(
    `Node ${process.versions.node} não suportado. Use Node >= 24 (ex.: nvm install 24 && nvm use 24).`,
  );
  process.exit(1);
}
