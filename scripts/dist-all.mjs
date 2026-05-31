#!/usr/bin/env node
/**
 * Build de release multi-OS num único comando (`npm run dist:all`).
 *
 * - macOS: Windows + Linux (todos os alvos em electron-builder.yml) + DMG
 * - Linux / Windows: Windows + Linux (DMG só num Mac — use dist:mac ou CI)
 * - Snap / Flatpak (Linux): tentativa opcional se as ferramentas estiverem instaladas
 */
import { execSync } from 'node:child_process';

function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit', env: process.env });
}

function hasCommand(name) {
  try {
    execSync(`command -v ${name}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

run('npm run build');

const platform = process.platform;
let builder = 'npx electron-builder --x64';

if (platform === 'darwin') {
  builder += ' -mwl';
} else if (platform === 'linux' || platform === 'win32') {
  builder += ' -wl --linux AppImage deb rpm pacman';
  console.warn(
    '\ndist:all — macOS (DMG) não é gerado neste sistema.\n' +
      '  Use npm run dist:mac num Mac ou o workflow CA-R40 macOS no GitHub Actions.\n',
  );
} else {
  console.error(`dist:all não suportado em ${platform}`);
  process.exit(1);
}

run(builder);

if (platform === 'linux') {
  if (hasCommand('snapcraft') || hasCommand('snap')) {
    run('npx electron-builder --linux snap --x64');
  } else {
    console.warn('dist:all — snap ignorado (instale snapcraft para incluir). Use: npm run dist:snap');
  }

  if (hasCommand('flatpak-builder')) {
    run('npx electron-builder --linux flatpak --x64');
  } else {
    console.warn(
      'dist:all — flatpak ignorado (instale flatpak-builder). Use: npm run dist:flatpak',
    );
  }
}

console.log('\ndist:all concluído — artefactos em release-builds/\n');
