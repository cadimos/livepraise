import fs from 'node:fs';
import path from 'node:path';
import { cp } from 'node:fs/promises';
import { ensureDesktopMediaShortcuts } from '../core/desktop-media-shortcuts.js';
import {
  getAppRoot,
  getDatabasePath,
  getHomedir,
  getLivepraiseHome,
  resolveInstallSource,
} from './config/paths.js';

/** Copia install/livepraise → ~/livepraise na primeira instalação (CA-05). */
export async function ensureLivepraiseDataDir(): Promise<void> {
  const dbPath = getDatabasePath();
  if (!fs.existsSync(dbPath)) {
    const target = getLivepraiseHome();
    const source = resolveInstallSource();

    if (!fs.existsSync(source)) {
      throw new Error(`Payload de instalação não encontrado: ${source}`);
    }

    fs.mkdirSync(target, { recursive: true });
    await cp(source, target, { recursive: true, force: false });

    if (!fs.existsSync(dbPath)) {
      throw new Error(`Bootstrap concluído mas ${dbPath} não foi criado`);
    }
  }

  ensureMediaDesktopShortcuts();
}

function ensureMediaDesktopShortcuts(): void {
  const home = getLivepraiseHome();
  const appRoot = getAppRoot();
  const iconCandidates = [
    path.join(appRoot, 'resources', 'icon', 'livepraise.ico'),
    path.join(appRoot, 'LivePraise.exe'),
  ];
  const iconPath = iconCandidates.find((candidate) => fs.existsSync(candidate));
  ensureDesktopMediaShortcuts({
    homedir: getHomedir(),
    livepraiseHome: home,
    iconPath,
  });
}
