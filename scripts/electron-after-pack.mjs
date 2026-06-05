#!/usr/bin/env node
/**
 * Aplica ícone e metadados ao .exe no Windows sem winCodeSign (evita symlinks no cache).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rcedit } from 'rcedit';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @param {import('app-builder-lib').AfterPackContext} context */
export default async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const { packager, appOutDir } = context;
  const exePath = path.join(appOutDir, `${packager.appInfo.productFilename}.exe`);
  const iconPath = path.join(ROOT, 'resources', 'icon', 'livepraise.ico');

  if (!fs.existsSync(exePath)) {
    throw new Error(`afterPack: executável não encontrado: ${exePath}`);
  }
  if (!fs.existsSync(iconPath)) {
    throw new Error(`afterPack: ícone não encontrado: ${iconPath}`);
  }

  const { version } = packager.appInfo;
  console.info(`afterPack: a aplicar ícone em ${path.basename(exePath)}`);
  await rcedit(exePath, {
    icon: iconPath,
    'version-string': {
      CompanyName: 'Cadimos',
      FileDescription: packager.appInfo.productName,
      ProductName: packager.appInfo.productName,
      LegalCopyright: packager.config.copyright ?? 'Copyright © Cadimos',
      OriginalFilename: path.basename(exePath),
    },
    'file-version': version,
    'product-version': version,
  });
}
