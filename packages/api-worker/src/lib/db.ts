import type { CatalogEntry, CatalogPaginationResponse } from '@brus-lyrics/shared-types';
import { cleanTrackId, normalizeString } from '@brus-lyrics/shared-types';
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

export interface SubmissionRecord {
  id: string;
  spotify_id?: string | null;
  ytm_id?: string | null;
  isrc?: string | null;
  title: string;
  artist: string;
  duration_ms: number;
  contributor: string;
  ttml_raw: string;
  status: string;
  created_at: string;
}

const memorySubmissions = new Map<string, SubmissionRecord>();

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
  const record: SubmissionRecord = {
    ...submission,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  memorySubmissions.set(submission.id, record);

  if (env.DB) {
    try {
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
          record.created_at
        )
        .run();
    } catch {
      // Fallback to memorySubmissions
    }
  }
}

export async function deleteSong(env: Env, songId: string): Promise<boolean> {
  const cleanId = cleanTrackId(songId) || songId.trim();

  // 1. Remove from D1 database
  if (env.DB) {
    try {
      await env.DB.prepare('DELETE FROM songs WHERE id = ?1 OR spotify_id = ?1 OR ytm_id = ?1').bind(cleanId).run();
      await env.DB.prepare('DELETE FROM submissions WHERE id = ?1 OR spotify_id = ?1 OR ytm_id = ?1').bind(cleanId).run();
    } catch {
      // Fallback
    }
  }

  // 2. Remove from LOCAL_CATALOG
  if (env.LOCAL_CATALOG) {
    env.LOCAL_CATALOG = env.LOCAL_CATALOG.filter(
      (s) => s.id !== cleanId && s.spotify_id !== cleanId && s.ytm_id !== cleanId && !s.id.includes(cleanId)
    );
  }

  // 3. Remove from LOCAL_TTML_MAP
  if (env.LOCAL_TTML_MAP) {
    for (const key of Object.keys(env.LOCAL_TTML_MAP)) {
      if (key.includes(cleanId) || key === cleanId) {
        delete env.LOCAL_TTML_MAP[key];
      }
    }
  }

  // 4. Remove from memorySubmissions
  memorySubmissions.delete(cleanId);
  for (const [k, v] of memorySubmissions.entries()) {
    if (v.id === cleanId || v.spotify_id === cleanId || v.ytm_id === cleanId) {
      memorySubmissions.delete(k);
    }
  }

  return true;
}

