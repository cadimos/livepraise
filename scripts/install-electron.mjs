#!/usr/bin/env node
/**
 * Instala o binário do Electron para a plataforma actual (dev e CI).
 * O install.js embutido no pacote electron usa require('@electron/get'), mas @electron/get@5 é ESM-only.
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronDir = path.join(root, 'node_modules', 'electron');

if (!fs.existsSync(path.join(electronDir, 'package.json'))) {
  console.warn('install-electron: pacote electron não encontrado; ignorando.');
  process.exit(0);
}

main().catch((err) => {
  console.error('install-electron:', err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});

async function main() {
  const { version } = JSON.parse(fs.readFileSync(path.join(electronDir, 'package.json'), 'utf8'));
  const { downloadArtifact } = await import('@electron/get');

  const platformPath = getPlatformPath();

  if (isInstalled(version, platformPath)) {
    console.log('install-electron: binário já presente para esta plataforma.');
    return;
  }

  const platform =
    process.env.ELECTRON_INSTALL_PLATFORM || process.env.npm_config_platform || process.platform;
  let arch = process.env.ELECTRON_INSTALL_ARCH || process.env.npm_config_arch || process.arch;

  if (
    platform === 'darwin' &&
    process.platform === 'darwin' &&
    arch === 'x64' &&
    process.env.npm_config_arch === undefined
  ) {
    try {
      const output = execSync('sysctl -in sysctl.proc_translated', { encoding: 'utf8' });
      if (output.trim() === '1') arch = 'arm64';
    } catch {
      // ignore
    }
  }

  const distDir = path.join(electronDir, 'dist');
  if (hasStaleDist(distDir, platformPath)) {
    console.log('install-electron: a limpar dist de outra plataforma…');
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  console.log(`install-electron: a descarregar Electron ${version} (${platform}/${arch})…`);

  const checksums = JSON.parse(
    fs.readFileSync(path.join(electronDir, 'checksums.json'), 'utf8'),
  );

  const zipPath = await downloadArtifact({
    version,
    artifactName: 'electron',
    force: process.env.force_no_cache === 'true',
    cacheRoot: process.env.electron_config_cache,
    checksums:
      process.env.electron_use_remote_checksums ||
      process.env.npm_config_electron_use_remote_checksums
        ? undefined
        : checksums,
    platform,
    arch,
  });

  await extractElectronZip(zipPath, distDir, platformPath);

  const distPath = process.env.ELECTRON_OVERRIDE_DIST_PATH || distDir;
  const srcTypeDefPath = path.join(distPath, 'electron.d.ts');
  const targetTypeDefPath = path.join(electronDir, 'electron.d.ts');
  if (fs.existsSync(srcTypeDefPath)) {
    fs.renameSync(srcTypeDefPath, targetTypeDefPath);
  }

  await fs.promises.writeFile(path.join(electronDir, 'path.txt'), platformPath);
  console.log('install-electron: concluído.');
}

function getPlatformPath() {
  const p =
    process.env.ELECTRON_INSTALL_PLATFORM || process.env.npm_config_platform || os.platform();
  switch (p) {
    case 'mas':
    case 'darwin':
      return 'Electron.app/Contents/MacOS/Electron';
    case 'freebsd':
    case 'openbsd':
    case 'linux':
      return 'electron';
    case 'win32':
      return 'electron.exe';
    default:
      throw new Error(`Electron builds are not available on platform: ${p}`);
  }
}

function isInstalled(version, platformPath) {
  try {
    const installedVersion = fs
      .readFileSync(path.join(electronDir, 'dist', 'version'), 'utf8')
      .replace(/^v/, '');
    if (installedVersion !== version) return false;

    const pathTxt = fs.readFileSync(path.join(electronDir, 'path.txt'), 'utf8');
    if (pathTxt.trim() !== platformPath) return false;
  } catch {
    return false;
  }

  const electronPath =
    process.env.ELECTRON_OVERRIDE_DIST_PATH ||
    path.join(electronDir, 'dist', platformPath);
  return fs.existsSync(electronPath);
}

async function extractElectronZip(zipPath, distDir, platformPath) {
  const binaryPath = path.join(distDir, platformPath);
  const failures = [];

  for (const extractor of extractors()) {
    resetDir(distDir);
    try {
      await extractor.run(zipPath, distDir);
    } catch (err) {
      failures.push(`${extractor.name} — ${err instanceof Error ? err.message : err}`);
      continue;
    }
    if (fs.existsSync(binaryPath)) {
      if (failures.length > 0) console.log(`install-electron: extraído com ${extractor.name}.`);
      return;
    }
    failures.push(`${extractor.name} — extracção incompleta (${platformPath} ausente)`);
  }

  resetDir(distDir);
  throw new Error(
    ['nenhum extractor conseguiu abrir o zip do Electron:', ...failures].join('\n  - '),
  );
}

/**
 * Extractores por ordem de preferência. O último (yauzl) é puro Node e serve de
 * garantia em ambientes sem tar/unzip utilizáveis.
 */
