import type { TTMLDocument } from '@brus-lyrics/shared-types';
import { parseTTML, lrcToTTMLDocument } from '@brus-lyrics/ttml-engine';
import type { UnifiedSongItem } from './types.js';
import { getApiBaseUrl, DEFAULT_PRODUCTION_API } from './config.js';

export async function fetchLyricsForTrack(
  song: UnifiedSongItem,
  apiBaseUrl: string = getApiBaseUrl()
): Promise<TTMLDocument | null> {
  const trackId = song.spotifyId || song.id;
  const title = encodeURIComponent(song.title);
  const artist = encodeURIComponent(song.artist);
  const duration = song.durationMs;

  const url = `${apiBaseUrl.replace(/\/+$/, '')}/v1/lyrics?trackId=${encodeURIComponent(
    trackId
  )}&title=${title}&artist=${artist}&duration=${duration}&platform=spotify`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      if (text.includes('<tt') || text.includes('xmlns="http://www.w3.org/ns/ttml"')) {
        const doc = parseTTML(text);
        if (doc && doc.lines && doc.lines.length > 0) {
          return doc;
        }
      } else if (text.includes('[') && text.includes(']')) {
        return lrcToTTMLDocument(text, {
          title: song.title,
          artist: song.artist,
          durationMs: duration,
        });
      }
    }
  } catch {
    // If request to custom or local API failed, try live production Cloudflare Worker if different
    if (!apiBaseUrl.includes('heysoybruno09')) {
      try {
        const fallbackUrl = `${DEFAULT_PRODUCTION_API}/v1/lyrics?trackId=${encodeURIComponent(
          trackId
        )}&title=${title}&artist=${artist}&duration=${duration}&platform=spotify`;
        const resFallback = await fetch(fallbackUrl);
        if (resFallback.ok) {
          const text = await resFallback.text();
          if (text.includes('<tt') || text.includes('xmlns="http://www.w3.org/ns/ttml"')) {
            const doc = parseTTML(text);
            if (doc && doc.lines && doc.lines.length > 0) {
              return doc;
            }
          }
        }
      } catch {
        // Fall through to public LRCLIB
      }
    }
  }

  // Direct LRCLIB fallback
  try {
    const params = new URLSearchParams({
      track_name: song.title,
      artist_name: song.artist,
      duration: Math.round(duration / 1000).toString(),
    });

    const lrcRes = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: { 'User-Agent': 'Brus-Lyrics-Web/1.0' },
    });

    if (lrcRes.ok) {
      const lrcData = await lrcRes.json();
      if (lrcData.syncedLyrics) {
        return lrcToTTMLDocument(lrcData.syncedLyrics, {
          title: song.title,
          artist: song.artist,
          durationMs: duration,
        });
      }
    }
  } catch {
    // Direct LRCLIB failed
  }

  // If no synced lyrics found anywhere, generate placeholder lines so playback still visually aligns
  return {
    metadata: {
      title: song.title,
      artist: song.artist,
      durationMs: song.durationMs,
      contributor: song.contributor || 'Community',
    },
    lines: [
      {
        id: 'line_intro',
        begin: 1000,
        end: 4500,
        agent: 'v1',
        text: `Playing ${song.title} by ${song.artist}`,
        syllables: [
          { begin: 1000, end: 2000, text: `Playing ` },
          { begin: 2000, end: 3200, text: `${song.title} ` },
          { begin: 3200, end: 4500, text: `by ${song.artist}` },
        ],
      },
      {
        id: 'line_community',
        begin: 5000,
        end: 12000,
        agent: 'v1',
        text: 'Syllable timing not yet indexed. Sign in with Discord to sync this track!',
        syllables: [
          { begin: 5000, end: 7500, text: 'Syllable timing ' },
          { begin: 7500, end: 9500, text: 'not yet indexed. ' },
          { begin: 9500, end: 12000, text: 'Sign in with Discord to sync this track!' },
        ],
      },
    ],
  };
}
