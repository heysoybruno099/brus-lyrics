export interface CatalogEntry {
  id: string;
  spotify_id: string | null;
  ytm_id: string | null;
  isrc: string | null;
  title: string;
  artist: string;
  title_norm: string;
  artist_norm: string;
  duration_ms: number;
  file_path: string;
  contributor: string;
  is_verified?: number | boolean;
  updated_at: string;
}

export interface CatalogFile {
  version: number;
  updated_at: string;
  songs: CatalogEntry[];
}

export type LyricsSource = 'brus-lyrics-verified' | 'lrclib-fallback';

export interface LyricsQueryParams {
  trackId?: string;
  title?: string;
  artist?: string;
  duration?: number | string;
  platform?: 'spotify' | 'ytm' | string;
}

export interface LyricsMetadata {
  id?: string;
  spotifyId?: string | null;
  ytmId?: string | null;
  isrc?: string | null;
  title: string;
  artist: string;
  durationMs: number;
  contributor?: string;
}

export interface SubmitLyricsPayload {
  metadata: LyricsMetadata;
  ttmlRaw: string;
  contributor: string;
}

export interface SubmitLyricsResponse {
  success: boolean;
  message: string;
  songId: string;
  action: 'committed' | 'queued' | 'stored';
  filePath?: string;
}

export interface CatalogPaginationResponse {
  songs: CatalogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type VocalAgent = 'v1' | 'v2';
export type SyllableRole = 'x-bg' | string;

export interface TTMLSyllable {
  begin: number;
  end: number;
  text: string;
  role?: SyllableRole;
}

export interface TTMLLine {
  id?: string;
  begin: number;
  end: number;
  agent: VocalAgent;
  role?: SyllableRole;
  text: string;
  syllables: TTMLSyllable[];
  backgroundVocals?: TTMLLine[];
}

export interface TTMLMetadata {
  title?: string;
  artist?: string;
  album?: string;
  durationMs?: number;
  spotifyId?: string;
  ytmId?: string;
  isrc?: string;
  contributor?: string;
}

export interface TTMLDocument {
  metadata: TTMLMetadata;
  lines: TTMLLine[];
  rawXml?: string;
}

export interface LrcLine {
  timeMs: number;
  text: string;
}

export interface LrcLibResponse {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export function normalizeString(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s*-\s*(?:remastered|remaster|live|single version|mono|stereo|bonus track).*/gi, '')
    .replace(/\((?:feat\.|featuring|ft\.|with|remastered|remaster|live|official).*?\)/gi, '')
    .replace(/\[(?:feat\.|featuring|ft\.|with|remastered|remaster|live|official).*?\]/gi, '')
    .replace(/['’`]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatTimestampTTML(ms: number): string {
  if (ms < 0) ms = 0;
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor(ms % 1000);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(milliseconds).padStart(3, '0');

  return `${hh}:${mm}:${ss}.${mmm}`;
}

export function parseTimestampTTML(timeStr: string): number {
  if (!timeStr) return 0;
  const trimmed = timeStr.trim();
  const isNegative = trimmed.startsWith('-');
  const unsigned = isNegative ? trimmed.slice(1).trim() : trimmed;

  let ms = 0;
  if (unsigned.endsWith('s')) {
    ms = Math.round(parseFloat(unsigned.slice(0, -1)) * 1000);
  } else {
    const parts = unsigned.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0] || '0', 10);
      const minutes = parseInt(parts[1] || '0', 10);
      const secParts = (parts[2] || '0').split('.');
      const seconds = parseInt(secParts[0] || '0', 10);
      const millis = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
      ms = hours * 3600000 + minutes * 60000 + seconds * 1000 + millis;
    } else if (parts.length === 2) {
      const minutes = parseInt(parts[0] || '0', 10);
      const secParts = (parts[1] || '0').split('.');
      const seconds = parseInt(secParts[0] || '0', 10);
      const millis = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
      ms = minutes * 60000 + seconds * 1000 + millis;
    } else {
      const numeric = parseFloat(unsigned);
      ms = isNaN(numeric) ? 0 : Math.round(numeric * 1000);
    }
  }

  return isNegative ? -ms : ms;
}

