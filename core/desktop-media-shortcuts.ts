import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Nomes visíveis na área de trabalho — manter iguais ao `resources/installer.nsh`. */
export const DESKTOP_MEDIA_SHORTCUTS = [
  { folder: 'imagens', stem: 'Live Praise - Imagens' },
  { folder: 'videos', stem: 'Live Praise - Videos' },
] as const;

const MARKER_NAME = '.desktop-media-shortcuts';

export type DesktopShortcutWriter = (input: {
  linkPath: string;
  targetPath: string;
  iconPath?: string;
}) => void;

export function desktopShortcutFileName(
  stem: string,
  platform: NodeJS.Platform,
): string {
  if (platform === 'win32') return `${stem}.lnk`;
  if (platform === 'linux') return `${stem}.desktop`;
  return stem;
}

export function resolveDesktopDir(options: {
  homedir: string;
  env: NodeJS.Dict<string | undefined>;
  platform: NodeJS.Platform;
}): string | null {
  const { homedir, env, platform } = options;

  if (env.LIVEPRAISE_HOME) {
    const dir = path.join(homedir, 'Desktop');
    return fs.existsSync(dir) ? dir : null;
  }

  if (platform === 'win32') {
    const userProfile = env.USERPROFILE || homedir;
    const candidates = [
      path.join(userProfile, 'Desktop'),
      env.OneDrive ? path.join(env.OneDrive, 'Desktop') : null,
    ];
    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  if (platform === 'linux') {
    const xdg = env.XDG_DESKTOP_DIR?.trim();
    if (xdg) {
      const expanded = xdg.replace(/^\$HOME/, homedir).replace(/^~/, homedir);
      if (fs.existsSync(expanded)) return expanded;
    }
  }

  const dir = path.join(homedir, 'Desktop');
  return fs.existsSync(dir) ? dir : null;
}

function markerPath(livepraiseHome: string): string {
  return path.join(livepraiseHome, MARKER_NAME);
}

function writeLinuxDesktopFile(linkPath: string, targetPath: string): void {
  const url = pathToFileURL(targetPath).href;
  const name = path.basename(linkPath, '.desktop');
  const body = [
    '[Desktop Entry]',
    'Version=1.0',
    'Type=Link',
    `Name=${name}`,
    'Comment=Pasta de mídia do Live Praise',
    `URL=${url}`,
    'Icon=folder',
    '',
  ].join('\n');
  fs.writeFileSync(linkPath, body, 'utf8');
  try {
    fs.chmodSync(linkPath, 0o755);
  } catch {
    /* ignore */
  }
}

function writeWindowsLnk(input: {
  linkPath: string;
  targetPath: string;
  iconPath?: string;
}): void {
  const q = (value: string) => value.replace(/'/g, "''");
  const iconLine = input.iconPath
    ? `$s.IconLocation = '${q(input.iconPath)}'`
    : '';
  const script = [
    `$s = (New-Object -ComObject WScript.Shell).CreateShortcut('${q(input.linkPath)}')`,
    `$s.TargetPath = '${q(input.targetPath)}'`,
    `$s.WorkingDirectory = '${q(input.targetPath)}'`,
    iconLine,
    '$s.Save()',
  ]
    .filter(Boolean)
    .join('; ');

  execFileSync('powershell.exe', ['-NoProfile', '-STA', '-NonInteractive', '-Command', script], {
    windowsHide: true,
    timeout: 20_000,
    stdio: 'ignore',
  });
}

function defaultWriter(platform: NodeJS.Platform): DesktopShortcutWriter {
  if (platform === 'win32') return writeWindowsLnk;
  if (platform === 'linux') {
    return ({ linkPath, targetPath }) => writeLinuxDesktopFile(linkPath, targetPath);
  }
  return ({ linkPath, targetPath }) => {
    if (fs.existsSync(linkPath)) return;
    fs.symlinkSync(targetPath, linkPath);
  };
}

/**
 * Cria atalhos na área de trabalho para `imagens/` e `videos/`.
 * Idempotente: se o marcador já existir, não volta a criar (respeita remoção pelo utilizador).
 * Nunca lança — falhas de atalho não devem impedir o arranque.
 */
export function ensureDesktopMediaShortcuts(options: {
  homedir: string;
  livepraiseHome: string;
  platform?: NodeJS.Platform;
  env?: NodeJS.Dict<string | undefined>;
  iconPath?: string;
  writeShortcut?: DesktopShortcutWriter;
}): string[] {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const created: string[] = [];

  try {
    fs.mkdirSync(options.livepraiseHome, { recursive: true });
    const marker = markerPath(options.livepraiseHome);
    if (fs.existsSync(marker)) return created;

    const desktopDir = resolveDesktopDir({
      homedir: options.homedir,
      env,
      platform,
    });
    if (!desktopDir) return created;

    const writer = options.writeShortcut ?? defaultWriter(platform);

    for (const item of DESKTOP_MEDIA_SHORTCUTS) {
      const targetPath = path.join(options.livepraiseHome, item.folder);
      fs.mkdirSync(targetPath, { recursive: true });

      const linkPath = path.join(
        desktopDir,
        desktopShortcutFileName(item.stem, platform),
      );
      if (fs.existsSync(linkPath)) continue;

      writer({
        linkPath,
        targetPath,
        iconPath: options.iconPath,
      });
      created.push(linkPath);
    }

    fs.writeFileSync(marker, `${new Date().toISOString()}\n`, 'utf8');
  } catch (error) {
    console.warn(
      '[livepraise] não foi possível criar atalhos da pasta de mídia na área de trabalho:',
      error instanceof Error ? error.message : error,
    );
  }

  return created;
}
