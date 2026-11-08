import { Hono } from 'hono';
import { normalizeString, parseDurationInput } from '@brus-lyrics/shared-types';
import type { Env } from '../types.js';
import { findSongByTrackId, findSongByNormalized } from '../lib/db.js';
import { fetchTTML } from '../lib/storage.js';
import { convertLrcToTTML } from '../lib/lrc-to-ttml.js';

export const lyricsRoute = new Hono<{ Bindings: Env }>();

lyricsRoute.get('/lyrics', async (c) => {
  const trackId = c.req.query('trackId');
  const title = c.req.query('title');
  const artist = c.req.query('artist');
  const rawDuration = c.req.query('duration');
  const platform = c.req.query('platform');

  const durationMs = parseDurationInput(rawDuration);

  if (!trackId && (!title || !artist)) {
    return c.json(
      {
        error: 'Missing query parameters. Please provide either trackId or both title and artist.',
      },
      400
    );
  }

  // Step A: Query D1 / catalog.json for exact trackId match
  if (trackId) {
    const song = await findSongByTrackId(c.env, trackId, platform);
    if (song) {
      const ttml = await fetchTTML(c.env, song.file_path);
      if (ttml) {
        return new Response(ttml, {
          status: 200,
          headers: {
            'Content-Type': 'application/ttml+xml; charset=utf-8',
            'X-Lyrics-Source': 'brus-lyrics-verified',
            'X-Song-Id': song.id,
            'X-Song-Title': encodeURIComponent(song.title),
            'X-Song-Artist': encodeURIComponent(song.artist),
          },
        });
      }
    }
  }

  // Step B: Normalized string matching on title_norm + artist_norm where ABS(duration_ms - duration) <= 2500
  if (title && artist) {
    const titleNorm = normalizeString(title);
    const artistNorm = normalizeString(artist);

    const song = await findSongByNormalized(c.env, titleNorm, artistNorm, durationMs, platform);
    if (song) {
      const ttml = await fetchTTML(c.env, song.file_path);
      if (ttml) {
        return new Response(ttml, {
          status: 200,
          headers: {
            'Content-Type': 'application/ttml+xml; charset=utf-8',
            'X-Lyrics-Source': 'brus-lyrics-verified',
            'X-Song-Id': song.id,
            'X-Song-Title': encodeURIComponent(song.title),
            'X-Song-Artist': encodeURIComponent(song.artist),
          },
        });
      }
    }
  }

  // Step C: Fallback to LRCLIB
  if (title && artist) {
    try {
      const fetchLrcFromApi = async (queryTitle: string, durSec?: number): Promise<Response> => {
        const params = new URLSearchParams();
        params.set('track_name', queryTitle);
        params.set('artist_name', artist);
        if (durSec) {
          params.set('duration', durSec.toString());
        }
        return await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
          headers: {
            'User-Agent': 'Brus-Lyrics-API/1.0',
          },
        });
      };

      const durationSec = durationMs ? Math.round(durationMs / 1000) : undefined;
      let lrclibRes = await fetchLrcFromApi(title, durationSec);

      // If exact title with duration returned 404, retry with cleaned title or without duration
      if (!lrclibRes.ok) {
        const cleanedTitle = title
          .replace(/\s*-\s*(?:remastered|remaster|live|single version|mono|stereo|bonus track).*/gi, '')
          .replace(/\((?:feat\.|featuring|ft\.|with|remastered|remaster|live|official).*?\)/gi, '')
          .replace(/\[(?:feat\.|featuring|ft\.|with|remastered|remaster|live|official).*?\]/gi, '')
          .trim();

        if (cleanedTitle && cleanedTitle !== title) {
          lrclibRes = await fetchLrcFromApi(cleanedTitle, durationSec);
        }
      }

      if (!lrclibRes.ok && durationSec) {
        lrclibRes = await fetchLrcFromApi(title);
      }

      if (lrclibRes.ok) {
        const data = (await lrclibRes.json()) as {
          syncedLyrics?: string | null;
          plainLyrics?: string | null;
          duration?: number;
        };

        if (data.syncedLyrics && data.syncedLyrics.trim().length > 0) {
          const ttml = convertLrcToTTML(data.syncedLyrics, {
            title,
            artist,
            durationMs: durationMs || (data.duration ? data.duration * 1000 : undefined),
          });

          return new Response(ttml, {
            status: 200,
            headers: {
              'Content-Type': 'application/ttml+xml; charset=utf-8',
              'X-Lyrics-Source': 'lrclib-fallback',
              'X-Song-Title': encodeURIComponent(title),
              'X-Song-Artist': encodeURIComponent(artist),
            },
          });
        }
      }
    } catch {
      // LRCLIB fetch failure, proceed to 404
    }
  }

  return c.json(
    {
      error: 'Lyrics not found in verified catalog or fallback sources',
      query: {
        trackId: trackId || null,
        title: title || null,
        artist: artist || null,
        duration: durationMs || null,
        platform: platform || null,
      },
    },
    404
  );
});
