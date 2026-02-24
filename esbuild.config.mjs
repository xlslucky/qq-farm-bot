import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist');

function copyDir(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

await esbuild.build({
  entryPoints: ['client.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: join(distDir, 'bundle.js'),
  external: ['ws', 'axios', 'qrcode-terminal'],
  format: 'cjs',
  minify: true,
  sourcemap: false,
});

copyDir(join(__dirname, 'proto'), join(distDir, 'proto'));
copyDir(join(__dirname, 'gameConfig'), join(distDir, 'gameConfig'));

const seedShopFile = join(__dirname, 'tools', 'seed-shop-merged-export.json');
if (existsSync(seedShopFile)) {
    copyFileSync(seedShopFile, join(distDir, 'seed-shop-merged-export.json'));
    console.log('Build complete: dist/bundle.js, dist/proto/, dist/gameConfig/, dist/seed-shop-merged-export.json');
} else {
    console.log('Build complete: dist/bundle.js, dist/proto/, dist/gameConfig/');
}
