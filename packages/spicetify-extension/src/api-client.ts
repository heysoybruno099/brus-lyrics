import type { LyricsSource } from '@brus-lyrics/shared-types';
import { lrcToTTML } from '@brus-lyrics/ttml-engine';

export interface LyricsFetchResult {
  ttml: string;
  source: LyricsSource | 'not-found';
  error?: string;
}

export const DEFAULT_API_BASE = 'http://127.0.0.1:8787';

export async function fetchLyrics(
  apiBase: string,
  params: {
    trackId?: string;
    title?: string;
    artist?: string;
    durationMs?: number;
  }
): Promise<LyricsFetchResult> {
  const query = new URLSearchParams();
  if (params.trackId) query.set('trackId', params.trackId);
  if (params.title) query.set('title', params.title);
  if (params.artist) query.set('artist', params.artist);
  if (params.durationMs) query.set('duration', String(params.durationMs));
  query.set('platform', 'spotify');

  const url = `${apiBase.replace(/\/+$/, '')}/v1/lyrics?${query.toString()}`;

  // 1. Try Bru's Lyrics API Worker
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
      const source: LyricsSource = sourceHeader === 'brus-lyrics-verified'
        ? 'brus-lyrics-verified'
        : 'lrclib-fallback';

      const ttml = await response.text();
      return {
        ttml,
        source,
      };
    }
  } catch {
    // Worker offline / unreachable, fallback to direct client-side LRCLIB fetch
  }

  // 2. Direct client-side LRCLIB Fallback
  const fallback = await fetchLrcLibDirect(params.title || '', params.artist || '', params.durationMs);
  if (fallback) {
    return {
      ttml: fallback,
      source: 'lrclib-fallback',
    };
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
    // 1. Try exact get
    const getUrl = new URL('https://lrclib.net/api/get');
    getUrl.searchParams.set('track_name', title);
    if (artist) getUrl.searchParams.set('artist_name', artist);
    if (durationMs) getUrl.searchParams.set('duration', String(Math.round(durationMs / 1000)));

    const res = await fetch(getUrl.toString(), { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data.syncedLyrics) {
        return lrcToTTML(data.syncedLyrics, { title, artist, durationMs });
      }
    }

    // 2. Try search
    const searchUrl = new URL('https://lrclib.net/api/search');
    searchUrl.searchParams.set('q', `${artist} ${title}`.trim());

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
