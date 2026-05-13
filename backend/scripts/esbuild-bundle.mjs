import * as esbuild from 'esbuild';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function main() {
  // 1. Bundle backend with esbuild
  console.log('[build] Bundling backend...');
  await esbuild.build({
    entryPoints: [path.join(root, 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: path.join(root, 'dist-bundle', 'index.cjs'),
    // Externalize native modules and node built-ins
    packages: 'external',
    // Handle TypeScript decorators etc.
    loader: { '.ts': 'ts' },
  });
  console.log('[build] Backend bundled -> dist-bundle/index.cjs');

  // 2. Copy frontend dist to dist-bundle/public
  const frontendDist = path.resolve(root, '..', 'frontend', 'dist');
  const publicDir = path.join(root, 'dist-bundle', 'public');

  if (!existsSync(frontendDist)) {
    console.log('[build] WARNING: frontend/dist not found. Run "npm run build:frontend" first.');
  } else {
    // Remove existing public dir
    if (existsSync(publicDir)) {
      cpSync(publicDir, path.join(root, 'dist-bundle', 'public_bak'), { recursive: true, force: true });
    }
    mkdirSync(publicDir, { recursive: true });
    copyRecursive(frontendDist, publicDir);
    console.log('[build] Frontend static files copied -> dist-bundle/public');
  }

  // 3. Ensure data directory exists
  const dataDir = path.join(root, 'dist-bundle', 'data');
  mkdirSync(dataDir, { recursive: true });
  console.log('[build] Data dir ready -> dist-bundle/data');

  console.log('[build] Done!');
}

function copyRecursive(src, dest) {
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

main().catch((err) => {
  console.error('[build] Failed:', err);
  process.exit(1);
});
