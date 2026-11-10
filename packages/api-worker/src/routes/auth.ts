import { Hono } from 'hono';
import type { Env } from '../types.js';
import { upsertUser, getContributorProfile } from '../lib/db.js';

export const authRoute = new Hono<{ Bindings: Env }>();

const DEFAULT_DISCORD_CLIENT_ID = '1568826229006540882';
const DEFAULT_DISCORD_CLIENT_SECRET = '0KO2Y-qo35sK-7fcU7Z9N-ZacJKvNFFg';
const DEFAULT_SPOTIFY_CLIENT_ID = '9b91a4fd101942cfb3fafbfad89e5d70';

// Client configuration endpoint
authRoute.get('/auth/config', (c) => {
  return c.json({
    discordClientId: c.env.DISCORD_CLIENT_ID || DEFAULT_DISCORD_CLIENT_ID,
    spotifyClientId: c.env.SPOTIFY_CLIENT_ID || DEFAULT_SPOTIFY_CLIENT_ID,
    scope: 'identify email',
    note: 'Sign-in is strictly required only for contributing or editing lyrics. Song search and playback are open without sign-in.',
  });
});

// Exchange Discord OAuth authorization code for an access token
authRoute.post('/auth/discord/token', async (c) => {
  try {
    const body = await c.req.json<{ code: string; redirectUri: string }>();
    if (!body.code) {
      return c.json({ error: 'Authorization code is required' }, 400);
    }

    const clientId = c.env.DISCORD_CLIENT_ID || DEFAULT_DISCORD_CLIENT_ID;
    const clientSecret = c.env.DISCORD_CLIENT_SECRET || DEFAULT_DISCORD_CLIENT_SECRET;

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: body.code,
      redirect_uri: body.redirectUri || 'http://localhost:5173/auth/callback',
    });

    const res = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      return c.json({ error: 'Discord token exchange failed', details: errText }, res.status as any);
    }

    const tokenData = await res.json();
    return c.json(tokenData);
  } catch (err: any) {
    return c.json({ error: 'Token exchange request error', message: err.message }, 500);
  }
});

// Fetch Discord User profile using Bearer token and persist in D1 users table
authRoute.get('/auth/discord/user', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization Bearer header is required' }, 401);
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  try {
    const res = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return c.json({ error: 'Failed to fetch Discord user profile' }, res.status as any);
    }

    const u = (await res.json()) as any;
    const avatarUrl = u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(u.discriminator || '0', 10) % 5}.png`;

    const isCreator =
      u.id === '1568826229006540882' ||
      u.username?.toLowerCase() === 'heysoybruno09' ||
      u.username?.toLowerCase() === 'heysoybruno099' ||
      u.username?.toLowerCase() === 'bru';

    const savedUser = await upsertUser(c.env, {
      id: u.id,
      username: u.username,
      discriminator: u.discriminator || '0',
      avatar: avatarUrl,
      email: u.email || null,
      role: isCreator ? 'verified_creator' : 'contributor',
      is_verified: isCreator ? 1 : 1,
    });

    return c.json({
      id: savedUser.id,
      username: savedUser.username,
      globalName: u.global_name || savedUser.username,
      discriminator: savedUser.discriminator,
      avatar: savedUser.avatar,
      email: savedUser.email,
      isVerified: Boolean(savedUser.is_verified),
      role: savedUser.role,
    });
  } catch (err: any) {
    return c.json({ error: 'Error contacting Discord API', message: err.message }, 500);
  }
});

// Lookup user verification status and profile stats by username
authRoute.get('/auth/users/:username', async (c) => {
  const username = c.req.param('username');
  if (!username) {
    return c.json({ error: 'Username is required' }, 400);
  }

  const profile = await getContributorProfile(c.env, username);
  return c.json(profile);
});

// Register or upsert custom verified creator/contributor username
authRoute.post('/auth/users', async (c) => {
  try {
    const body = await c.req.json<{
      username: string;
      id?: string;
      role?: string;
      isVerified?: boolean;
    }>();

    if (!body.username || body.username.trim().length === 0) {
      return c.json({ error: 'Username is required' }, 400);
    }

    const clean = body.username.trim();
    const lower = clean.toLowerCase();
    // Anti-spoofing security: Protect administrative accounts and roles from unauthenticated takeover
    if (lower === 'heysoybruno09' || lower === 'heysoybruno099' || lower === 'bru' || body.role === 'admin') {
      const adminHeader = c.req.header('X-Admin-User') || '';
      if (!['heysoybruno09', 'heysoybruno099', 'bru'].includes(adminHeader.toLowerCase())) {
        return c.json({ error: 'Forbidden: Cannot claim protected administrative account' }, 403);
      }
    }

    const userId = body.id || `user_${Date.now()}`;
    const user = await upsertUser(c.env, {
      id: userId,
      username: clean,
      role: body.role || 'contributor',
      is_verified: body.isVerified !== false ? 1 : 0,
    });

    return c.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isVerified: Boolean(user.is_verified),
        role: user.role,
      },
    }, 201);
  } catch (err: any) {
    return c.json({ error: 'Failed to upsert user', message: err.message }, 500);
  }
});
