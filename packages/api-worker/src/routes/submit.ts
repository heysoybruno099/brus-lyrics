import { Hono } from 'hono';
import { normalizeString } from '@brus-lyrics/shared-types';
import type { SubmitLyricsPayload, SubmitLyricsResponse } from '@brus-lyrics/shared-types';
import type { Env } from '../types.js';
import { validateTTML } from '../lib/ttml-validator.js';
import { commitTTMLToGitHub } from '../lib/storage.js';
import { queueSubmission } from '../lib/db.js';

export const submitRoute = new Hono<{ Bindings: Env }>();

function generateSongSlug(title: string, artist: string): string {
  const normTitle = normalizeString(title).replace(/\s+/g, '_').slice(0, 30);
  const normArtist = normalizeString(artist).replace(/\s+/g, '_').slice(0, 30);
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${normArtist}_${normTitle}_${randomSuffix}`;
}

submitRoute.post('/submit', async (c) => {
  let body: SubmitLyricsPayload;
  try {
    body = await c.req.json<SubmitLyricsPayload>();
  } catch {
    return c.json({ error: 'Malformed JSON payload in request body' }, 400);
  }

  const { metadata, ttmlRaw, contributor } = body;

  if (!ttmlRaw || typeof ttmlRaw !== 'string' || ttmlRaw.trim().length === 0) {
    return c.json({ error: 'Missing required field: ttmlRaw' }, 400);
  }

  if (!metadata || typeof metadata !== 'object') {
    return c.json({ error: 'Missing required field: metadata' }, 400);
  }

  if (!metadata.title || !metadata.artist) {
    return c.json({ error: 'Metadata must include title and artist' }, 400);
  }

  const durationMs = Number(metadata.durationMs);
  if (isNaN(durationMs) || durationMs <= 0) {
    return c.json({ error: 'Metadata durationMs must be a positive number' }, 400);
  }

  const contributorName = (contributor || metadata.contributor || 'Community Contributor').trim();

  // Validate TTML XML structure
  const validation = validateTTML(ttmlRaw);
  if (!validation.valid) {
    return c.json(
      {
        error: 'Invalid TTML XML structure',
        details: validation.error,
      },
      400
    );
  }

  const effectiveTarget = body.platformTarget || metadata.platformTarget || 'both';
  const effectiveSpotifyId = effectiveTarget === 'ytm' ? null : metadata.spotifyId || null;
  const effectiveYtmId = effectiveTarget === 'spotify' ? null : metadata.ytmId || null;

  // Determine file identifier
  const songIdentifier =
    effectiveSpotifyId?.trim() ||
    effectiveYtmId?.trim() ||
    generateSongSlug(metadata.title, metadata.artist);

  const filePath = `database/ttml/${songIdentifier}.ttml`;
  const songId = `song_${songIdentifier}`;

  try {
    // 1. Commit to GitHub storage or local cache
    const commitResult = await commitTTMLToGitHub(
      c.env,
      filePath,
      ttmlRaw,
      contributorName
    );

    const adminHeader = (c.req.header('X-Admin-User') || '').trim().toLowerCase().replace(/^@/, '');
    const adminIdHeader = (c.req.header('X-Admin-Id') || '').trim();
    const queryAdmin = (c.req.query('adminUser') || c.req.query('admin_user') || '').trim().toLowerCase().replace(/^@/, '');
    const queryAdminId = (c.req.query('adminId') || c.req.query('admin_id') || '').trim();
    const normContributor = contributorName.toLowerCase().replace(/^@/, '');

    const adminIds = ['708497847753900042', '1568826229006540882'];
    const adminUsernames = ['heysoybruno09', 'heysoybruno099', 'bru'];

    const isAdminCaller =
      adminIds.includes(adminIdHeader) ||
      adminIds.includes(queryAdminId) ||
      adminUsernames.includes(adminHeader) ||
      adminUsernames.includes(queryAdmin);

    const isAutoApproved = Boolean(isAdminCaller);

    // Anti-spoofing security: If contributor claims to be heysoybruno09, require authenticated admin credentials
    if (['heysoybruno09', 'heysoybruno099'].includes(normContributor) && !isAdminCaller) {
      return c.json({ error: 'Forbidden: Cannot submit as protected creator heysoybruno09 without admin authentication' }, 403);
    }

    // 2. Queue or record in D1 if available
    await queueSubmission(c.env, {
      id: songId,
      spotify_id: effectiveSpotifyId,
      ytm_id: effectiveYtmId,
      isrc: metadata.isrc || null,
      title: metadata.title.trim(),
      artist: metadata.artist.trim(),
      duration_ms: durationMs,
      contributor: contributorName,
      ttml_raw: ttmlRaw,
      platform_target: effectiveTarget,
      autoApprove: isAutoApproved,
    });

    const response: SubmitLyricsResponse = {
      success: true,
      message: commitResult.message,
      songId,
      action: commitResult.action,
      filePath: commitResult.filePath,
    };

    return c.json(response, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown storage error';
    return c.json(
      {
        error: 'Failed to commit lyrics submission',
        details: message,
      },
      500
    );
  }
});
