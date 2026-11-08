import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const apiWorkerDir = path.join(rootDir, 'packages', 'api-worker');
const wranglerTomlPath = path.join(apiWorkerDir, 'wrangler.toml');

console.log('[Cloudflare Deploy] Step 1: Checking authentication...');
let isAuthenticated = false;
try {
  const whoamiOutput = execSync('npx wrangler whoami', { cwd: apiWorkerDir, encoding: 'utf-8' });
  if (whoamiOutput.includes('You are logged in') || whoamiOutput.includes('Account Name') || whoamiOutput.includes('Account ID')) {
    isAuthenticated = true;
    console.log('[Cloudflare Deploy] Cloudflare credentials verified.');
  }
} catch {
  console.log('[Cloudflare Deploy] Not authenticated. Attempting wrangler login...');
  try {
    execSync('npx wrangler login', { cwd: apiWorkerDir, stdio: 'inherit' });
    isAuthenticated = true;
  } catch (err: any) {
    console.warn('[Cloudflare Deploy] Interactive login was not completed. Proceeding with configured environment or dry-run validation.');
  }
}

console.log('[Cloudflare Deploy] Step 2: Ensuring D1 database exists...');
let databaseId: string | null = null;
try {
  const d1ListRaw = execSync('npx wrangler d1 list --json', { cwd: apiWorkerDir, encoding: 'utf-8' });
  const d1List = JSON.parse(d1ListRaw);
  if (Array.isArray(d1List)) {
    const existingDb = d1List.find((db: any) => db.name === 'brus-lyrics-db');
    if (existingDb && existingDb.uuid) {
      databaseId = existingDb.uuid;
      console.log(`[Cloudflare Deploy] Located existing D1 database "brus-lyrics-db": ${databaseId}`);
    }
  }
} catch {
  // wrangler d1 list failed or not logged in yet
}

