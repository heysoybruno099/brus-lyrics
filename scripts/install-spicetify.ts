import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const extensionDist = path.join(rootDir, 'packages', 'spicetify-extension', 'dist', 'brus-lyrics.js');

console.log('[Spicetify Installer] Step 1: Building extension bundle...');
execSync('node build.js', {
  cwd: path.join(rootDir, 'packages', 'spicetify-extension'),
  stdio: 'inherit',
});

if (!fs.existsSync(extensionDist)) {
  console.error(`[Spicetify Installer] Bundle not found at: ${extensionDist}`);
  process.exit(1);
}

const appData = process.env.APPDATA || '';
const localAppData = process.env.LOCALAPPDATA || '';

const targetDirs: string[] = [];
if (appData && fs.existsSync(path.join(appData, 'spicetify'))) {
  targetDirs.push(path.join(appData, 'spicetify', 'Extensions'));
}
if (localAppData && fs.existsSync(path.join(localAppData, 'spicetify'))) {
  targetDirs.push(path.join(localAppData, 'spicetify', 'Extensions'));
}

if (targetDirs.length === 0) {
  console.error('[Spicetify Installer] Spicetify directories not found in APPDATA or LOCALAPPDATA.');
  process.exit(1);
}

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const dest = path.join(dir, 'brus-lyrics.js');
  fs.copyFileSync(extensionDist, dest);
  console.log(`[Spicetify Installer] Copied brus-lyrics.js -> ${dest}`);
}

console.log('[Spicetify Installer] Step 2: Applying Spicetify configuration...');
try {
  let spicetifyBin = 'spicetify';
  if (process.platform === 'win32' && localAppData) {
    const candidate = path.join(localAppData, 'spicetify', 'spicetify.exe');
    if (fs.existsSync(candidate)) {
      spicetifyBin = `"${candidate}"`;
    }
  }

  execSync(`${spicetifyBin} config extensions brus-lyrics.js`, { stdio: 'inherit' });
  execSync(`${spicetifyBin} apply`, { stdio: 'inherit' });
  console.log("[Spicetify Installer] Complete: Bru's Lyrics extension successfully configured and applied to Spotify Desktop.");
} catch (err: any) {
  console.error('[Spicetify Installer] Could not run spicetify apply automatically:', err.message);
  process.exit(1);
}
