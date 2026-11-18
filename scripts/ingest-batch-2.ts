import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatTimestampTTML, normalizeString, parseTimestampTTML, type CatalogEntry, type CatalogFile } from '@brus-lyrics/shared-types';
import { jsonToTTML } from '../packages/ttml-engine/src/json-parser.js';
import { lrcToTTML } from '../packages/ttml-engine/src/lrc-converter.js';
import { validateTTML } from '../packages/ttml-engine/src/validator.js';
import { syncEmbeddedLyricsMap } from './ingest-inbox.js';

function normalizeTtmlXml(xml: string, spotifyId: string): string {
  let res = xml;
  // 1. Ensure <tt> has xmlns="http://www.w3.org/ns/ttml"
  if (!res.includes('xmlns="http://www.w3.org/ns/ttml"') && !res.includes("xmlns='http://www.w3.org/ns/ttml'")) {
    res = res.replace(/<tt\b([^>]*)>/i, '<tt xmlns="http://www.w3.org/ns/ttml"$1>');
  }
  // 2. Ensure xmlns:ttm exists
  if (!res.includes('xmlns:ttm=')) {
    res = res.replace(/<tt\b([^>]*)>/i, '<tt xmlns:ttm="http://www.w3.org/ns/ttml#metadata"$1>');
  }
  // 3. Ensure xmlns:itunes exists
  if (!res.includes('xmlns:itunes=')) {
    res = res.replace(/<tt\b([^>]*)>/i, '<tt xmlns:itunes="http://music.apple.com/lyric-ttml-extensions"$1>');
  }
  // 4. Ensure <metadata> has <itunes:spotifyId>
  if (!res.includes('<itunes:spotifyId>') && !res.includes('<spotifyId>')) {
    res = res.replace(/<metadata>/i, `<metadata>\n      <itunes:spotifyId>${spotifyId}</itunes:spotifyId>`);
  }
  // 5. Ensure <itunes:contributor>
  if (!res.includes('<itunes:contributor>')) {
    res = res.replace(/<\/metadata>/i, `      <itunes:contributor>Bru</itunes:contributor>\n    </metadata>`);
  }
  // 6. Fix any span or p with inverted timestamps (where end <= begin)
  res = res.replace(/\bbegin=["']([^"']+)["']\s+end=["']([^"']+)["']/gi, (match, bStr, eStr) => {
    const bMs = parseTimestampTTML(bStr);
    const eMs = parseTimestampTTML(eStr);
    if (eMs <= bMs) {
      const fixedEnd = formatTimestampTTML(bMs + 350);
      return `begin="${bStr}" end="${fixedEnd}"`;
    }
    return match;
  });
  res = res.replace(/\bend=["']([^"']+)["']\s+begin=["']([^"']+)["']/gi, (match, eStr, bStr) => {
    const bMs = parseTimestampTTML(bStr);
    const eMs = parseTimestampTTML(eStr);
    if (eMs <= bMs) {
      const fixedEnd = formatTimestampTTML(bMs + 350);
      return `begin="${bStr}" end="${fixedEnd}"`;
    }
    return `begin="${bStr}" end="${eStr}"`;
  });
  return res;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceFolder = 'C:\\Users\\Bruno PC\\Downloads\\BRU LYRICS #2';
const ttmlDir = path.join(rootDir, 'database', 'ttml');
const catalogPath = path.join(rootDir, 'database', 'catalog.json');
const sqlOutputPath = path.join(rootDir, 'database', 'migrations', 'latest_inserts.sql');
const spotifyServicePath = path.join(rootDir, 'packages', 'sync-studio', 'src', 'lib', 'spotify-service.ts');

interface BatchTrackConfig {
  file: string;
  spotifyId: string;
  fallbackTitle: string;
  fallbackArtist: string;
}

const BATCH_2_TRACKS: BatchTrackConfig[] = [
  { file: 'a-ha_-_Take_on_Me.json', spotifyId: '2WfaOiMkCvy7F5fcp2zZ8L', fallbackTitle: 'Take on Me', fallbackArtist: 'a-ha' },
  { file: 'Bad_Bunny_Ozuna_Farruko_Arc_ngel_engo_Flow_DJ_Luian_Mambo_Kingz_-_Diles.json', spotifyId: '6C1RD7YQVvt3YQj0CmuTeu', fallbackTitle: 'Diles', fallbackArtist: 'Bad Bunny, Ozuna, Farruko, Arcángel, Ñengo Flow, DJ Luian, Mambo Kingz' },
  { file: 'Calvin_Harris_Dua_Lipa_-_One_Kiss_with_Dua_Lipa_.json', spotifyId: '7ef4DlsgrMEH11cDZd32M6', fallbackTitle: 'One Kiss (with Dua Lipa)', fallbackArtist: 'Calvin Harris, Dua Lipa' },
  { file: 'Chalino_Sanchez_Los_Amables_Del_Norte_-_Nieves_De_Enero.json', spotifyId: '3fNK9wZMHV7CLG1z3rueBO', fallbackTitle: 'Nieves De Enero', fallbackArtist: 'Chalino Sanchez, Los Amables Del Norte' },
  { file: 'Comprendes, Mendes - Control Machete.ttml', spotifyId: '2YRDxUyqAXbukcjClvuYsd', fallbackTitle: '¿Comprendes Mendes?', fallbackArtist: 'Control Machete' },
  { file: 'Daft_Punk_-_Something_About_Us.json', spotifyId: '1NeLwFETswx8Fzxl2AFl91', fallbackTitle: 'Something About Us', fallbackArtist: 'Daft Punk' },
  { file: 'FE!N - Travis Scott.ttml', spotifyId: '42VsgItocQwOQC3XWZ8JNA', fallbackTitle: 'FE!N', fallbackArtist: 'Travis Scott, Playboi Carti' },
  { file: 'Havah Nagilah (Live) - Helmut Lotti.ttml', spotifyId: '3xO22uRzDCLCyPMueL14O5', fallbackTitle: 'Havah Nagilah - Live', fallbackArtist: 'Helmut Lotti' },
  { file: 'Hermanos_Espinoza_-_FREESTYLE.json', spotifyId: '7FcV9ysZVFnmAOYwipRSGp', fallbackTitle: 'FREESTYLE', fallbackArtist: 'Hermanos Espinoza' },
  { file: 'Hopeless - Amanraj Gill, Prem Lata.ttml', spotifyId: '29f6IOg01XRLHKDhFjua1I', fallbackTitle: 'Hopeless', fallbackArtist: 'Amanraj Gill, Prem Lata, Aj Fakira' },
  { file: "It's me, It's Verity - Horror Skunx.ttml", spotifyId: '2O2UpJG3EJkIdW7mUILhD4', fallbackTitle: "It's me, It's Verity", fallbackArtist: 'Horror Skunx' },
  { file: 'Jake_Paul_Team_10_-_It_s_Everyday_Bro.json', spotifyId: '4l62h4tiuUwn7eD6hxMlVQ', fallbackTitle: "It's Everyday Bro", fallbackArtist: 'Jake Paul, Team 10' },
  { file: 'Joey Montana - Picky.ttml', spotifyId: '4tPL9PeVZY4c0jUPtSD5nx', fallbackTitle: 'Picky', fallbackArtist: 'Joey Montana' },
  { file: 'John_Lennon_-_Imagine_-_Remastered_2010.json', spotifyId: '7pKfPomDEeI4TPT6EOYjn9', fallbackTitle: 'Imagine - Remastered 2010', fallbackArtist: 'John Lennon' },
  { file: 'Justice_Tame_Impala_SZA_Grand_Theft_Auto_VI_King_Gizzard_The_Lizard_Wizard_-_Flo.json', spotifyId: '0hk73Ck6CTs4rHuOJC4oGp', fallbackTitle: 'Flower In A Hurricane (feat. Tame Impala, SZA, King Gizzard & the Lizard Wizard) [From GTAVI: Original Score]', fallbackArtist: 'Justice, Tame Impala, SZA, Grand Theft Auto VI, King Gizzard & The Lizard Wizard' },
  { file: 'Kanye_West_Dwele_-_Flashing_Lights.json', spotifyId: '5TRPicyLGbAF2LGBFbHGvO', fallbackTitle: 'Flashing Lights', fallbackArtist: 'Kanye West, Dwele' },
  { file: 'La Original Banda El Limón de Salvador Lizárraga - Juan Martha.ttml', spotifyId: '0FG2BidxWdYecUegaWAnST', fallbackTitle: 'Juan Martha', fallbackArtist: 'La Original Banda El Limón de Salvador Lizárraga' },
  { file: 'La_Factoria_Eddy_Lover_-_Perd_name.json', spotifyId: '6yLqoieklk9gwabLaUDJ4s', fallbackTitle: 'Perdóname', fallbackArtist: 'La Factoria, Eddy Lover' },
  { file: 'LOS_PLEBES_DE_OLANCHO_-_ENTRE_GOLPES_Y_BESOS.json', spotifyId: '25iLX2CnaxbhZqsSujKBfe', fallbackTitle: 'ENTRE GOLPES Y BESOS', fallbackArtist: 'LOS PLEBES DE OLANCHO' },
  { file: 'Macacoa 2000 (from GTAVI The Album) - Rauw Alejandro.lrc', spotifyId: '7GtO6G2Iue3yfIYhx36JZn', fallbackTitle: 'Macacoa 2000 (from GTAVI: The Album)', fallbackArtist: 'Rauw Alejandro, Grand Theft Auto VI' },
  { file: 'Metallica_-_Master_Of_Puppets.json', spotifyId: '2MuWTIM3b0YEAskbeeFE1i', fallbackTitle: 'Master Of Puppets', fallbackArtist: 'Metallica' },
  { file: 'Michael Jackson - Billie Jean.ttml', spotifyId: '7J1uxwnxfQLu4APicE5Rnj', fallbackTitle: 'Billie Jean', fallbackArtist: 'Michael Jackson' },
  { file: 'Michael_Jackson_-_Beat_It.json', spotifyId: '3BovdzfaX4jb5KFQwoPfAw', fallbackTitle: 'Beat It', fallbackArtist: 'Michael Jackson' },
  { file: 'Niko B - Rips in Jeans.ttml', spotifyId: '7K0ga2R3IgiwDOZlk9SC9n', fallbackTitle: 'Rips in Jeans', fallbackArtist: 'Niko B' },
  { file: 'OLIVIA LA FLAKA - Natanael Cano, Tito Double P, Victor Mendivil, Ovi.ttml', spotifyId: '6756nr1dYiw5aNLSgIHNOI', fallbackTitle: 'OLIVIA LA FLAKA', fallbackArtist: 'Natanael Cano, Tito Double P, Victor Mendivil, Ovi' },
  { file: 'Tom_Petty_-_Love_Is_A_Long_Road.json', spotifyId: '4PJEK76V3A1S0XzZJuTWh7', fallbackTitle: 'Love Is A Long Road', fallbackArtist: 'Tom Petty' },
  { file: 'Voltio (Live) - Voltio.lrc', spotifyId: '2bEedurM580zEQCPlKdgWu', fallbackTitle: 'Voltio (Live)', fallbackArtist: 'Voltio' }
];

async function getSpotifyToken(): Promise<string> {
  const clientId = 'ec99db82c31b4c78bafa0c79438e7818';
  const clientSecret = '1be1e798442e4f5f94c361f0454e03dc';
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = (await res.json()) as any;
  return data.access_token;
}

async function fetchSpotifyTrack(token: string, trackId: string): Promise<any> {
  try {
    const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

async function main() {
  console.log('[Batch 2 Ingest] Initializing Spotify token...');
  const token = await getSpotifyToken();

  if (!fs.existsSync(ttmlDir)) {
    fs.mkdirSync(ttmlDir, { recursive: true });
  }

  // Load existing catalog.json
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
    } catch (err) {
      console.warn('[Batch 2 Ingest] Failed to parse existing catalog.json', err);
    }
  }

  const generatedSql: string[] = [];
  const featuredTracksToAdd: any[] = [];
  const artworkMapEntries: [string, string][] = [];

  for (const item of BATCH_2_TRACKS) {
    const sourceFilePath = path.join(sourceFolder, item.file);
    if (!fs.existsSync(sourceFilePath)) {
      console.warn(`[Batch 2 Ingest] File not found: ${sourceFilePath}`);
      continue;
    }

    const rawContent = fs.readFileSync(sourceFilePath, 'utf-8');
    const ext = path.extname(item.file).toLowerCase();

    // Fetch canonical track data from Spotify
    const spTrack = await fetchSpotifyTrack(token, item.spotifyId);
    const title = spTrack?.name || item.fallbackTitle;
    const artist = spTrack?.artists?.map((a: any) => a.name).join(', ') || item.fallbackArtist;
    const album = spTrack?.album?.name || '';
    const durationMs = spTrack?.duration_ms || 0;
    const isrc = spTrack?.external_ids?.isrc || null;
    const artworkUrl = spTrack?.album?.images?.[0]?.url || 'https://i.scdn.co/image/ab67616d0000b273b06cf595709fa22a46c3b6ce';

    let finalTtml = '';

    if (ext === '.ttml') {
      // Keep exact XML body and spans to avoid flattening syllables or custom composer structures
      finalTtml = normalizeTtmlXml(rawContent, item.spotifyId);
    } else if (ext === '.json') {
      finalTtml = jsonToTTML(rawContent, {
        spotifyId: item.spotifyId,
        contributor: 'Bru',
      });
    } else if (ext === '.lrc') {
      finalTtml = lrcToTTML(rawContent, {
        title,
        artist,
        album,
        spotifyId: item.spotifyId,
        isrc: isrc || undefined,
        durationMs,
        contributor: 'Bru',
      });
    }

    // Validate the resulting TTML XML
    const validation = validateTTML(finalTtml);
    if (!validation.valid) {
      console.error(`[Batch 2 Ingest] Validation failed for ${item.file}: ${validation.error}`);
      continue;
    }

    // Write TTML file to database/ttml/<spotifyId>.ttml
    const targetTtmlPath = path.join(ttmlDir, `${item.spotifyId}.ttml`);
    fs.writeFileSync(targetTtmlPath, finalTtml, 'utf-8');
    console.log(`[Batch 2 Ingest] Saved database/ttml/${item.spotifyId}.ttml (${finalTtml.length} bytes)`);

    // Add or update catalog.json entry
    const songId = `song_${item.spotifyId}`;
    const relativeFilePath = `database/ttml/${item.spotifyId}.ttml`;
    const nowIso = new Date().toISOString();

    const existingIndex = catalogData.songs.findIndex(
      (s) => s.id === songId || s.spotify_id === item.spotifyId
    );

    const catalogEntry: CatalogEntry = {
      id: songId,
      title,
      artist,
      duration_ms: durationMs,
      file_path: relativeFilePath,
      created_at: existingIndex >= 0 ? catalogData.songs[existingIndex]!.created_at : nowIso,
      updated_at: nowIso,
      is_verified: 1,
      contributor: 'Bru',
      spotify_id: item.spotifyId,
      youtube_id: null,
      isrc: isrc || null,
      album: album || undefined,
      artwork_url: artworkUrl,
    };

    if (existingIndex >= 0) {
      catalogData.songs[existingIndex] = catalogEntry;
    } else {
      catalogData.songs.push(catalogEntry);
    }

    // Prepare SQL Insert statement
    const titleNorm = normalizeString(title);
    const artistNorm = normalizeString(artist);
    const sql = `INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, is_verified, updated_at)
VALUES (
  '${escapeSql(songId)}',
  '${escapeSql(item.spotifyId)}',
  NULL,
  ${isrc ? `'${escapeSql(isrc)}'` : 'NULL'},
  '${escapeSql(title)}',
  '${escapeSql(artist)}',
  '${escapeSql(titleNorm)}',
  '${escapeSql(artistNorm)}',
  ${durationMs},
  '${escapeSql(relativeFilePath)}',
  'Bru',
  1,
  '${nowIso}'
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
  is_verified=excluded.is_verified,
  updated_at=excluded.updated_at;`;

    generatedSql.push(sql);

    // Prepare featured track and artwork map entries
    featuredTracksToAdd.push({
      id: `spotify_${item.spotifyId}`,
      spotifyId: item.spotifyId,
      ytmId: null,
      title,
      artist,
      album,
      artworkUrl,
      durationMs,
      source: 'verified',
      isSyllableSynced: true,
      contributor: 'Bru',
    });

    artworkMapEntries.push([item.spotifyId, artworkUrl]);
  }

  // Save updated catalog.json
  catalogData.updated_at = new Date().toISOString();
  fs.writeFileSync(catalogPath, JSON.stringify(catalogData, null, 2) + '\n', 'utf-8');
  console.log(`[Batch 2 Ingest] catalog.json updated with ${catalogData.songs.length} total entries.`);

  // Write SQL statements
  const sqlContent = generatedSql.join('\n\n') + '\n';
  fs.writeFileSync(sqlOutputPath, sqlContent, 'utf-8');
  console.log(`[Batch 2 Ingest] SQL statements written to: ${sqlOutputPath}`);

  // Sync embedded-lyrics.ts
  syncEmbeddedLyricsMap(rootDir, ttmlDir);

  // Update spotify-service.ts
  if (fs.existsSync(spotifyServicePath)) {
    let serviceCode = fs.readFileSync(spotifyServicePath, 'utf-8');

    // Read existing VERIFIED_FEATURED_TRACKS and append new ones without duplicates
    for (const track of featuredTracksToAdd) {
      if (!serviceCode.includes(`spotifyId: '${track.spotifyId}'`)) {
        const trackCode = `  {
    id: '${track.id}',
    spotifyId: '${track.spotifyId}',
    ytmId: null,
    title: ${JSON.stringify(track.title)},
    artist: ${JSON.stringify(track.artist)},
    album: ${JSON.stringify(track.album)},
    artworkUrl: '${track.artworkUrl}',
    durationMs: ${track.durationMs},
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },`;
        serviceCode = serviceCode.replace(
          /export const VERIFIED_FEATURED_TRACKS: UnifiedSongItem\[\] = \[/,
          `export const VERIFIED_FEATURED_TRACKS: UnifiedSongItem[] = [\n${trackCode}`
        );
      }
    }

    // Update SPOTIFY_ARTWORK_MAP
    for (const [sId, artUrl] of artworkMapEntries) {
      if (!serviceCode.includes(`'${sId}':`)) {
        serviceCode = serviceCode.replace(
          /const SPOTIFY_ARTWORK_MAP: Record<string, string> = {/,
          `const SPOTIFY_ARTWORK_MAP: Record<string, string> = {\n  '${sId}': '${artUrl}',`
        );
      }
    }

    fs.writeFileSync(spotifyServicePath, serviceCode, 'utf-8');
    console.log('[Batch 2 Ingest] Updated VERIFIED_FEATURED_TRACKS and SPOTIFY_ARTWORK_MAP in spotify-service.ts');
  }

  console.log('[Batch 2 Ingest] Done! Ingested all batch 2 songs successfully.');
}

main().catch((err) => {
  console.error('[Batch 2 Ingest] Error:', err);
  process.exit(1);
});