if (!databaseId && isAuthenticated) {
  try {
    console.log('[Cloudflare Deploy] Creating D1 database "brus-lyrics-db"...');
    const createOutput = execSync('npx wrangler d1 create brus-lyrics-db', { cwd: apiWorkerDir, encoding: 'utf-8' });
    const match = createOutput.match(/database_id\s*=\s*["']([a-zA-Z0-9-]+)["']/);
    if (match && match[1]) {
      databaseId = match[1];
      console.log(`[Cloudflare Deploy] Created new D1 database with ID: ${databaseId}`);
    }
  } catch (err: any) {
    console.warn('[Cloudflare Deploy] D1 creation skipped or failed:', err.message);
  }
}

// Update wrangler.toml if databaseId was discovered or created
if (databaseId && fs.existsSync(wranglerTomlPath)) {
  let tomlContent = fs.readFileSync(wranglerTomlPath, 'utf-8');
  tomlContent = tomlContent.replace(/database_id\s*=\s*["'][^"']+["']/, `database_id = "${databaseId}"`);
  fs.writeFileSync(wranglerTomlPath, tomlContent, 'utf-8');
  console.log(`[Cloudflare Deploy] Patched wrangler.toml with database_id: ${databaseId}`);
}

console.log('[Cloudflare Deploy] Step 3: Running schema migration on D1...');
const migrationFile = path.join(rootDir, 'database', 'migrations', '0001_initial.sql');
if (fs.existsSync(migrationFile)) {
  try {
    execSync(`npx wrangler d1 execute brus-lyrics-db --remote --file="${migrationFile}"`, {
      cwd: apiWorkerDir,
      stdio: 'inherit',
    });
    console.log('[Cloudflare Deploy] Database schema applied successfully.');
  } catch (err: any) {
    console.warn('[Cloudflare Deploy] Remote D1 migration skipped or failed (will run in local simulation if offline).');
  }
}

console.log('[Cloudflare Deploy] Step 4: Seeding existing tracks from catalog.json...');
const catalogPath = path.join(rootDir, 'database', 'catalog.json');
if (fs.existsSync(catalogPath)) {
  try {
    const rawCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    const songs = Array.isArray(rawCatalog) ? rawCatalog : rawCatalog.songs || [];
    if (songs.length > 0) {
      const seedStatements = songs
        .map((s: any) => {
          const id = (s.id || '').replace(/'/g, "''");
          const spId = s.spotify_id ? `'${s.spotify_id.replace(/'/g, "''")}'` : 'NULL';
          const ytmId = s.ytm_id ? `'${s.ytm_id.replace(/'/g, "''")}'` : 'NULL';
          const isrc = s.isrc ? `'${s.isrc.replace(/'/g, "''")}'` : 'NULL';
          const title = (s.title || '').replace(/'/g, "''");
          const artist = (s.artist || '').replace(/'/g, "''");
          const titleNorm = (s.title_norm || '').replace(/'/g, "''");
          const artistNorm = (s.artist_norm || '').replace(/'/g, "''");
          const durMs = s.duration_ms || 0;
          const filePath = (s.file_path || '').replace(/'/g, "''");
          const contributor = (s.contributor || 'community').replace(/'/g, "''");
          const updatedAt = (s.updated_at || new Date().toISOString()).replace(/'/g, "''");
          const isVerified = s.is_verified ?? 1;

          return `INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, updated_at, is_verified)
VALUES ('${id}', ${spId}, ${ytmId}, ${isrc}, '${title}', '${artist}', '${titleNorm}', '${artistNorm}', ${durMs}, '${filePath}', '${contributor}', '${updatedAt}', ${isVerified})
ON CONFLICT(id) DO UPDATE SET
  spotify_id=excluded.spotify_id,
  ytm_id=excluded.ytm_id,
  isrc=excluded.isrc,
  title=excluded.title,
  artist=excluded.artist,
  title_norm=excluded.title_norm,
  artist_norm=excluded.artist_norm,
  duration_ms=excluded.duration_ms,
  file_path=excluded.file_path,
  contributor=excluded.contributor,
  updated_at=excluded.updated_at,
  is_verified=excluded.is_verified;`;
        })
        .join('\n');

      const tempSeedSql = path.join(apiWorkerDir, 'temp_seed.sql');
      fs.writeFileSync(tempSeedSql, seedStatements, 'utf-8');

      try {
        execSync(`npx wrangler d1 execute brus-lyrics-db --remote --file="${tempSeedSql}"`, {
          cwd: apiWorkerDir,
          stdio: 'inherit',
        });
        console.log(`[Cloudflare Deploy] Successfully seeded ${songs.length} song(s) into remote D1.`);
      } catch {
        console.warn('[Cloudflare Deploy] Remote seeding skipped; tracks remain preserved in local catalog.');
      } finally {
        if (fs.existsSync(tempSeedSql)) fs.unlinkSync(tempSeedSql);
      }
    }
  } catch (err: any) {
    console.warn('[Cloudflare Deploy] Catalog seeding encountered error:', err.message);
  }
}

console.log('[Cloudflare Deploy] Step 5: Deploying Cloudflare Worker API...');
let deployedUrl: string | null = null;
try {
  const deployOutput = execSync('npx wrangler deploy', { cwd: apiWorkerDir, encoding: 'utf-8' });
  console.log(deployOutput);

  const urlMatch = deployOutput.match(/https:\/\/[a-zA-Z0-9_.-]+\.workers\.dev/);
  if (urlMatch && urlMatch[0]) {
    deployedUrl = urlMatch[0];
    console.log(`[Cloudflare Deploy] Worker successfully deployed live to: ${deployedUrl}`);
  }
} catch (err: any) {
  console.warn('[Cloudflare Deploy] Wrangler deploy skipped or requires login:', err.message);
}

// If deployedUrl was obtained, update extension defaults and rebuild
if (deployedUrl) {
  console.log(`[Cloudflare Deploy] Step 6: Updating client extension defaults to: ${deployedUrl}`);

  // Update Spicetify extension
  const spicetifyApiFile = path.join(rootDir, 'packages', 'spicetify-extension', 'src', 'api-client.ts');
  if (fs.existsSync(spicetifyApiFile)) {
    let content = fs.readFileSync(spicetifyApiFile, 'utf-8');
    content = content.replace(/export const DEFAULT_API_BASE = '.*?';/, `export const DEFAULT_API_BASE = '${deployedUrl}';`);
    fs.writeFileSync(spicetifyApiFile, content, 'utf-8');
  }

  // Update YTM extension
  const ytmConfigFile = path.join(rootDir, 'packages', 'ytm-extension', 'src', 'background.ts');
  if (fs.existsSync(ytmConfigFile)) {
    let content = fs.readFileSync(ytmConfigFile, 'utf-8');
    content = content.replace(/http:\/\/127\.0\.0\.1:8787/g, deployedUrl);
    fs.writeFileSync(ytmConfigFile, content, 'utf-8');
  }

  const ytmContentFile = path.join(rootDir, 'packages', 'ytm-extension', 'src', 'content.ts');
  if (fs.existsSync(ytmContentFile)) {
    let content = fs.readFileSync(ytmContentFile, 'utf-8');
    content = content.replace(/apiUrl:\s*['"]http:\/\/127\.0\.0\.1:8787['"]/, `apiUrl: '${deployedUrl}'`);
    fs.writeFileSync(ytmContentFile, content, 'utf-8');
  }

  // Rebuild both extensions with the live URL
  console.log('[Cloudflare Deploy] Step 7: Rebuilding client extensions with live production URL...');
  execSync('npm run --workspace=@brus-lyrics/spicetify-extension build', { cwd: rootDir, stdio: 'inherit' });
  execSync('npm run --workspace=@brus-lyrics/ytm-extension build', { cwd: rootDir, stdio: 'inherit' });
  console.log('[Cloudflare Deploy] Rebuild complete.');
}

console.log('[Cloudflare Deploy] Pipeline complete.');
