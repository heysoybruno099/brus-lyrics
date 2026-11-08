import type { LyricsSource } from '@brus-lyrics/shared-types';
import { lrcToTTML } from '@brus-lyrics/ttml-engine';

export type ExtendedLyricsSource = LyricsSource | 'spotify-musixmatch' | 'not-found';

export interface LyricsFetchResult {
  ttml: string;
  source: ExtendedLyricsSource;
  error?: string;
}

export const DEFAULT_API_BASE = 'http://127.0.0.1:8787';

function formatMsTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  const m = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');
  const h = String(hundredths).padStart(2, '0');
  return `${m}:${s}.${h}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function fetchSpotifyColorLyrics(
  rawTrackId: string,
  title?: string,
  artist?: string,
  durationMs?: number
): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const cosmos = (window as any).Spicetify?.CosmosAsync;
  if (!cosmos || !rawTrackId) return null;

  try {
    const url = `https://spclient.wg.spotify.com/color-lyrics/v2/track/${rawTrackId}?format=json&vocalRemoval=false&market=from_token`;
    const res = await cosmos.get(url);
    if (!res || !res.lyrics || !Array.isArray(res.lyrics.lines)) {
      return null;
    }

    const lines: Array<{ startTimeMs: number | string; words: string }> = res.lyrics.lines;
    if (lines.length === 0) return null;

    const lineXmls: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const startMs = parseInt(String(lines[i].startTimeMs), 10) || 0;
      const text = (lines[i].words || '').trim();
      if (!text) continue;

      let endMs = startMs + 3500;
      if (i < lines.length - 1) {
        const nextStart = parseInt(String(lines[i + 1].startTimeMs), 10);
        if (nextStart > startMs) {
          endMs = nextStart;
        }
      }

      const beginStr = formatMsTimestamp(startMs);
      const endStr = formatMsTimestamp(endMs);

      const words = text.split(/\s+/).filter(Boolean);
      const totalWords = words.length || 1;
      const wordDur = (endMs - startMs) / totalWords;

      const spanXmls = words
        .map((w, wIdx) => {
          const wBegin = Math.round(startMs + wIdx * wordDur);
          const wEnd = Math.round(wBegin + wordDur);
          const space = wIdx < words.length - 1 ? ' ' : '';
          return `<span begin="${formatMsTimestamp(wBegin)}" end="${formatMsTimestamp(wEnd)}">${escapeXml(w)}${space}</span>`;
        })
        .join('');

      lineXmls.push(`      <p begin="${beginStr}" end="${endStr}" ttm:agent="v1">${spanXmls}</p>`);
    }

    return `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-extensions">
  <head>
    <metadata>
      <itunes:timing>Line</itunes:timing>
      <itunes:song>${escapeXml(title || 'Unknown Title')}</itunes:song>
      <itunes:artist>${escapeXml(artist || 'Unknown Artist')}</itunes:artist>
    </metadata>
  </head>
  <body>
    <div>
${lineXmls.join('\n')}
    </div>
  </body>
</tt>`;
  } catch {
    return null;
  }
}

export async function fetchLyrics(
  apiBase: string,
  params: {
    trackId?: string;
    title?: string;
    artist?: string;
    durationMs?: number;
  }
): Promise<LyricsFetchResult> {
  const cleanTitle = (params.title || '').trim();
  const cleanArtist = (params.artist || '').trim();

  // 1. Try Bru's Lyrics API Worker
  const query = new URLSearchParams();
  if (params.trackId) query.set('trackId', params.trackId);
  if (cleanTitle) query.set('title', cleanTitle);
  if (cleanArtist) query.set('artist', cleanArtist);
  if (params.durationMs) query.set('duration', String(params.durationMs));
  query.set('platform', 'spotify');

  const url = `${apiBase.replace(/\/+$/, '')}/v1/lyrics?${query.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (response.ok) {
      const sourceHeader = response.headers.get('X-Lyrics-Source') as LyricsSource | null;
      if (sourceHeader === 'brus-lyrics-verified') {
        const ttml = await response.text();
        return {
          ttml,
          source: 'brus-lyrics-verified',
        };
      }
    }
  } catch {
    // Worker offline / unreachable, continue waterfall
  }

  // 2. Try Spotify Native Color Lyrics (Powered by Spotify / Musixmatch backend)
  if (params.trackId) {
    const spotifyNativeTTML = await fetchSpotifyColorLyrics(
      params.trackId,
      cleanTitle,
      cleanArtist,
      params.durationMs
    );
    if (spotifyNativeTTML) {
      return {
        ttml: spotifyNativeTTML,
        source: 'spotify-musixmatch',
      };
    }
  }

  // 3. Direct client-side LRCLIB Fallback with smart search
  if (cleanTitle && cleanTitle.toLowerCase() !== 'unknown title') {
    const fallback = await fetchLrcLibDirect(cleanTitle, cleanArtist, params.durationMs);
    if (fallback) {
      return {
        ttml: fallback,
        source: 'lrclib-fallback',
      };
    }
  }

  return {
    ttml: '',
    source: 'not-found',
    error: 'No lyrics found',
  };
}

async function fetchLrcLibDirect(title: string, artist: string, durationMs?: number): Promise<string | null> {
  if (!title) return null;

  try {
    // 1. Exact match attempt
    const getUrl = new URL('https://lrclib.net/api/get');
    getUrl.searchParams.set('track_name', title);
    if (artist && artist.toLowerCase() !== 'unknown artist') {
      getUrl.searchParams.set('artist_name', artist);
    }
    if (durationMs) {
      getUrl.searchParams.set('duration', String(Math.round(durationMs / 1000)));
    }

    const res = await fetch(getUrl.toString(), { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data.syncedLyrics) {
        return lrcToTTML(data.syncedLyrics, { title, artist, durationMs });
      }
    }

    // 2. Fuzzy search query attempt
    const searchUrl = new URL('https://lrclib.net/api/search');
    const queryTerm = artist && artist.toLowerCase() !== 'unknown artist'
      ? `${artist} ${title}`.trim()
      : title;
    searchUrl.searchParams.set('q', queryTerm);

    const searchRes = await fetch(searchUrl.toString(), { signal: AbortSignal.timeout(3500) });
    if (searchRes.ok) {
      const results = await searchRes.json();
      if (Array.isArray(results) && results.length > 0) {
        const item = results.find((r: any) => Boolean(r.syncedLyrics)) || results[0];
        if (item && item.syncedLyrics) {
          return lrcToTTML(item.syncedLyrics, { title, artist, durationMs });
        }
      }
    }
  } catch {
    // Network unreachable
  }

  return null;
}
