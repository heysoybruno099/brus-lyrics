import { Hono } from 'hono';
import type { Env } from '../types.js';

export const spotifyRoute = new Hono<{ Bindings: Env }>();

const DEFAULT_SPOTIFY_CLIENT_ID = '9b91a4fd101942cfb3fafbfad89e5d70';
const DEFAULT_SPOTIFY_CLIENT_SECRET = 'bae08de7546a4ee4b7067e41c787c7b1';

// In-memory token cache for worker isolate
let cachedToken: {
  accessToken: string;
  expiresAt: number;
} | null = null;

async function getSpotifyAccessToken(env: Env): Promise<string | null> {
  const clientId = env.SPOTIFY_CLIENT_ID || DEFAULT_SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET || DEFAULT_SPOTIFY_CLIENT_SECRET;

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.accessToken;
  }

  try {
    const creds = btoa(`${clientId}:${clientSecret}`);
    const body = new URLSearchParams({ grant_type: 'client_credentials' });

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${creds}`,
      },
      body: body.toString(),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: now + (data.expires_in || 3600) * 1000,
    };

    return cachedToken.accessToken;
  } catch {
    return null;
  }
}

spotifyRoute.get('/spotify/token', async (c) => {
  const token = await getSpotifyAccessToken(c.env);
  if (!token) {
    return c.json({ error: 'Failed to obtain Spotify access token' }, 502);
  }
  return c.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 3600,
  });
});

spotifyRoute.get('/spotify/search', async (c) => {
  const query = c.req.query('q');
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));

  if (!query || query.trim().length === 0) {
    return c.json({ error: 'Search query parameter q is required' }, 400);
  }

  const token = await getSpotifyAccessToken(c.env);
  if (!token) {
    return c.json({ error: 'Spotify service unavailable' }, 502);
  }

  try {
    const spotifyUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      query.trim()
    )}&type=track&limit=${limit}`;

    const res = await fetch(spotifyUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return c.json({ error: 'Spotify search request failed', status: res.status }, res.status as any);
    }

    const data = (await res.json()) as {
      tracks?: {
        items?: Array<{
          id: string;
          name: string;
          artists: Array<{ name: string; id?: string }>;
          album?: {
            name: string;
            images?: Array<{ url: string; width?: number; height?: number }>;
            release_date?: string;
          };
          duration_ms: number;
          preview_url: string | null;
          external_urls?: { spotify?: string };
        }>;
        total: number;
      };
    };

    const tracks = (data.tracks?.items || []).map((t) => ({
      id: t.id,
      title: t.name,
      artist: t.artists.map((a) => a.name).join(', '),
      album: t.album?.name || '',
      artworkUrl: t.album?.images?.[0]?.url || null,
      durationMs: t.duration_ms,
      previewUrl: t.preview_url,
      spotifyUrl: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
    }));

    return c.json({
      tracks,
      total: data.tracks?.total || tracks.length,
      query,
    });
  } catch (err: any) {
    return c.json({ error: 'Error querying Spotify API', message: err.message }, 500);
  }
});

spotifyRoute.get('/spotify/track/:id', async (c) => {
  const trackId = c.req.param('id');
  const token = await getSpotifyAccessToken(c.env);
  if (!token) {
    return c.json({ error: 'Spotify service unavailable' }, 502);
  }

  try {
    const res = await fetch(`https://api.spotify.com/v1/tracks/${encodeURIComponent(trackId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return c.json({ error: 'Track not found on Spotify' }, res.status as any);
    }

    const t = (await res.json()) as any;
    return c.json({
      id: t.id,
      title: t.name,
      artist: t.artists.map((a: any) => a.name).join(', '),
      album: t.album?.name || '',
      artworkUrl: t.album?.images?.[0]?.url || null,
      durationMs: t.duration_ms,
      previewUrl: t.preview_url,
      spotifyUrl: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
    });
  } catch (err: any) {
    return c.json({ error: 'Failed to fetch Spotify track', message: err.message }, 500);
  }
});
