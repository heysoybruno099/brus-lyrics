import type { SpotifyUserProfile } from './types.js';

export const SPOTIFY_CLIENT_ID = '9b91a4fd101942cfb3fafbfad89e5d70';
export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ');

const STORAGE_KEY_TOKEN = 'brus_lyrics_spotify_token';
const STORAGE_KEY_EXPIRY = 'brus_lyrics_spotify_expires_at';
const STORAGE_KEY_USER = 'brus_lyrics_spotify_user';

export function buildSpotifyOAuthUrl(redirectUri?: string): string {
  const redirect =
    redirectUri ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/callback`
      : 'https://brus-lyrics.pages.dev/callback');

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'token',
    redirect_uri: redirect,
    scope: SPOTIFY_SCOPES,
    state: 'spotify_auth',
    show_dialog: 'true',
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export function parseSpotifyOAuthToken(): { accessToken: string; expiresIn: number } | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.substring(1);
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const state = params.get('state');
  const token = params.get('access_token');
  const expiresInRaw = params.get('expires_in');

  // Verify this redirect belongs to Spotify OAuth
  if (token && state === 'spotify_auth') {
    const expiresIn = expiresInRaw ? parseInt(expiresInRaw, 10) : 3600;
    saveSpotifyToken(token, expiresIn);
    return { accessToken: token, expiresIn };
  }

  return null;
}

export function saveSpotifyToken(token: string, expiresInSec: number = 3600): void {
  if (typeof window === 'undefined') return;
  const expiresAt = Date.now() + expiresInSec * 1000;
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  localStorage.setItem(STORAGE_KEY_EXPIRY, String(expiresAt));
}

export function getStoredSpotifyToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const expStr = localStorage.getItem(STORAGE_KEY_EXPIRY);
    if (!token) return null;

    if (expStr) {
      const exp = parseInt(expStr, 10);
      if (Date.now() > exp - 60000) {
        // Expired or about to expire in 1 minute
        clearSpotifyAuth();
        return null;
      }
    }
    return token;
  } catch {
    return null;
  }
}

export function getStoredSpotifyUser(): SpotifyUserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    return JSON.parse(raw) as SpotifyUserProfile;
  } catch {
    return null;
  }
}

export function saveSpotifyUser(user: SpotifyUserProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
}

export function clearSpotifyAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_EXPIRY);
  localStorage.removeItem(STORAGE_KEY_USER);
}

export async function fetchSpotifyUserProfile(accessToken: string): Promise<SpotifyUserProfile | null> {
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();

    const profile: SpotifyUserProfile = {
      id: data.id,
      displayName: data.display_name || data.id,
      email: data.email,
      product: data.product || 'free',
      isPremium: data.product === 'premium',
      images: data.images,
    };

    saveSpotifyUser(profile);
    return profile;
  } catch {
    return null;
  }
}
