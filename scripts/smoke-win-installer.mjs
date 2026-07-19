#!/usr/bin/env node
/**
 * Ciclo completo Windows: desinstalar → build → instalar → executar com logs.
 * Falha se detectar erro de arranque ou CAD-194 indisponível.
 */
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

if (process.platform !== 'win32') {
  console.error('smoke:win-installer só pode ser executado no Windows.');
  process.exit(1);
}

delete process.env.ELECTRON_RUN_AS_NODE;

const projectRoot = process.cwd();
const localAppData =
  process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');
const programsRoot = path.join(localAppData, 'Programs');

/** Pastas candidatas (histórico + executableName actual). */
const INSTALL_DIR_CANDIDATES = ['LivePraise', 'livepraise', 'Live Praise'];
const APP_EXE_CANDIDATES = ['LivePraise.exe', 'Live Praise.exe'];

const releaseDir = path.join(projectRoot, 'release-builds');
const bootLogPath = path.join(
  process.env.LOCALAPPDATA ?? os.homedir(),
  'livepraise',
  'boot.log',
);

function run(command) {
  console.log(`\n> ${command}\n`);
  execSync(command, { stdio: 'inherit', cwd: projectRoot, env: process.env });
}

function listProgramsDirs() {
  try {
    return fs.readdirSync(programsRoot);
  } catch {
    return [];
  }
}

/**
 * Resolve instalação após NSIS /S.
 * Prefere LivePraise.exe (executableName); aceita layouts antigos com espaço.
 */
