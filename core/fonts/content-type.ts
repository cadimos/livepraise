import path from 'node:path';

export function fontContentType(fileName: string): string {
  switch (path.extname(fileName).toLowerCase()) {
    case '.woff2':
      return 'font/woff2';
    case '.woff':
      return 'font/woff';
    case '.ttf':
      return 'font/ttf';
    case '.otf':
      return 'font/otf';
    default:
      return 'application/octet-stream';
  }
}