function* extractors() {
  for (const tar of tarCommands()) {
    yield {
      name: `tar (${tar.label})`,
      run: (zipPath, distDir) => runCommand(tar.command, [...tar.args, '-xf', zipPath, '-C', distDir]),
    };
  }

  if (process.platform !== 'win32') {
    yield {
      name: 'unzip',
      run: (zipPath, distDir) => runCommand('unzip', ['-oq', zipPath, '-d', distDir]),
    };
  }

  yield { name: 'yauzl', run: extractWithYauzl };
}

function tarCommands() {
  if (process.platform !== 'win32') {
    return [{ label: 'sistema', command: 'tar', args: [] }];
  }

  const commands = [];
  const bsdtar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
  if (fs.existsSync(bsdtar)) {
    commands.push({ label: 'bsdtar do Windows', command: bsdtar, args: [] });
  }
  // O GNU tar do Git Bash/MSYS lê "C:\..." como host remoto ("Cannot connect to C:");
  // --force-local trata o argumento como caminho local.
  commands.push({ label: 'GNU tar --force-local', command: 'tar', args: ['--force-local'] });
  commands.push({ label: 'sistema', command: 'tar', args: [] });
  return commands;
}

function runCommand(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = `${result.stderr || ''}${result.stdout || ''}`.trim();
    throw new Error(output.split('\n').pop() || `terminou com código ${result.status}`);
  }
}

async function extractWithYauzl(zipPath, distDir) {
  const { default: yauzl } = await import('yauzl');

  const zip = await new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: false }, (err, handle) =>
      err ? reject(err) : resolve(handle),
    );
  });

  try {
    await new Promise((resolve, reject) => {
      zip.on('error', reject);
      zip.on('end', resolve);
      zip.on('entry', (entry) => {
        writeZipEntry(zip, entry, distDir).then(() => zip.readEntry(), reject);
      });
      zip.readEntry();
    });
  } finally {
    zip.close();
  }
}

async function writeZipEntry(zip, entry, distDir) {
  const target = resolveInside(distDir, entry.fileName);

  if (entry.fileName.endsWith('/')) {
    await fs.promises.mkdir(target, { recursive: true });
    return;
  }

  await fs.promises.mkdir(path.dirname(target), { recursive: true });

  const mode = entry.externalFileAttributes >>> 16;
  if ((mode & 0o170000) === 0o120000) {
    const link = (await readZipEntry(zip, entry)).toString('utf8');
    resolveInside(distDir, path.join(path.dirname(entry.fileName), link));
    await fs.promises.symlink(link, target);
    return;
  }

  await pipeline(await openZipEntry(zip, entry), fs.createWriteStream(target));

  const permissions = mode & 0o777;
  if (permissions && process.platform !== 'win32') {
    await fs.promises.chmod(target, permissions);
  }
}

function openZipEntry(zip, entry) {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (err, stream) => (err ? reject(err) : resolve(stream)));
  });
}

async function readZipEntry(zip, entry) {
  const chunks = [];
  for await (const chunk of await openZipEntry(zip, entry)) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** Barra travessia de caminhos e symlinks que apontem fora de `root`. */
function resolveInside(root, entryPath) {
  const base = path.resolve(root);
  const target = path.resolve(base, entryPath);
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error(`entrada fora do destino: ${entryPath}`);
  }
  return target;
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function hasStaleDist(distDir, platformPath) {
  if (!fs.existsSync(distDir)) return false;
  const electronPath = path.join(distDir, platformPath);
  if (fs.existsSync(electronPath)) return false;
  try {
    return fs.readdirSync(distDir).length > 0;
  } catch {
    return false;
  }
}
