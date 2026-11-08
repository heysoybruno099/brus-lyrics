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

async function handleSpotifyExchange(c: any) {
  let body: any = {};
  const contentType = c.req.header('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json().catch(() => ({}));
  } else {
    body = await c.req.parseBody().catch(() => ({}));
  }

  const code = body.code;
  const codeVerifier = body.code_verifier || body.codeVerifier;
  const redirectUri = body.redirect_uri || body.redirectUri;
  const grantType = body.grant_type || (body.refresh_token ? 'refresh_token' : 'authorization_code');
  const refreshToken = body.refresh_token || body.refreshToken;

  const clientId = c.env?.SPOTIFY_CLIENT_ID || DEFAULT_SPOTIFY_CLIENT_ID;
  const clientSecret = c.env?.SPOTIFY_CLIENT_SECRET || DEFAULT_SPOTIFY_CLIENT_SECRET;

  if (grantType === 'authorization_code') {
    if (!code || !codeVerifier) {
      return c.json({ error: 'Missing code or code_verifier parameter' }, 400);
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: String(redirectUri || ''),
      client_id: clientId,
      code_verifier: String(codeVerifier),
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (clientSecret) {
      headers['Authorization'] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    }

    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers,
        body: params.toString(),
      });

      const data = (await res.json()) as any;
      if (!res.ok) {
        return c.json(data, res.status as any);
      }
      return c.json(data);
    } catch (err: any) {
      return c.json({ error: 'Failed to exchange Spotify authorization code', message: err.message }, 502);
    }
  } else if (grantType === 'refresh_token') {
    if (!refreshToken) {
      return c.json({ error: 'Missing refresh_token parameter' }, 400);
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: String(refreshToken),
      client_id: clientId,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (clientSecret) {
      headers['Authorization'] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    }

    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers,
        body: params.toString(),
      });

      const data = (await res.json()) as any;
      if (!res.ok) {
        return c.json(data, res.status as any);
      }
      return c.json(data);
    } catch (err: any) {
      return c.json({ error: 'Failed to refresh Spotify token', message: err.message }, 502);
    }
  }

  return c.json({ error: 'Unsupported grant_type' }, 400);
}

spotifyRoute.post('/spotify/exchange', handleSpotifyExchange);
spotifyRoute.post('/exchange', handleSpotifyExchange);

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
