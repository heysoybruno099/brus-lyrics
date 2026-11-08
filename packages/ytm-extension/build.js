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

// Copy manifest, popup HTML, and CSS
fs.copyFileSync(path.join(__dirname, 'manifest.json'), path.join(distDir, 'manifest.json'));
fs.copyFileSync(path.join(__dirname, 'src', 'popup.html'), path.join(distDir, 'popup.html'));

// Concatenate ttml-engine styles + extension styles into dist/styles.css
const engineStylesPath = path.resolve(__dirname, '../ttml-engine/src/styles.css');
const ytmStylesPath = path.join(__dirname, 'src', 'styles.css');

let fullCss = '';
if (fs.existsSync(engineStylesPath)) {
  fullCss += fs.readFileSync(engineStylesPath, 'utf-8') + '\n';
}
if (fs.existsSync(ytmStylesPath)) {
  fullCss += fs.readFileSync(ytmStylesPath, 'utf-8');
}
fs.writeFileSync(path.join(distDir, 'styles.css'), fullCss);

try {
  // Build content script
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'content.ts')],
    bundle: true,
    outfile: path.join(distDir, 'content.js'),
    format: 'iife',
    platform: 'browser',
    target: ['chrome100'],
  });

  // Build background service worker
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'background.ts')],
    bundle: true,
    outfile: path.join(distDir, 'background.js'),
    format: 'esm',
    platform: 'browser',
    target: ['chrome100'],
  });

  // Build popup script
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'popup.ts')],
    bundle: true,
    outfile: path.join(distDir, 'popup.js'),
    format: 'iife',
    platform: 'browser',
    target: ['chrome100'],
  });

  console.log('[YTM Build] Successfully bundled YouTube Music Extension to dist/');
} catch (err) {
  console.error('[YTM Build] Build failed:', err);
  process.exit(1);
}
