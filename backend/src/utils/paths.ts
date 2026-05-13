import { fileURLToPath } from 'node:url';
import path from 'node:path';

function getCurrentDir(): string {
  if (typeof __dirname !== 'undefined') return __dirname;
  return path.dirname(fileURLToPath(import.meta.url));
}

export function getDataDir(): string {
  // pkg binary → use writable directory next to the executable
  if (typeof process !== 'undefined' && (process as any).pkg) {
    return path.join(path.dirname(process.execPath), 'data');
  }
  const dir = getCurrentDir();
  if (dir.includes(path.sep + 'src' + path.sep)) {
    return path.resolve(dir, '..', '..', '..', 'data');
  }
  return path.resolve(dir, 'data');
}

export function getPublicDir(): string {
  const dir = getCurrentDir();
  if (dir.includes(path.sep + 'src' + path.sep)) {
    return path.resolve(dir, '..', '..', '..', 'frontend', 'dist');
  }
  return path.resolve(dir, 'public');
}