function resolveInstalledApp() {
  for (const dirName of INSTALL_DIR_CANDIDATES) {
    const installDir = path.join(programsRoot, dirName);
    if (!fs.existsSync(installDir)) continue;
    for (const exeName of APP_EXE_CANDIDATES) {
      const appExe = path.join(installDir, exeName);
      if (fs.existsSync(appExe)) {
        return { installDir, appExe, exeName };
      }
    }
    // Fallback: qualquer .exe que não seja o desinstalador.
    try {
      const exe = fs
        .readdirSync(installDir)
        .find((name) => /\.exe$/i.test(name) && !/^Uninstall/i.test(name));
      if (exe) {
        return {
          installDir,
          appExe: path.join(installDir, exe),
          exeName: exe,
        };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function stopRunningApp() {
  for (const image of APP_EXE_CANDIDATES) {
    try {
      execSync(`taskkill /F /IM "${image}" /T`, { stdio: 'ignore' });
    } catch {
      // não estava em execução
    }
  }
}

function uninstallCurrentVersion() {
  for (const dirName of INSTALL_DIR_CANDIDATES) {
    const installDir = path.join(programsRoot, dirName);
    if (!fs.existsSync(installDir)) continue;

    const uninstallExe = fs
      .readdirSync(installDir)
      .find((file) => /^Uninstall.*\.exe$/i.test(file));

    if (uninstallExe) {
      const uninstallPath = path.join(installDir, uninstallExe);
      run(
        `powershell -NoProfile -Command "Start-Process -FilePath '${uninstallPath.replace(/'/g, "''")}' -ArgumentList '/S' -Wait"`,
      );
    }

    if (fs.existsSync(installDir)) {
      fs.rmSync(installDir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 300,
      });
    }
  }
}

function latestInstallerPath() {
  const files = fs
    .readdirSync(releaseDir)
    .filter((name) => /^Live Praise Setup .*\.exe$/i.test(name))
    .map((name) => ({
      fullPath: path.join(releaseDir, name),
      mtimeMs: fs.statSync(path.join(releaseDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (files.length === 0) throw new Error('Instalador não encontrado em release-builds/.');
  return files[0].fullPath;
}

function readBootLog() {
  try {
    return fs.readFileSync(bootLogPath, 'utf8');
  } catch {
    return '';
  }
}

function assertNoBootFailure(logText) {
  if (/FALHA:|app\.asar\.unpacked|Cannot find module/i.test(logText)) {
    throw new Error(`Erro no boot.log:\n${logText}`);
  }
}

function describeInstallFailure() {
  const dirs = listProgramsDirs();
  const lines = [
    `Executável Live Praise não encontrado sob ${programsRoot}.`,
    `Pastas candidatas: ${INSTALL_DIR_CANDIDATES.join(', ')}.`,
    `Conteúdo de Programs/: ${dirs.length ? dirs.join(', ') : '(vazio ou inacessível)'}`,
  ];
  for (const dirName of INSTALL_DIR_CANDIDATES) {
    const installDir = path.join(programsRoot, dirName);
    if (!fs.existsSync(installDir)) continue;
    try {
      lines.push(`  ${dirName}/ → ${fs.readdirSync(installDir).join(', ')}`);
    } catch (err) {
      lines.push(`  ${dirName}/ → (erro: ${err instanceof Error ? err.message : err})`);
    }
  }
  return lines.join('\n');
}

async function launchInstalledAndVerify() {
  const installed = resolveInstalledApp();
  if (!installed) {
    throw new Error(describeInstallFailure());
  }

  const { installDir, appExe } = installed;
  console.log(`smoke:win-installer: instalado em ${appExe}`);

  const resourcesDir = path.join(installDir, 'resources');
  const hasAsar = fs.existsSync(path.join(resourcesDir, 'app.asar'));
  const hasAppDir = fs.existsSync(path.join(resourcesDir, 'app'));
  const hasMain = fs.existsSync(path.join(resourcesDir, 'app', 'dist', 'electron', 'main.js'));
  if (hasAsar || !hasAppDir || !hasMain) {
    throw new Error(
      `Layout inválido após instalação. app.asar=${hasAsar} appDir=${hasAppDir} mainJs=${hasMain}`,
    );
  }

  try {
    fs.unlinkSync(bootLogPath);
  } catch {
    // sem log anterior
  }

  return await new Promise((resolve, reject) => {
    console.log(`\n> Executando: ${appExe}\n`);
    const childEnv = { ...process.env, LIVEPRAISE_SERVER_WAIT_MS: '90000' };
    delete childEnv.ELECTRON_RUN_AS_NODE;

    const child = spawn(appExe, [], {
      cwd: installDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: childEnv,
    });

    let output = '';
    const onData = (chunk) => {
      const text = String(chunk);
      output += text;
      process.stdout.write(text);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    const deadline = Date.now() + 90_000;
    let finished = false;

    const interval = setInterval(async () => {
      const bootLog = readBootLog();
      if (/FALHA:/i.test(bootLog)) {
        clearInterval(interval);
        if (!finished) {
          finished = true;
          stopRunningApp();
          reject(new Error(`Falha no boot log:\n${bootLog}`));
        }
        return;
      }

      try {
        const health = await fetch('http://127.0.0.1:3000/health');
        if (health.ok) {
          const body = await health.json();
          if (body.features?.cad194 === true) {
            const ping = await fetch('http://127.0.0.1:3000/video/importar/ping');
            const pingBody = await ping.json();
            if (pingBody.cad194 === true) {
              clearInterval(interval);
              if (!finished) {
                finished = true;
                stopRunningApp();
                assertNoBootFailure(readBootLog());
                resolve({ output, bootLog: readBootLog() });
              }
            }
          }
        }
      } catch {
        // ainda a subir
      }

      if (Date.now() > deadline) {
        clearInterval(interval);
        if (!finished) {
          finished = true;
          stopRunningApp();
          const bootLog = readBootLog();
          reject(
            new Error(
              `Timeout aguardando CAD-194 (90s).\n--- stdout/stderr ---\n${output}\n--- boot.log ---\n${bootLog}`,
            ),
          );
        }
      }
    }, 1000);

    child.on('exit', () => {
      // Ignorado: o .exe launcher pode terminar com code 0 enquanto o app real continua.
    });
  });
}

async function main() {
  const skipBuild = process.argv.includes('--skip-build');

  stopRunningApp();
  uninstallCurrentVersion();
  if (skipBuild) {
    latestInstallerPath();
    console.log('smoke:win-installer: --skip-build (instalador já em release-builds/)');
  } else {
    run('npm run dist:win');
  }

  const installer = latestInstallerPath();
  const installerEscaped = installer.replace(/'/g, "''");
  run(
    `powershell -NoProfile -Command "Start-Process -FilePath '${installerEscaped}' -ArgumentList '/S' -Wait"`,
  );

  // NSIS /S pode demorar um instante a finalizar ficheiros no runner.
  for (let i = 0; i < 20 && !resolveInstalledApp(); i += 1) {
    await new Promise((r) => setTimeout(r, 500));
  }

  await launchInstalledAndVerify();
  console.log(
    '\nsmoke:win-installer OK — app instalado, servidor CAD-194 respondeu, sem erros no boot log.',
  );
}

main().catch((err) => {
  console.error(`\nsmoke:win-installer FALHOU: ${err instanceof Error ? err.message : String(err)}`);
  stopRunningApp();
  process.exit(1);
});
