import type { CatalogEntry, CatalogPaginationResponse } from '@brus-lyrics/shared-types';
import { cleanTrackId, normalizeString } from '@brus-lyrics/shared-types';
import type { Env } from '../types.js';
import { commitTTMLToGitHub } from './storage.js';

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
        query = 'SELECT * FROM songs WHERE (spotify_id = ?1 OR spotify_id = ?2) AND (platform_target IS NULL OR platform_target != "ytm") LIMIT 1';
      } else if (normPlatform === 'ytm' || normPlatform === 'youtube') {
        query = 'SELECT * FROM songs WHERE (ytm_id = ?1 OR ytm_id = ?2) AND (platform_target IS NULL OR platform_target != "spotify") LIMIT 1';
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
      if (song.platform_target === 'ytm') return false;
      return song.spotify_id === cleanId || song.spotify_id === trackId;
    }
    if (normPlatform === 'ytm' || normPlatform === 'youtube') {
      if (song.platform_target === 'spotify') return false;
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
  durationMs?: number,
  platform?: string
): Promise<CatalogEntry | null> {
  const normPlatform = platform ? platform.toLowerCase().trim() : '';
  const platformClause =
    normPlatform === 'spotify'
      ? ' AND (platform_target IS NULL OR platform_target != "ytm")'
      : normPlatform === 'ytm' || normPlatform === 'youtube'
      ? ' AND (platform_target IS NULL OR platform_target != "spotify")'
      : '';

  if (env.DB) {
    try {
      if (durationMs && durationMs > 0) {
        const query = `
          SELECT * FROM songs
          WHERE title_norm = ?1
            AND (artist_norm = ?2 OR artist_norm LIKE '%' || ?2 || '%' OR ?2 LIKE '%' || artist_norm || '%')
            AND ABS(duration_ms - ?3) <= 2500${platformClause}
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
            ${platformClause}
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
    if (normPlatform === 'spotify' && song.platform_target === 'ytm') return false;
    if ((normPlatform === 'ytm' || normPlatform === 'youtube') && song.platform_target === 'spotify') return false;

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
  platform_target?: string | null;
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
    platform_target?: string | null;
    autoApprove?: boolean;
  }
): Promise<void> {
  const isAuto = Boolean(submission.autoApprove);
  const status = isAuto ? 'verified' : 'pending';
  const isVerifiedInt = isAuto ? 1 : 0;
  const now = new Date().toISOString();

  const record: SubmissionRecord = {
    ...submission,
    status,
    created_at: now,
  };
  memorySubmissions.set(submission.id, record);

  const titleNorm = normalizeString(submission.title);
  const artistNorm = normalizeString(submission.artist);
  const baseName = submission.spotify_id || submission.ytm_id || submission.id.replace(/^song_/, '');
  const filePath = `database/ttml/${baseName}.ttml`;

  if (env.DB) {
    try {
      const query = `
        INSERT INTO submissions (id, spotify_id, ytm_id, isrc, title, artist, duration_ms, contributor, ttml_raw, status, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        ON CONFLICT(id) DO UPDATE SET
          spotify_id = COALESCE(excluded.spotify_id, submissions.spotify_id),
          ytm_id = COALESCE(excluded.ytm_id, submissions.ytm_id),
          isrc = COALESCE(excluded.isrc, submissions.isrc),
          title = excluded.title,
          artist = excluded.artist,
          duration_ms = excluded.duration_ms,
          contributor = excluded.contributor,
          ttml_raw = excluded.ttml_raw,
          status = excluded.status,
          created_at = excluded.created_at
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
          status,
          now
        )
        .run();

      if (isAuto) {
        await env.DB.prepare(`
          INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, is_verified, updated_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 1, ?12)
          ON CONFLICT(id) DO UPDATE SET
            spotify_id = COALESCE(excluded.spotify_id, songs.spotify_id),
            ytm_id = COALESCE(excluded.ytm_id, songs.ytm_id),
            isrc = COALESCE(excluded.isrc, songs.isrc),
            title = excluded.title,
            artist = excluded.artist,
            title_norm = excluded.title_norm,
            artist_norm = excluded.artist_norm,
            duration_ms = excluded.duration_ms,
            file_path = excluded.file_path,
            contributor = excluded.contributor,
            is_verified = 1,
            updated_at = excluded.updated_at
        `).bind(
          submission.id,
          submission.spotify_id || null,
          submission.ytm_id || null,
          submission.isrc || null,
          submission.title,
          submission.artist,
          titleNorm,
          artistNorm,
          submission.duration_ms,
          filePath,
          submission.contributor,
          now
        ).run();
      }
    } catch {
      // Fallback to memorySubmissions
    }
  }

  // Populate local catalog and ttml map for in-memory and local runtimes
  if (env.LOCAL_CATALOG) {
    for (let i = env.LOCAL_CATALOG.length - 1; i >= 0; i--) {
      const s = env.LOCAL_CATALOG[i];
      if (!s) continue;
      if (s.id === submission.id || (submission.spotify_id && s.spotify_id === submission.spotify_id)) {
        env.LOCAL_CATALOG.splice(i, 1);
      }
    }
    env.LOCAL_CATALOG.unshift({
      id: submission.id,
      spotify_id: submission.spotify_id || null,
      ytm_id: submission.ytm_id || null,
      isrc: submission.isrc || null,
      title: submission.title,
      artist: submission.artist,
      title_norm: titleNorm,
      artist_norm: artistNorm,
      duration_ms: submission.duration_ms,
      file_path: filePath,
      contributor: submission.contributor,
      updated_at: now,
      is_verified: isVerifiedInt,
      platform_target: (submission.platform_target as any) || null,
    });
  }

  if (env.LOCAL_TTML_MAP) {
    env.LOCAL_TTML_MAP[filePath] = submission.ttml_raw;
    env.LOCAL_TTML_MAP[`${baseName}.ttml`] = submission.ttml_raw;
    env.LOCAL_TTML_MAP[submission.id] = submission.ttml_raw;
    if (submission.spotify_id) env.LOCAL_TTML_MAP[submission.spotify_id] = submission.ttml_raw;
    if (submission.ytm_id) env.LOCAL_TTML_MAP[submission.ytm_id] = submission.ttml_raw;
  }
}

export function getMemoryTTML(identifier: string): string | null {
  const clean = identifier.replace(/\.ttml$/i, '').replace(/^song_/, '');
  for (const s of memorySubmissions.values()) {
    if (
      s.id === identifier ||
      s.id === `song_${clean}` ||
      s.id === clean ||
      s.spotify_id === clean ||
      s.ytm_id === clean
    ) {
      return s.ttml_raw;
    }
  }
  return null;
}

export async function deleteSong(env: Env, songId: string): Promise<boolean> {
  const cleanId = cleanTrackId(songId) || songId.trim();
  const rawId = songId.trim();
  const prefixedId = cleanId.startsWith('song_') ? cleanId : `song_${cleanId}`;
  const unprefixedId = cleanId.replace(/^song_/, '');
  const idsToDelete = [cleanId, rawId, prefixedId, unprefixedId];

  // 1. Remove from D1 database
  if (env.DB) {
    try {
      const q = `
        DELETE FROM songs
        WHERE id = ?1 OR id = ?2 OR id = ?3 OR id = ?4
           OR spotify_id = ?1 OR spotify_id = ?3 OR spotify_id = ?4
           OR ytm_id = ?1 OR ytm_id = ?3 OR ytm_id = ?4
      `;
      await env.DB.prepare(q).bind(cleanId, rawId, prefixedId, unprefixedId).run();

      const qSub = `
        DELETE FROM submissions
        WHERE id = ?1 OR id = ?2 OR id = ?3 OR id = ?4
           OR spotify_id = ?1 OR spotify_id = ?3 OR spotify_id = ?4
           OR ytm_id = ?1 OR ytm_id = ?3 OR ytm_id = ?4
      `;
      await env.DB.prepare(qSub).bind(cleanId, rawId, prefixedId, unprefixedId).run();
    } catch {
      // Fallback
    }
  }

  // 2. Remove from LOCAL_CATALOG in-place
  if (env.LOCAL_CATALOG) {
    for (let i = env.LOCAL_CATALOG.length - 1; i >= 0; i--) {
      const s = env.LOCAL_CATALOG[i];
      if (!s) continue;
      if (
        idsToDelete.includes(s.id) ||
        (s.spotify_id && idsToDelete.includes(s.spotify_id)) ||
        (s.ytm_id && idsToDelete.includes(s.ytm_id))
      ) {
        env.LOCAL_CATALOG.splice(i, 1);
      }
    }
  }

  // 3. Remove from LOCAL_TTML_MAP
  if (env.LOCAL_TTML_MAP) {
    for (const key of Object.keys(env.LOCAL_TTML_MAP)) {
      if (
        key.includes(cleanId) ||
        key.includes(unprefixedId) ||
        idsToDelete.includes(key)
      ) {
        delete env.LOCAL_TTML_MAP[key];
      }
    }
  }

  // 4. Remove from memorySubmissions
  for (const id of idsToDelete) {
    memorySubmissions.delete(id);
  }
  for (const [k, v] of memorySubmissions.entries()) {
    if (
      idsToDelete.includes(v.id) ||
      (v.spotify_id && idsToDelete.includes(v.spotify_id)) ||
      (v.ytm_id && idsToDelete.includes(v.ytm_id))
    ) {
      memorySubmissions.delete(k);
    }
  }

  return true;
}

export async function verifySong(env: Env, songId: string, verified: boolean = true): Promise<boolean> {
  const cleanId = cleanTrackId(songId) || songId.trim();
  const rawId = songId.trim();
  const prefixedId = cleanId.startsWith('song_') ? cleanId : `song_${cleanId}`;
  const unprefixedId = cleanId.replace(/^song_/, '');
  const newStatus = verified ? 'verified' : 'pending';
  const verifiedInt = verified ? 1 : 0;

  let verifiedSubmission: SubmissionRecord | null = null;

  // 1. Update in D1
  if (env.DB) {
    try {
      await env.DB.prepare(
        'UPDATE submissions SET status = ?1 WHERE id = ?2 OR id = ?3 OR id = ?4 OR id = ?5 OR spotify_id = ?2 OR spotify_id = ?4 OR ytm_id = ?2 OR ytm_id = ?4'
      ).bind(newStatus, cleanId, prefixedId, unprefixedId, rawId).run();

      await env.DB.prepare(
        'UPDATE songs SET is_verified = ?1 WHERE id = ?2 OR id = ?3 OR id = ?4 OR id = ?5 OR spotify_id = ?2 OR spotify_id = ?4 OR ytm_id = ?2 OR ytm_id = ?4'
      ).bind(verifiedInt, cleanId, prefixedId, unprefixedId, rawId).run();

      // When verified, always check submissions to promote to catalog and commit to cloud
      if (verified) {
        const sub = await env.DB.prepare(
          'SELECT * FROM submissions WHERE id = ?1 OR id = ?2 OR id = ?3 OR id = ?4 OR spotify_id = ?1 OR spotify_id = ?2 OR spotify_id = ?3 OR spotify_id = ?4 OR ytm_id = ?1 OR ytm_id = ?2 OR ytm_id = ?3 OR ytm_id = ?4 LIMIT 1'
        ).bind(cleanId, prefixedId, unprefixedId, rawId).first<SubmissionRecord>();

        if (sub) {
          verifiedSubmission = sub;
          const titleNorm = normalizeString(sub.title);
          const artistNorm = normalizeString(sub.artist);
          const baseName = sub.spotify_id || sub.ytm_id || sub.id.replace(/^song_/, '');
          const filePath = `database/ttml/${baseName}.ttml`;
          const now = new Date().toISOString();
          await env.DB.prepare(`
            INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, is_verified, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 1, ?12)
            ON CONFLICT(id) DO UPDATE SET
              spotify_id = COALESCE(excluded.spotify_id, songs.spotify_id),
              ytm_id = COALESCE(excluded.ytm_id, songs.ytm_id),
              isrc = COALESCE(excluded.isrc, songs.isrc),
              title = excluded.title,
              artist = excluded.artist,
              title_norm = excluded.title_norm,
              artist_norm = excluded.artist_norm,
              duration_ms = excluded.duration_ms,
              file_path = excluded.file_path,
              contributor = excluded.contributor,
              is_verified = 1,
              updated_at = excluded.updated_at
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
            sub.contributor || 'Verified Catalog',
            now
          ).run();
        }
      }
    } catch {
      // Fallback
    }
  }

  // Find in memory submissions if not found in D1
  if (!verifiedSubmission) {
    verifiedSubmission =
      memorySubmissions.get(cleanId) ||
      memorySubmissions.get(prefixedId) ||
      memorySubmissions.get(unprefixedId) ||
      memorySubmissions.get(rawId) ||
      Array.from(memorySubmissions.values()).find(
        (s) =>
          s.id === cleanId ||
          s.id === prefixedId ||
          s.id === unprefixedId ||
          s.spotify_id === cleanId ||
          s.spotify_id === unprefixedId ||
          s.ytm_id === cleanId ||
          s.ytm_id === unprefixedId
      ) ||
      null;
  }

  // 2. Commit to cloud storage (GitHub / local disk / memory map)
  if (verified && verifiedSubmission?.ttml_raw) {
    const baseName =
      verifiedSubmission.spotify_id ||
      verifiedSubmission.ytm_id ||
      verifiedSubmission.id.replace(/^song_/, '');
    const filePath = `database/ttml/${baseName}.ttml`;

    try {
      await commitTTMLToGitHub(
        env,
        filePath,
        verifiedSubmission.ttml_raw,
        verifiedSubmission.contributor || 'Verified Catalog'
      );
    } catch {
      // Non-fatal if GitHub token is absent
    }

    if (env.LOCAL_TTML_MAP) {
      env.LOCAL_TTML_MAP[filePath] = verifiedSubmission.ttml_raw;
      env.LOCAL_TTML_MAP[`${baseName}.ttml`] = verifiedSubmission.ttml_raw;
      env.LOCAL_TTML_MAP[cleanId] = verifiedSubmission.ttml_raw;
      env.LOCAL_TTML_MAP[unprefixedId] = verifiedSubmission.ttml_raw;
      env.LOCAL_TTML_MAP[prefixedId] = verifiedSubmission.ttml_raw;
    }
  }

  // 3. Update in LOCAL_CATALOG
  if (env.LOCAL_CATALOG) {
    const item = env.LOCAL_CATALOG.find(
      (s) =>
        s.id === cleanId ||
        s.id === prefixedId ||
        s.id === unprefixedId ||
        s.spotify_id === cleanId ||
        s.spotify_id === unprefixedId ||
        s.ytm_id === cleanId ||
        s.ytm_id === unprefixedId ||
        s.id.includes(cleanId)
    );
    if (item) {
      item.is_verified = verifiedInt;
      if (!item.contributor || item.contributor === 'community') {
        item.contributor = verified ? 'Verified Catalog' : 'community';
      }
    } else if (verified && verifiedSubmission) {
      env.LOCAL_CATALOG.unshift({
        id: verifiedSubmission.id,
        spotify_id: verifiedSubmission.spotify_id || null,
        ytm_id: verifiedSubmission.ytm_id || null,
        isrc: verifiedSubmission.isrc || null,
        title: verifiedSubmission.title,
        artist: verifiedSubmission.artist,
        title_norm: normalizeString(verifiedSubmission.title),
        artist_norm: normalizeString(verifiedSubmission.artist),
        duration_ms: verifiedSubmission.duration_ms,
        file_path: `database/ttml/${verifiedSubmission.spotify_id || verifiedSubmission.ytm_id || verifiedSubmission.id.replace(/^song_/, '')}.ttml`,
        contributor: verifiedSubmission.contributor || 'Verified Catalog',
        is_verified: 1,
        updated_at: new Date().toISOString(),
      });
    }
  }

  // 4. Update in memorySubmissions
  for (const v of memorySubmissions.values()) {
    if (
      v.id === cleanId ||
      v.id === prefixedId ||
      v.id === unprefixedId ||
      v.spotify_id === cleanId ||
      v.spotify_id === unprefixedId ||
      v.ytm_id === cleanId ||
      v.ytm_id === unprefixedId
    ) {
      v.status = newStatus;
    }
  }

  return true;
}

export interface ContributorProfile {
  id: string;
  username: string;
  isVerified: boolean;
  role: string;
  avatar: string | null;
  stats: {
    lyricsAdded: number;
    lyricsSynced: number;
    lyricsWanted: number;
  };
  songs: Array<{
    id: string;
    title: string;
    artist: string;
    album: string;
    artworkUrl: string;
    durationMs: number;
    isSyllableSynced: boolean;
    isVerified: boolean;
    spotifyId: string | null;
    ytmId: string | null;
    status: string;
  }>;
}

export async function getContributorProfile(env: Env, rawUsername: string): Promise<ContributorProfile> {
  const normUser = rawUsername.trim().toLowerCase().replace(/^@/, '');
  const user = await getUserByUsername(env, normUser);

  const isAdmin =
    normUser === 'heysoybruno09' ||
    normUser === 'heysoybruno099' ||
    normUser === '1568826229006540882';
  const isCreator = isAdmin || normUser === 'bru' || user?.role === 'verified_creator' || user?.role === 'admin';

  const userRecord = {
    id: isAdmin ? '1568826229006540882' : (user?.id || (normUser === 'bru' ? '1568826229006540882' : `user_${normUser}`)),
    username: user?.username || (isAdmin ? 'heysoybruno09' : rawUsername.trim().replace(/^@/, '')),
    isVerified: isCreator || Boolean(user?.is_verified),
    role: isAdmin ? 'admin' : isCreator ? 'verified_creator' : user?.role || 'contributor',
    avatar: user?.avatar || null,
  };

  const userSongs: ContributorProfile['songs'] = [];
  const seenSongIds = new Set<string>();

  // Check D1 songs and submissions
  if (env.DB) {
    try {
      const subRows = await env.DB.prepare(
        'SELECT * FROM submissions WHERE LOWER(contributor) = ?1 OR LOWER(contributor) LIKE "%" || ?1 || "%"'
      ).bind(normUser).all<SubmissionRecord>();

      if (subRows && subRows.results) {
        for (const s of subRows.results) {
          if (!seenSongIds.has(s.id)) {
            seenSongIds.add(s.id);
            const isSynced = (s.ttml_raw && s.ttml_raw.includes('<span begin=')) || true;
            userSongs.push({
              id: s.id,
              title: s.title,
              artist: s.artist,
              album: 'Single',
              artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273b06cf595709fa22a46c3b6ce',
              durationMs: s.duration_ms,
              isSyllableSynced: Boolean(isSynced),
              isVerified: s.status === 'verified',
              spotifyId: s.spotify_id || null,
              ytmId: s.ytm_id || null,
              status: s.status,
            });
          }
        }
      }

      const songRows = await env.DB.prepare(
        'SELECT * FROM songs WHERE LOWER(contributor) = ?1 OR LOWER(contributor) LIKE "%" || ?1 || "%"'
      ).bind(normUser).all<CatalogEntry>();

      if (songRows && songRows.results) {
        for (const s of songRows.results) {
          if (!seenSongIds.has(s.id)) {
            seenSongIds.add(s.id);
            userSongs.push({
              id: s.id,
              title: s.title,
              artist: s.artist,
              album: 'Catalog',
              artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273b06cf595709fa22a46c3b6ce',
              durationMs: s.duration_ms,
              isSyllableSynced: true,
              isVerified: Boolean(s.is_verified),
              spotifyId: s.spotify_id || null,
              ytmId: s.ytm_id || null,
              status: s.is_verified ? 'verified' : 'pending',
            });
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  // Also search memorySubmissions
  for (const s of memorySubmissions.values()) {
    const c = (s.contributor || '').toLowerCase();
    if (c === normUser || c.includes(normUser) || (normUser === 'bru' && c.includes('bru'))) {
      if (!seenSongIds.has(s.id)) {
        seenSongIds.add(s.id);
        userSongs.push({
          id: s.id,
          title: s.title,
          artist: s.artist,
          album: 'Submission',
          artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273b06cf595709fa22a46c3b6ce',
          durationMs: s.duration_ms,
          isSyllableSynced: Boolean(s.ttml_raw && s.ttml_raw.includes('<span begin=')),
          isVerified: s.status === 'verified',
          spotifyId: s.spotify_id || null,
          ytmId: s.ytm_id || null,
          status: s.status,
        });
      }
    }
  }

  // Also search LOCAL_CATALOG
  if (env.LOCAL_CATALOG) {
    for (const s of env.LOCAL_CATALOG) {
      const c = (s.contributor || '').toLowerCase();
      if (c === normUser || c.includes(normUser) || (normUser === 'bru' && c.includes('bru'))) {
        if (!seenSongIds.has(s.id)) {
          seenSongIds.add(s.id);
          userSongs.push({
            id: s.id,
            title: s.title,
            artist: s.artist,
            album: 'Catalog',
            artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273b06cf595709fa22a46c3b6ce',
            durationMs: s.duration_ms,
            isSyllableSynced: true,
            isVerified: Boolean(s.is_verified),
            spotifyId: s.spotify_id || null,
            ytmId: s.ytm_id || null,
            status: s.is_verified ? 'verified' : 'pending',
          });
        }
      }
    }
  }

  // If user is Bru or heysoybruno09 / heysoybruno099 and no songs registered yet, grant the featured tracks they authored
  if (userSongs.length === 0 && (normUser === 'bru' || normUser === 'heysoybruno09' || normUser === 'heysoybruno099')) {
    userSongs.push(
      {
        id: 'song_5wjiZSbxaLyLpGimpwqh1H',
        title: 'En la Ciudad de la Furia',
        artist: 'Soda Stereo',
        album: 'Doble Vida',
        artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273b06cf595709fa22a46c3b6ce',
        durationMs: 345533,
        isSyllableSynced: true,
        isVerified: true,
        spotifyId: '5wjiZSbxaLyLpGimpwqh1H',
        ytmId: 'O1zfuBgCUqY',
        status: 'verified',
      },
      {
        id: 'song_3uMYq07Kj5m564OQwdSCrD',
        title: 'Cuando Pase El Temblor',
        artist: 'Soda Stereo',
        album: 'Nada Personal',
        artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273d4dfa666e60bfa434beab255',
        durationMs: 229160,
        isSyllableSynced: true,
        isVerified: true,
        spotifyId: '3uMYq07Kj5m564OQwdSCrD',
        ytmId: 'oxkyfZAHVI4',
        status: 'verified',
      }
    );
  }

  const lyricsAdded = userSongs.length;
  const lyricsSynced = userSongs.filter((s) => s.isSyllableSynced).length;
  const totalCatalogCount = env.LOCAL_CATALOG?.length || 10;
  const lyricsWanted = Math.max(0, totalCatalogCount - lyricsSynced);

  return {
    id: userRecord.id,
    username: userRecord.username,
    isVerified: userRecord.isVerified,
    role: userRecord.role,
    avatar: userRecord.avatar,
    stats: {
      lyricsAdded,
      lyricsSynced,
      lyricsWanted,
    },
    songs: userSongs,
  };
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
      id: '1568826229006540882',
      username: 'heysoybruno09',
      discriminator: '8903',
      avatar: null,
      email: 'heysoybruno09@bruslyrics.com',
      role: 'admin',
      is_verified: 1,
      created_at: '2026-11-08T00:00:00.000Z',
      updated_at: '2026-11-08T00:00:00.000Z',
    },
  ],
  [
    'heysoybruno099',
    {
      id: '1568826229006540882',
      username: 'heysoybruno099',
      discriminator: '8903',
      avatar: null,
      email: 'heysoybruno099@bruslyrics.com',
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
      username: 'heysoybruno09',
      discriminator: '8903',
      avatar: null,
      email: 'heysoybruno09@bruslyrics.com',
      role: 'admin',
      is_verified: 1,
      created_at: '2026-11-08T00:00:00.000Z',
      updated_at: '2026-11-08T00:00:00.000Z',
    },
  ],
  [
    'bru',
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
  const isAdmin =
    user.id === '1568826229006540882' ||
    user.username.toLowerCase() === 'heysoybruno09' ||
    user.username.toLowerCase() === 'heysoybruno099' ||
    user.role === 'admin';
  const isCreator = isAdmin || user.username.toLowerCase() === 'bru' || user.role === 'verified_creator';

  const record: UserRecord = {
    id: user.id.trim(),
    username: user.username.trim(),
    discriminator: user.discriminator || '0',
    avatar: user.avatar || null,
    email: user.email || null,
    role: isAdmin ? 'admin' : isCreator ? 'verified_creator' : (user.role || 'contributor'),
    is_verified: (isAdmin || isCreator) ? 1 : (user.is_verified ?? 1),
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
  if (normUser === 'heysoybruno09') {
    return memoryUsers.get('heysoybruno09') || null;
  }
  if (normUser === 'heysoybruno099') {
    return memoryUsers.get('heysoybruno099') || null;
  }
  if (normUser === '1568826229006540882') {
    return memoryUsers.get('1568826229006540882') || null;
  }
  if (normUser === 'bru') {
    return memoryUsers.get('bru') || null;
  }

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

  return null;
}

export async function getUserById(env: Env, id: string): Promise<UserRecord | null> {
  const cleanId = id.trim();
  if (cleanId === '1568826229006540882') return memoryUsers.get('1568826229006540882') || null;
  if (cleanId === 'heysoybruno09') return memoryUsers.get('heysoybruno09') || null;
  if (cleanId === 'heysoybruno099') return memoryUsers.get('heysoybruno099') || null;
  if (cleanId === 'bru') return memoryUsers.get('bru') || null;

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
