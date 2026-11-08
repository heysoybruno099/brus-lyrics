import type { CatalogEntry, CatalogPaginationResponse } from '@brus-lyrics/shared-types';
import { cleanTrackId } from '@brus-lyrics/shared-types';
import type { Env } from '../types.js';

export async function findSongByTrackId(
  env: Env,
  trackId: string,
  platform?: string
): Promise<CatalogEntry | null> {
  const cleanId = cleanTrackId(trackId) || trackId.trim();
  const normPlatform = platform ? platform.toLowerCase().trim() : '';

  if (env.DB) {
    try {
      let query: string;
      if (normPlatform === 'spotify') {
        query = 'SELECT * FROM songs WHERE spotify_id = ?1 OR spotify_id = ?2 LIMIT 1';
      } else if (normPlatform === 'ytm' || normPlatform === 'youtube') {
        query = 'SELECT * FROM songs WHERE ytm_id = ?1 OR ytm_id = ?2 LIMIT 1';
      } else {
        query = 'SELECT * FROM songs WHERE spotify_id = ?1 OR spotify_id = ?2 OR ytm_id = ?1 OR ytm_id = ?2 OR id = ?1 OR id = ?2 LIMIT 1';
      }

      const row = await env.DB.prepare(query).bind(cleanId, trackId).first<CatalogEntry>();
      if (row) return row;
    } catch {
      // Fallback to in-memory/catalog if D1 query fails
    }
  }

  const catalog = env.LOCAL_CATALOG || [];
  const match = catalog.find((song) => {
    if (normPlatform === 'spotify') {
      return song.spotify_id === cleanId || song.spotify_id === trackId;
    }
    if (normPlatform === 'ytm' || normPlatform === 'youtube') {
      return song.ytm_id === cleanId || song.ytm_id === trackId;
    }
    return (
      song.spotify_id === cleanId ||
      song.spotify_id === trackId ||
      song.ytm_id === cleanId ||
      song.ytm_id === trackId ||
      song.id === cleanId ||
      song.id === trackId
    );
  });

  return match || null;
}

export async function findSongByNormalized(
  env: Env,
  titleNorm: string,
  artistNorm: string,
  durationMs?: number
): Promise<CatalogEntry | null> {
  if (env.DB) {
    try {
      if (durationMs && durationMs > 0) {
        const query = `
          SELECT * FROM songs
          WHERE title_norm = ?1
            AND (artist_norm = ?2 OR artist_norm LIKE '%' || ?2 || '%' OR ?2 LIKE '%' || artist_norm || '%')
            AND ABS(duration_ms - ?3) <= 2500
          ORDER BY ABS(duration_ms - ?3) ASC
          LIMIT 1
        `;
        const row = await env.DB.prepare(query)
          .bind(titleNorm, artistNorm, durationMs)
          .first<CatalogEntry>();
        if (row) return row;
      } else {
        const query = `
          SELECT * FROM songs
          WHERE title_norm = ?1
            AND (artist_norm = ?2 OR artist_norm LIKE '%' || ?2 || '%' OR ?2 LIKE '%' || artist_norm || '%')
          LIMIT 1
        `;
        const row = await env.DB.prepare(query)
          .bind(titleNorm, artistNorm)
          .first<CatalogEntry>();
        if (row) return row;
      }
    } catch {
      // Fallback to catalog
    }
  }

  const catalog = env.LOCAL_CATALOG || [];
  const matches = catalog.filter((song) => {
    if (song.title_norm !== titleNorm) return false;
    // Check exact artist_norm match or substring match
    const artistMatches =
      song.artist_norm === artistNorm ||
      song.artist_norm.includes(artistNorm) ||
      artistNorm.includes(song.artist_norm);
    if (!artistMatches) return false;

    if (durationMs && durationMs > 0) {
      const diff = Math.abs(song.duration_ms - durationMs);
      return diff <= 2500;
    }
    return true;
  });

  if (matches.length === 0) return null;

  if (durationMs && durationMs > 0) {
    matches.sort((a, b) => {
      return Math.abs(a.duration_ms - durationMs) - Math.abs(b.duration_ms - durationMs);
    });
  }

  return matches[0] || null;
}

export async function getPaginatedCatalog(
  env: Env,
  page: number = 1,
  pageSize: number = 20,
  search?: string
): Promise<CatalogPaginationResponse> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, pageSize));
  const offset = (safePage - 1) * safeLimit;

  if (env.DB) {
    try {
      if (search && search.trim().length > 0) {
        const queryPattern = `%${search.trim().toLowerCase()}%`;
        const countRes = await env.DB.prepare(
          'SELECT COUNT(*) as total FROM songs WHERE title_norm LIKE ?1 OR artist_norm LIKE ?1'
        ).bind(queryPattern).first<{ total: number }>();
        const total = countRes?.total || 0;

        const rows = await env.DB.prepare(
          'SELECT * FROM songs WHERE title_norm LIKE ?1 OR artist_norm LIKE ?1 ORDER BY updated_at DESC LIMIT ?2 OFFSET ?3'
        ).bind(queryPattern, safeLimit, offset).all<CatalogEntry>();

        return {
          songs: rows.results || [],
          total,
          page: safePage,
          pageSize: safeLimit,
          totalPages: Math.ceil(total / safeLimit) || 1,
        };
      } else {
        const countRes = await env.DB.prepare('SELECT COUNT(*) as total FROM songs').first<{ total: number }>();
        const total = countRes?.total || 0;

        const rows = await env.DB.prepare(
          'SELECT * FROM songs ORDER BY updated_at DESC LIMIT ?1 OFFSET ?2'
        ).bind(safeLimit, offset).all<CatalogEntry>();

        return {
          songs: rows.results || [],
          total,
          page: safePage,
          pageSize: safeLimit,
          totalPages: Math.ceil(total / safeLimit) || 1,
        };
      }
    } catch {
      // Fallback to local catalog
    }
  }

  let catalog = env.LOCAL_CATALOG || [];
  if (search && search.trim().length > 0) {
    const s = search.trim().toLowerCase();
    catalog = catalog.filter((song) =>
      song.title.toLowerCase().includes(s) ||
      song.artist.toLowerCase().includes(s) ||
      song.title_norm.includes(s) ||
      song.artist_norm.includes(s)
    );
  }

  const total = catalog.length;
  const songs = catalog.slice(offset, offset + safeLimit);

  return {
    songs,
    total,
    page: safePage,
    pageSize: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

export async function queueSubmission(
  env: Env,
  submission: {
    id: string;
    spotify_id?: string | null;
    ytm_id?: string | null;
    isrc?: string | null;
    title: string;
    artist: string;
    duration_ms: number;
    contributor: string;
    ttml_raw: string;
  }
): Promise<void> {
  if (env.DB) {
    const query = `
      INSERT INTO submissions (id, spotify_id, ytm_id, isrc, title, artist, duration_ms, contributor, ttml_raw, status, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'pending', ?10)
    `;
    await env.DB.prepare(query)
      .bind(
        submission.id,
        submission.spotify_id || null,
        submission.ytm_id || null,
        submission.isrc || null,
        submission.title,
        submission.artist,
        submission.duration_ms,
        submission.contributor,
        submission.ttml_raw,
        new Date().toISOString()
      )
      .run();
  }
}