export function cleanTrackId(trackId: string): string {
  if (!trackId) return '';
  let id = trackId.trim();

  // Strip Spotify URI
  if (id.startsWith('spotify:track:')) {
    id = id.slice('spotify:track:'.length).split('?')[0]!;
    return id.trim();
  }

  // Strip Spotify URL
  const spotifyMatch = id.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/i);
  if (spotifyMatch && spotifyMatch[1]) {
    return spotifyMatch[1];
  }

  // Strip YouTube / YTM URL
  const ytmMatch = id.match(/(?:music\.youtube\.com|youtube\.com)\/watch\?v=([a-zA-Z0-9_-]+)/i);
  if (ytmMatch && ytmMatch[1]) {
    return ytmMatch[1];
  }

  const youtuMatch = id.match(/youtu\.be\/([a-zA-Z0-9_-]+)/i);
  if (youtuMatch && youtuMatch[1]) {
    return youtuMatch[1];
  }

  // Remove query string if any
  if (id.includes('?')) {
    id = id.split('?')[0]!;
  }

  return id.trim();
}

export function parseDurationInput(raw: string | number | undefined): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw).trim());
  if (isNaN(num) || num <= 0) return undefined;

  const str = String(raw).trim();
  if (str.includes('.') || num < 10000) {
    return Math.round(num * 1000);
  }
  return Math.round(num);
}

export interface CleanedMediaTitle {
  title: string;
  artist: string;
  originalTitle: string;
}

export function cleanYouTubeTitle(rawTitle: string, rawArtist?: string): CleanedMediaTitle {
  if (!rawTitle) {
    return { title: '', artist: rawArtist ? rawArtist.trim() : '', originalTitle: '' };
  }

  const originalTitle = rawTitle.trim();
  let workingTitle = originalTitle;

  // Strip common noisy tags inside parentheses or brackets
  const tagPatterns = [
    /\s*\((?:official\s+)?(?:hd\s+|4k\s+|8k\s+)?(?:music\s+)?(?:video|audio|visualizer|lyric\s+video|lyrics|version|raw|track|explicit|clean|remastered|remaster|performance|edit|clip).*?\)/gi,
    /\s*\[(?:official\s+)?(?:hd\s+|4k\s+|8k\s+)?(?:music\s+)?(?:video|audio|visualizer|lyric\s+video|lyrics|version|raw|track|explicit|clean|remastered|remaster|performance|edit|clip).*?\]/gi,
    /\s*\((?:directed|dir\.|prod\.|produced|shot|edited)\s+by\s+.*?\)/gi,
    /\s*\[(?:directed|dir\.|prod\.|produced|shot|edited)\s+by\s+.*?\]/gi,
    /\s*\((?:vevo\s+presents|exclusive|premiere|audio|visualizer|hq|hd|4k|1080p).*?\)/gi,
    /\s*\[(?:vevo\s+presents|exclusive|premiere|audio|visualizer|hq|hd|4k|1080p).*?\]/gi,
    /\s*\((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\)/gi,
    /\s*\[(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\)/gi,
    /\s*\((?:19\d{2}|20\d{2})\)/g,
    /\s*\[(?:19\d{2}|20\d{2})\]/g,
    /\s*\|\s*(?:official\s+video|official\s+audio|lyric\s+video|visualizer).*$/gi,
    /\s*-\s*(?:official\s+video|official\s+audio|lyric\s+video|visualizer).*$/gi,
  ];

  for (const pattern of tagPatterns) {
    workingTitle = workingTitle.replace(pattern, '');
  }

  let extractedArtist = rawArtist ? rawArtist.trim() : '';
  let finalTitle = workingTitle.trim();

  // Strip generic YouTube channel names
  const genericArtists = ['various artists', 'topic', 'youtube', 'unknown artist'];
  const isGenericArtist = !extractedArtist || genericArtists.includes(extractedArtist.toLowerCase());

  // Check if title has "Artist - Title" or "Artist : Title" format
  const delimiterMatch = finalTitle.match(/^([^-:\u2013\u2014]+)\s*[-:\u2013\u2014]\s*(.+)$/);
  if (delimiterMatch && delimiterMatch[1] && delimiterMatch[2]) {
    const artistPart = delimiterMatch[1].trim();
    const titlePart = delimiterMatch[2].trim();

    // If no artist was passed or artist was generic, adopt extracted artist
    if (isGenericArtist || extractedArtist.toLowerCase() === artistPart.toLowerCase()) {
      extractedArtist = artistPart;
      finalTitle = titlePart;
    } else if (titlePart.length > 0) {
      // Even if artist exists, if artist is clearly in title, simplify title
      finalTitle = titlePart;
    }
  }

  // Final trim of quotes
  finalTitle = finalTitle.replace(/^["'«“](.*)["'»”]$/, '$1').trim();
  // Strip trailing dashes or pipes
  finalTitle = finalTitle.replace(/[\s\-|]+$/, '').trim();

  return {
    title: finalTitle || originalTitle,
    artist: extractedArtist,
    originalTitle,
  };
}

