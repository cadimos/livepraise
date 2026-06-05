import fs from 'node:fs';
import path from 'node:path';

export function resolveAppIcon(appRoot: string): string | undefined {
  const dir = path.join(appRoot, 'resources', 'icon');
  const names =
    process.platform === 'win32'
      ? ['livepraise.ico', 'livepraise.png']
      : process.platform === 'darwin'
        ? ['livepraise.icns', 'livepraise.png']
        : ['livepraise.png', 'livepraise.ico'];
  for (const name of names) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}
