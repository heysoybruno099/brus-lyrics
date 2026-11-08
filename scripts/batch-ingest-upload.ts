import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lrcToTTML } from '../packages/ttml-engine/src/lrc-converter.js';
import { validateTTML } from '../packages/ttml-engine/src/validator.js';
import { ingestInbox, syncEmbeddedLyricsMap } from './ingest-inbox.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceFolder = 'C:\\Users\\Bruno PC\\Downloads\\BRU LYRICS TO UPLOAD';
const inboxDir = path.join(rootDir, 'database', 'inbox');

interface SongMetadata {
  sourceFile: string;
  title: string;
  artist: string;
  album: string;
  spotifyId: string;
  youtubeId?: string;
  isrc?: string;
  durationMs: number;
}

const SONG_REGISTRY: SongMetadata[] = [
  {
    sourceFile: 'Daddy Yankee - Me Quedo.ttml',
    title: 'Me Quedo',
    artist: 'Daddy Yankee',
    album: 'Los Homerun-es',
    spotifyId: '7catwNsmz9tHX68C1SOfcj',
    youtubeId: 'O6b2KX0FOSo',
    durationMs: 72013,
  },
  {
    sourceFile: 'Ed Sheeran - Shape of You.ttml',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    album: '÷ (Deluxe)',
    spotifyId: '7qiZfU4dY1lWllzX7mPBI3',
    youtubeId: 'JGwWNGJdvx8',
    durationMs: 233712,
  },
  {
    sourceFile: 'El Alfa - PANTI Y COLALE 2.0.ttml',
    title: 'PANTI Y COLALE 2.0',
    artist: 'El Alfa',
    album: 'PANTI Y COLALE 2.0',
    spotifyId: '11mDIi9MNeOXoeSqiYQnWI',
    youtubeId: '25tKbsTDRS8',
    durationMs: 279685,
  },
  {
    sourceFile: 'El General, Anayka - Rica y Apretadita (feat. Anayka).ttml',
    title: 'Rica y Apretadita',
    artist: 'El General, Anayka',
    album: 'Originales',
    spotifyId: '2XRqhe4lmCQVaUWawR5wRo',
    durationMs: 261866,
  },
  {
    sourceFile: 'Grupo Soñador - El Paso del Gigante.lrc',
    title: 'El Paso del Gigante',
    artist: 'Grupo Soñador',
    album: 'Antología De 20 Aniversario',
    spotifyId: '5tRNzcUvgWGtuOozOR7skP',
    isrc: 'USA2P2477184',
    durationMs: 216950,
  },
  {
    sourceFile: 'Harry Styles - As It Was.ttml',
    title: 'As It Was',
    artist: 'Harry Styles',
    album: "Harry's House",
    spotifyId: '4Dvkj6JhhA12EX05fT7y2e',
    youtubeId: 'H5v3kku4y6Q',
    durationMs: 167303,
  },
  {
    sourceFile: 'KAROL G - BbY WOW.ttml',
    title: 'BbY WOW',
    artist: 'KAROL G',
    album: 'NO ME ARREPIENTO DE SENTIR TANTO',
    spotifyId: '3h5T5JypYU7huFiVYhv1dr',
    durationMs: 225834,
  },
  {
    sourceFile: 'Post Malone - Sunflower - Spider-Man_ Into the Spider-Verse.ttml',
    title: 'Sunflower',
    artist: 'Post Malone, Swae Lee',
    album: 'Spider-Man: Into the Spider-Verse',
    spotifyId: '3KkXRkHbMCARz0aVfEt68P',
    youtubeId: 'ApXoWvfEYVU',
    durationMs: 158040,
  },
  {
    sourceFile: 'Randy Travis - Forever and Ever, Amen.ttml',
    title: 'Forever and Ever, Amen',
    artist: 'Randy Travis',
    album: 'Always & Forever',
    spotifyId: '1ipcb9qXpSHWhSUvdxJhsx',
    durationMs: 212640,
  },
  {
    sourceFile: 'Sérgio Mendes - Magalenha.ttml',
    title: 'Magalenha',
    artist: 'Sérgio Mendes',
    album: 'Brasileiro',
    spotifyId: '36SJ7ZFx8J1f1RsewmUwMX',
    youtubeId: '9tQRhAuJHGE',
    durationMs: 216933,
  },
  {
    sourceFile: 'The Weeknd - Blinding Lights.ttml',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    spotifyId: '0VjIjW4GlUZAMYd2vXMi3b',
    youtubeId: '4NRXx6U8ABQ',
    durationMs: 200040,
  },
  {
    sourceFile: 'Third World - 1865 (96º In The Shade).lrc',
    title: '1865 (96º In The Shade)',
    artist: 'Third World',
    album: '96 Degrees In The Shade',
    spotifyId: '2Jko3yQgktaKnFcmyLv3g7',
    isrc: 'GBAPA7700002',
    durationMs: 267826,
  },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function enrichTTML(rawXml: string, meta: SongMetadata): string {
  let xml = rawXml;

  // Ensure root tt namespaces
  if (!xml.includes('xmlns:itunes=')) {
    xml = xml.replace(/<tt\s+/i, '<tt xmlns:itunes="http://music.apple.com/lyric-ttml-extensions" ');
  }
  if (!xml.includes('xmlns:ttm=')) {
    xml = xml.replace(/<tt\s+/i, '<tt xmlns:ttm="http://www.w3.org/ns/ttml#metadata" ');
  }

  // Preserve existing composer groups if present
  const composerGroupsMatch = xml.match(/<composer:groups>[\s\S]*?<\/composer:groups>/i);

  const metaLines = [
    `      <ttm:title>${escapeXml(meta.title)}</ttm:title>`,
    `      <ttm:agent type="person" xml:id="v1">${escapeXml(meta.artist)}</ttm:agent>`,
    `      <itunes:album>${escapeXml(meta.album)}</itunes:album>`,
    `      <itunes:duration>${meta.durationMs}</itunes:duration>`,
    `      <itunes:spotifyId>${escapeXml(meta.spotifyId)}</itunes:spotifyId>`,
  ];

  if (meta.youtubeId) {
    metaLines.push(`      <itunes:youtubeId>${escapeXml(meta.youtubeId)}</itunes:youtubeId>`);
  }
  if (meta.isrc) {
    metaLines.push(`      <itunes:isrc>${escapeXml(meta.isrc)}</itunes:isrc>`);
  }
  metaLines.push(`      <itunes:contributor>Bru</itunes:contributor>`);

  if (composerGroupsMatch) {
    metaLines.push(`      ${composerGroupsMatch[0]}`);
  }

  const newMetadata = `<metadata>\n${metaLines.join('\n')}\n    </metadata>`;

  if (/<metadata>[\s\S]*?<\/metadata>/i.test(xml)) {
    xml = xml.replace(/<metadata>[\s\S]*?<\/metadata>/i, newMetadata);
  } else if (/<head>[\s\S]*?<\/head>/i.test(xml)) {
    xml = xml.replace(/<head>/i, `<head>\n    ${newMetadata}`);
  } else {
    xml = xml.replace(/<tt[^>]*>/i, `$&\n  <head>\n    ${newMetadata}\n  </head>`);
  }

  return xml;
}

export function runBatchIngestion(): void {
  console.log(`[Batch Ingest] Scanning source folder: ${sourceFolder}`);

  if (!fs.existsSync(sourceFolder)) {
    throw new Error(`Source folder not found: ${sourceFolder}`);
  }

  if (!fs.existsSync(inboxDir)) {
    fs.mkdirSync(inboxDir, { recursive: true });
  }

  let preparedCount = 0;

  for (const song of SONG_REGISTRY) {
    const filePath = path.join(sourceFolder, song.sourceFile);
    if (!fs.existsSync(filePath)) {
      console.warn(`[Batch Ingest] Source file not found: ${filePath}`);
      continue;
    }

    const rawContent = fs.readFileSync(filePath, 'utf-8');
    let finalTTML = '';

    if (song.sourceFile.endsWith('.lrc')) {
      finalTTML = lrcToTTML(rawContent, {
        title: song.title,
        artist: song.artist,
        album: song.album,
        spotifyId: song.spotifyId,
        youtubeId: song.youtubeId,
        isrc: song.isrc,
        durationMs: song.durationMs,
        contributor: 'Bru',
      });
    } else {
      finalTTML = enrichTTML(rawContent, song);
    }

    const validation = validateTTML(finalTTML);
    if (!validation.valid) {
      console.error(`[Batch Ingest] Validation failed for ${song.sourceFile}: ${validation.error}`);
      continue;
    }

    const targetInboxFile = path.join(inboxDir, `${song.spotifyId}.ttml`);
    fs.writeFileSync(targetInboxFile, finalTTML, 'utf-8');
    preparedCount++;
    console.log(`[Batch Ingest] Prepared and validated: ${song.artist} - ${song.title} -> inbox/${song.spotifyId}.ttml`);
  }

  console.log(`[Batch Ingest] ${preparedCount} song(s) placed into inbox. Running ingestion pipeline...`);

  const ingestResult = ingestInbox({ rootDir });
  console.log(`[Batch Ingest] Pipeline completed. Ingested ${ingestResult.processedCount} song(s).`);

  syncEmbeddedLyricsMap(rootDir);
  console.log('[Batch Ingest] Synchronized embedded lyrics map for Cloudflare Worker.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runBatchIngestion();
}
