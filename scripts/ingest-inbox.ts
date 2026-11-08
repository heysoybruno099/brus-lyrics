import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cleanYouTubeTitle,
  normalizeString,
  parseTimestampTTML,
  type CatalogEntry,
  type CatalogFile,
} from '@brus-lyrics/shared-types';
import { validateTTML } from '../packages/api-worker/src/lib/ttml-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface IngestOptions {
  rootDir?: string;
  inboxDir?: string;
  ttmlDir?: string;
  catalogPath?: string;
  sqlOutputPath?: string;
}

export interface IngestResult {
  processedCount: number;
  files: string[];
  sqlStatements: string[];
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

function extractTagContent(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  if (!match || !match[1]) return null;
  const raw = match[1].trim();
  const clean = raw.replace(/<[^>]+>/g, '').trim();
  return clean.length > 0 ? clean : null;
}

function extractMaxTimestamp(xml: string): number {
  const endMatches = [...xml.matchAll(/\bend=["']([^"']+)["']/gi)];
  let maxMs = 0;
  for (const match of endMatches) {
    if (match[1]) {
      const ms = parseTimestampTTML(match[1]);
      if (ms > maxMs) {
        maxMs = ms;
      }
    }
  }
  return maxMs;
}

export function ingestInbox(options: IngestOptions = {}): IngestResult {
  const rootDir = options.rootDir || path.resolve(__dirname, '..');
  const inboxDir = options.inboxDir || path.join(rootDir, 'database', 'inbox');
  const ttmlDir = options.ttmlDir || path.join(rootDir, 'database', 'ttml');
  const catalogPath = options.catalogPath || path.join(rootDir, 'database', 'catalog.json');
  const sqlOutputPath = options.sqlOutputPath || path.join(rootDir, 'database', 'migrations', 'latest_inserts.sql');

  if (!fs.existsSync(inboxDir)) {
    fs.mkdirSync(inboxDir, { recursive: true });
  }
  if (!fs.existsSync(ttmlDir)) {
    fs.mkdirSync(ttmlDir, { recursive: true });
  }

  const inboxFiles = fs
    .readdirSync(inboxDir)
    .filter((file) => file.toLowerCase().endsWith('.ttml'));

  if (inboxFiles.length === 0) {
    console.log('[Ingest] No .ttml files found in inbox. Done.');
    return { processedCount: 0, files: [], sqlStatements: [] };
  }

  console.log(`[Ingest] Found ${inboxFiles.length} file(s) in inbox to process.`);

  // Load catalog.json
  let catalogData: CatalogFile = {
    version: 1,
    updated_at: new Date().toISOString(),
    songs: [],
  };

  if (fs.existsSync(catalogPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
      if (Array.isArray(raw)) {
        catalogData.songs = raw;
      } else if (raw && Array.isArray(raw.songs)) {
        catalogData = raw;
      }
    } catch (err: unknown) {
      console.warn('[Ingest] Failed to parse existing catalog.json, creating fresh catalog structure.', err);
    }
  }

  const processedFiles: string[] = [];
  const generatedSql: string[] = [];

  for (const file of inboxFiles) {
    const sourceFilePath = path.join(inboxDir, file);
    const content = fs.readFileSync(sourceFilePath, 'utf-8');

    // Validate TTML XML before ingesting
    const validation = validateTTML(content);
    if (!validation.valid) {
      console.warn(`[Ingest] Skipping invalid TTML file "${file}": ${validation.error}`);
      continue;
    }

    // Extract metadata
    const baseName = path.basename(file, '.ttml');
    const isSpotifyBase = /^[a-zA-Z0-9]{22}$/.test(baseName);
    const isYtmBase = /^[a-zA-Z0-9_-]{11}$/.test(baseName);

    let title =
      extractTagContent(content, 'ttm:title') ||
      extractTagContent(content, 'itunes:title') ||
      extractTagContent(content, 'title') ||
      baseName;

    let artist =
      extractTagContent(content, 'itunes:artist') ||
      extractTagContent(content, 'ttm:agent') ||
      extractTagContent(content, 'artist') ||
      'Unknown Artist';

    const cleanedMedia = cleanYouTubeTitle(title, artist);
    title = cleanedMedia.title;
    if (cleanedMedia.artist) {
      artist = cleanedMedia.artist;
    }

    const spotifyId =
      extractTagContent(content, 'itunes:spotifyId') ||
      extractTagContent(content, 'spotifyId') ||
      (isSpotifyBase ? baseName : null);

    const ytmId =
      extractTagContent(content, 'itunes:youtubeId') ||
      extractTagContent(content, 'itunes:ytmId') ||
      extractTagContent(content, 'youtubeId') ||
      (isYtmBase ? baseName : null);

    const isrc =
      extractTagContent(content, 'itunes:isrc') ||
      extractTagContent(content, 'isrc') ||
      null;

    const contributor =
      extractTagContent(content, 'itunes:contributor') ||
      extractTagContent(content, 'contributor') ||
      'community';

    const durationRaw =
      extractTagContent(content, 'itunes:duration') ||
      extractTagContent(content, 'duration');

    let durationMs = 0;
    if (durationRaw) {
      const durTrim = durationRaw.trim();
      if (/^\d{4,}$/.test(durTrim)) {
        durationMs = parseInt(durTrim, 10);
      } else {
        durationMs = parseTimestampTTML(durTrim);
      }
    }
    if (isNaN(durationMs) || durationMs <= 0) {
      durationMs = extractMaxTimestamp(content);
    }

    const titleNorm = normalizeString(title);
    const artistNorm = normalizeString(artist);

    // Determine target file name and ID
    const primaryId = spotifyId || ytmId || `${artistNorm}_${titleNorm}`.replace(/\s+/g, '_').slice(0, 40);
    const destFileName = `${primaryId}.ttml`;
    const destFilePath = path.join(ttmlDir, destFileName);
    const relativeFilePath = `database/ttml/${destFileName}`;
    const songId = `song_${primaryId}`;
    const updatedAt = new Date().toISOString();

    // Move file from inbox to ttml directory
    fs.copyFileSync(sourceFilePath, destFilePath);
    fs.unlinkSync(sourceFilePath);

    // Update catalog.json
    const newEntry: CatalogEntry = {
      id: songId,
      spotify_id: spotifyId,
      ytm_id: ytmId,
      isrc,
      title,
      artist,
      title_norm: titleNorm,
      artist_norm: artistNorm,
      duration_ms: durationMs,
      file_path: relativeFilePath,
      contributor,
      updated_at: updatedAt,
    };

    const existingIndex = catalogData.songs.findIndex(
      (s) =>
        s.id === songId ||
        (spotifyId && s.spotify_id === spotifyId) ||
        (ytmId && s.ytm_id === ytmId)
    );

    if (existingIndex >= 0) {
      catalogData.songs[existingIndex] = newEntry;
      console.log(`[Ingest] Updated existing catalog entry for: ${artist} - ${title}`);
    } else {
      catalogData.songs.push(newEntry);
      console.log(`[Ingest] Added new catalog entry for: ${artist} - ${title}`);
    }

    // Generate SQL insert statement
    const spotifySql = spotifyId ? `'${escapeSql(spotifyId)}'` : 'NULL';
    const ytmSql = ytmId ? `'${escapeSql(ytmId)}'` : 'NULL';
    const isrcSql = isrc ? `'${escapeSql(isrc)}'` : 'NULL';

    const sql = `INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, updated_at)
VALUES (
  '${escapeSql(songId)}',
  ${spotifySql},
  ${ytmSql},
  ${isrcSql},
  '${escapeSql(title)}',
  '${escapeSql(artist)}',
  '${escapeSql(titleNorm)}',
  '${escapeSql(artistNorm)}',
  ${durationMs},
  '${escapeSql(relativeFilePath)}',
  '${escapeSql(contributor)}',
  '${updatedAt}'
)
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
  updated_at=excluded.updated_at;`;

    generatedSql.push(sql);
    processedFiles.push(file);
  }

  // Save updated catalog.json
  catalogData.updated_at = new Date().toISOString();
  fs.writeFileSync(catalogPath, JSON.stringify(catalogData, null, 2) + '\n', 'utf-8');
  console.log(`[Ingest] catalog.json updated with ${catalogData.songs.length} total entries.`);

  // Write SQL statements
  const sqlContent = generatedSql.join('\n\n') + '\n';
  const sqlDir = path.dirname(sqlOutputPath);
  if (!fs.existsSync(sqlDir)) {
    fs.mkdirSync(sqlDir, { recursive: true });
  }
  fs.writeFileSync(sqlOutputPath, sqlContent, 'utf-8');
  console.log(`[Ingest] SQL insert statements written to: ${sqlOutputPath}`);

  // Automatically keep embedded-lyrics.ts in sync with database/ttml
  if (!options.ttmlDir) {
    syncEmbeddedLyricsMap(rootDir);
  }

  return {
    processedCount: processedFiles.length,
    files: processedFiles,
    sqlStatements: generatedSql,
  };
}

export function syncEmbeddedLyricsMap(rootDir: string, ttmlDir?: string): void {
  const actualTtmlDir = ttmlDir || path.join(rootDir, 'database', 'ttml');
  const targetFile = path.join(rootDir, 'packages', 'api-worker', 'src', 'lib', 'embedded-lyrics.ts');
  if (!fs.existsSync(actualTtmlDir) || !fs.existsSync(path.dirname(targetFile))) {
    return;
  }

  const files = fs.readdirSync(actualTtmlDir).filter((f) => f.toLowerCase().endsWith('.ttml'));
  const lines: string[] = [
    '// Auto-generated by scripts/ingest-inbox.ts. Do not edit manually.',
    'export const embeddedTTMLMap: Record<string, string> = {',
  ];

  for (const file of files) {
    const content = fs.readFileSync(path.join(actualTtmlDir, file), 'utf-8');
    const escaped = JSON.stringify(content);
    lines.push(`  'database/ttml/${file}': ${escaped},`);
  }
  lines.push('};\n');

  for (const file of files) {
    lines.push(`embeddedTTMLMap['${file}'] = embeddedTTMLMap['database/ttml/${file}']!;`);
    const id = file.replace(/\.ttml$/i, '');
    lines.push(`embeddedTTMLMap['${id}'] = embeddedTTMLMap['database/ttml/${file}']!;`);
  }
  lines.push('');

  fs.writeFileSync(targetFile, lines.join('\n'), 'utf-8');
  console.log(`[Ingest] Synchronized ${files.length} TTML file(s) into embedded-lyrics.ts`);
}

// Direct execution check
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  try {
    const result = ingestInbox();
    console.log(`[Ingest] Successfully completed. Processed ${result.processedCount} file(s).`);
    process.exit(0);
  } catch (err: unknown) {
    console.error('[Ingest] Execution failed:', err);
    process.exit(1);
  }
}