export async function verifySong(env: Env, songId: string, verified: boolean = true): Promise<boolean> {
  const cleanId = cleanTrackId(songId) || songId.trim();
  const newStatus = verified ? 'verified' : 'pending';
  const verifiedInt = verified ? 1 : 0;

  // 1. Update in D1
  if (env.DB) {
    try {
      await env.DB.prepare('UPDATE submissions SET status = ?1 WHERE id = ?2 OR spotify_id = ?2').bind(newStatus, cleanId).run();
      const updatedSongs = await env.DB.prepare('UPDATE songs SET is_verified = ?1, contributor = ?2 WHERE id = ?3 OR spotify_id = ?3')
        .bind(verifiedInt, verified ? 'Verified Catalog' : 'community', cleanId)
        .run();

      // If song is not in songs table yet and is being verified, check submissions and promote
      const changes = (updatedSongs as any)?.meta?.changes ?? (updatedSongs as any)?.changes ?? 0;
      if (verified && changes === 0) {
        const sub = await env.DB.prepare('SELECT * FROM submissions WHERE id = ?1 OR spotify_id = ?1 LIMIT 1').bind(cleanId).first<SubmissionRecord>();
        if (sub) {
          const titleNorm = normalizeString(sub.title);
          const artistNorm = normalizeString(sub.artist);
          const filePath = `database/ttml/${sub.spotify_id || sub.ytm_id || sub.id.replace(/^song_/, '')}.ttml`;
          const now = new Date().toISOString();
          await env.DB.prepare(`
            INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, is_verified, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 1, ?12)
            ON CONFLICT(id) DO UPDATE SET is_verified = 1, contributor = excluded.contributor, updated_at = excluded.updated_at
          `).bind(
            sub.id,
            sub.spotify_id || null,
            sub.ytm_id || null,
            sub.isrc || null,
            sub.title,
            sub.artist,
            titleNorm,
            artistNorm,
            sub.duration_ms,
            filePath,
            'Verified Catalog',
            now
          ).run();
        }
      }
    } catch {
      // Fallback
    }
  }

  // 2. Update in LOCAL_CATALOG
  if (env.LOCAL_CATALOG) {
    const item = env.LOCAL_CATALOG.find(
      (s) => s.id === cleanId || s.spotify_id === cleanId || s.ytm_id === cleanId || s.id.includes(cleanId)
    );
    if (item) {
      item.contributor = verified ? 'Verified Catalog' : 'community';
      item.is_verified = verifiedInt;
    } else if (verified) {
      const sub = memorySubmissions.get(cleanId) || Array.from(memorySubmissions.values()).find(s => s.id === cleanId || s.spotify_id === cleanId);
      if (sub) {
        env.LOCAL_CATALOG.unshift({
          id: sub.id,
          spotify_id: sub.spotify_id || null,
          ytm_id: sub.ytm_id || null,
          isrc: sub.isrc || null,
          title: sub.title,
          artist: sub.artist,
          title_norm: normalizeString(sub.title),
          artist_norm: normalizeString(sub.artist),
          duration_ms: sub.duration_ms,
          file_path: `database/ttml/${sub.spotify_id || sub.ytm_id || sub.id.replace(/^song_/, '')}.ttml`,
          contributor: 'Verified Catalog',
          is_verified: 1,
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  // 3. Update in memorySubmissions
  const sub = memorySubmissions.get(cleanId);
  if (sub) {
    sub.status = newStatus;
  }
  for (const v of memorySubmissions.values()) {
    if (v.id === cleanId || v.spotify_id === cleanId) {
      v.status = newStatus;
    }
  }

  return true;
}

export async function getAllAdminSongs(env: Env): Promise<{ catalog: CatalogEntry[]; submissions: SubmissionRecord[] }> {
  let catalog: CatalogEntry[] = [];
  let submissions: SubmissionRecord[] = [];

  if (env.DB) {
    try {
      const catRes = await env.DB.prepare('SELECT * FROM songs ORDER BY updated_at DESC').all<CatalogEntry>();
      if (catRes && catRes.results) {
        catalog = catRes.results;
      }
      const subRes = await env.DB.prepare('SELECT * FROM submissions ORDER BY created_at DESC').all<SubmissionRecord>();
      if (subRes && subRes.results) {
        submissions = subRes.results;
      }
    } catch {
      // Fallback
    }
  }

  if (catalog.length === 0) {
    catalog = env.LOCAL_CATALOG || [];
  }

  if (submissions.length === 0) {
    submissions = Array.from(memorySubmissions.values());
  }

  return { catalog, submissions };
}

export interface UserRecord {
  id: string;
  username: string;
  discriminator?: string;
  avatar?: string | null;
  email?: string | null;
  role: string;
  is_verified: number;
  created_at: string;
  updated_at: string;
}

const memoryUsers = new Map<string, UserRecord>([
  [
    'heysoybruno09',
    {
      id: 'heysoybruno09',
      username: 'heysoybruno09',
      discriminator: '0000',
      avatar: null,
      email: 'heysoybruno09@bruslyrics.com',
      role: 'admin',
      is_verified: 1,
      created_at: '2026-11-08T00:00:00.000Z',
      updated_at: '2026-11-08T00:00:00.000Z',
    },
  ],
  [
    '1568826229006540882',
    {
      id: '1568826229006540882',
      username: 'Bru',
      discriminator: '0',
      avatar: null,
      email: 'bruno@bruslyrics.com',
      role: 'verified_creator',
      is_verified: 1,
      created_at: '2026-11-08T00:00:00.000Z',
      updated_at: '2026-11-08T00:00:00.000Z',
    },
  ],
]);

export async function upsertUser(
  env: Env,
  user: {
    id: string;
    username: string;
    discriminator?: string;
    avatar?: string | null;
    email?: string | null;
    role?: string;
    is_verified?: number;
  }
): Promise<UserRecord> {
  const now = new Date().toISOString();
  const isCreator =
    user.id === '1568826229006540882' ||
    user.username.toLowerCase() === 'heysoybruno09' ||
    user.username.toLowerCase() === 'bru' ||
    user.role === 'verified_creator' ||
    user.role === 'admin';

  const record: UserRecord = {
    id: user.id.trim(),
    username: user.username.trim(),
    discriminator: user.discriminator || '0',
    avatar: user.avatar || null,
    email: user.email || null,
    role: isCreator ? 'verified_creator' : (user.role || 'contributor'),
    is_verified: isCreator ? 1 : (user.is_verified ?? 1),
    created_at: now,
    updated_at: now,
  };

  if (env.DB) {
    try {
      const query = `
        INSERT INTO users (id, username, discriminator, avatar, email, role, is_verified, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
        ON CONFLICT(id) DO UPDATE SET
          username = excluded.username,
          discriminator = excluded.discriminator,
          avatar = excluded.avatar,
          email = excluded.email,
          role = excluded.role,
          is_verified = excluded.is_verified,
          updated_at = excluded.updated_at
      `;
      await env.DB.prepare(query)
        .bind(
          record.id,
          record.username,
          record.discriminator,
          record.avatar,
          record.email,
          record.role,
          record.is_verified,
          record.updated_at
        )
        .run();
    } catch {
      // Fallback to memory
    }
  }

  memoryUsers.set(record.id, record);
  return record;
}

export async function getUserByUsername(env: Env, username: string): Promise<UserRecord | null> {
  const normUser = username.trim().toLowerCase().replace(/^@/, '');
  if (env.DB) {
    try {
      const query = 'SELECT * FROM users WHERE LOWER(username) = ?1 LIMIT 1';
      const row = await env.DB.prepare(query).bind(normUser).first<UserRecord>();
      if (row) return row;
    } catch {
      // Fallback
    }
  }

  for (const user of memoryUsers.values()) {
    if (user.username.toLowerCase() === normUser) {
      return user;
    }
  }

  if (normUser === 'bru') {
    return memoryUsers.get('1568826229006540882') || null;
  }

  return null;
}

export async function getUserById(env: Env, id: string): Promise<UserRecord | null> {
  const cleanId = id.trim();
  if (env.DB) {
    try {
      const query = 'SELECT * FROM users WHERE id = ?1 LIMIT 1';
      const row = await env.DB.prepare(query).bind(cleanId).first<UserRecord>();
      if (row) return row;
    } catch {
      // Fallback
    }
  }

  return memoryUsers.get(cleanId) || null;
}
