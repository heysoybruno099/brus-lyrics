import * as esbuild from 'esbuild';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy manifest.json
fs.copyFileSync(
  path.join(__dirname, 'manifest.json'),
  path.join(distDir, 'manifest.json')
);

// Bundle with esbuild
try {
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'index.ts')],
    bundle: true,
    outfile: path.join(distDir, 'brus-lyrics.js'),
    format: 'iife',
    globalName: 'BrusLyricsSpicetify',
    target: ['chrome100', 'firefox100'],
    sourcemap: false,
    minify: false,
    platform: 'browser',
  });

  console.log('[Spicetify Build] Successfully bundled dist/brus-lyrics.js and dist/manifest.json');
} catch (err) {
  console.error('[Spicetify Build] Build failed:', err);
  process.exit(1);
}
