import type { SpotifyUserProfile } from './types.js';
import { getApiBaseUrl } from './config.js';

export const SPOTIFY_CLIENT_ID = '9b91a4fd101942cfb3fafbfad89e5d70';
export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ');

const STORAGE_KEY_TOKEN = 'brus_lyrics_spotify_token';
const STORAGE_KEY_REFRESH = 'brus_lyrics_spotify_refresh_token';
const STORAGE_KEY_EXPIRY = 'brus_lyrics_spotify_expires_at';
const STORAGE_KEY_USER = 'brus_lyrics_spotify_user';
const STORAGE_KEY_VERIFIER = 'brus_lyrics_spotify_code_verifier';

export interface SpotifyAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

/**
 * Generates a high-entropy cryptographic code_verifier conforming to RFC 7636.
 * Contains characters [A-Z, a-z, 0-9, -._~] with default length 64 (within 43-128 range).
 */
export function generateCodeVerifier(length: number = 64): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomBytes = new Uint8Array(length);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let verifier = '';
  for (let i = 0; i < length; i++) {
    verifier += charset[randomBytes[i] % charset.length];
  }
  return verifier;
}

/**
 * Base64url encodes an ArrayBuffer digest without padding.
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generates a SHA-256 base64url-encoded code_challenge from a code_verifier (RFC 7636).
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);

  const subtleCrypto =
    typeof crypto !== 'undefined' && crypto.subtle
      ? crypto.subtle
      : typeof globalThis !== 'undefined' && (globalThis as any).crypto?.subtle
      ? (globalThis as any).crypto.subtle
      : null;

  if (subtleCrypto && subtleCrypto.digest) {
    const digest = await subtleCrypto.digest('SHA-256', data);
    return base64UrlEncode(digest);
  }

  throw new Error('Web Cryptography API (crypto.subtle) is required for SHA-256 code challenge generation');
}

/**
 * Persists PKCE code_verifier in sessionStorage (and localStorage backup).
 */
export function saveSpotifyCodeVerifier(verifier: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.sessionStorage) {
      sessionStorage.setItem(STORAGE_KEY_VERIFIER, verifier);
    }
    if (window.localStorage) {
      localStorage.setItem(STORAGE_KEY_VERIFIER, verifier);
    }
  } catch {
    // Storage quota or restriction fallback
  }
}

/**
 * Retrieves persisted PKCE code_verifier from sessionStorage (or localStorage backup).
 */
export function getStoredSpotifyCodeVerifier(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    if (window.sessionStorage) {
      const v = sessionStorage.getItem(STORAGE_KEY_VERIFIER);
      if (v) return v;
    }
    if (window.localStorage) {
      return localStorage.getItem(STORAGE_KEY_VERIFIER);
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Removes PKCE code_verifier from session and local storage.
 */
export function clearSpotifyCodeVerifier(): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.sessionStorage) {
      sessionStorage.removeItem(STORAGE_KEY_VERIFIER);
    }
    if (window.localStorage) {
      localStorage.removeItem(STORAGE_KEY_VERIFIER);
    }
  } catch {
    // Ignore
  }
}

/**
 * Constructs Spotify Authorization Code Flow with PKCE URL (response_type=code).
 */
export async function buildSpotifyOAuthUrl(
  redirectUri?: string,
  existingVerifier?: string
): Promise<string> {
  const redirect =
    redirectUri ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/callback`
      : 'https://brus-lyrics.pages.dev/callback');

  const verifier = existingVerifier || generateCodeVerifier();
  saveSpotifyCodeVerifier(verifier);
  const challenge = await generateCodeChallenge(verifier);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirect,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state: 'spotify_auth',
    show_dialog: 'true',
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Exchanges authorization code for access and refresh tokens using PKCE verifier.
 * Tries the dedicated API Worker route (/v1/spotify/exchange) first for seamless CORS,
 * falling back to accounts.spotify.com/api/token directly.
 */
export async function exchangeSpotifyCodeForToken(
  code: string,
  redirectUri?: string
): Promise<SpotifyAuthTokenResult | null> {
  const verifier = getStoredSpotifyCodeVerifier();
  if (!verifier) {
    console.warn('Spotify PKCE code_verifier not found in storage');
    return null;
  }

  const redirect =
    redirectUri ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/callback`
      : 'https://brus-lyrics.pages.dev/callback');

  // Attempt 1: Worker API route POST /v1/spotify/exchange
  try {
    const apiBase = getApiBaseUrl().replace(/\/+$/, '');
    const workerRes = await fetch(`${apiBase}/v1/spotify/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        redirect_uri: redirect,
      }),
    });

    if (workerRes.ok) {
      const data = (await workerRes.json()) as {
        access_token: string;
        expires_in?: number;
        refresh_token?: string;
      };
      if (data.access_token) {
        saveSpotifyToken(data.access_token, data.expires_in || 3600, data.refresh_token);
        clearSpotifyCodeVerifier();
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in || 3600,
        };
      }
    }
  } catch {
    // Proceed to direct Spotify token endpoint fallback
  }

  // Attempt 2: Direct exchange with Spotify Accounts API
  try {
    const body = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect,
      code_verifier: verifier,
    });

    const directRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (directRes.ok) {
      const data = (await directRes.json()) as {
        access_token: string;
        expires_in?: number;
        refresh_token?: string;
      };
      if (data.access_token) {
        saveSpotifyToken(data.access_token, data.expires_in || 3600, data.refresh_token);
        clearSpotifyCodeVerifier();
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in || 3600,
        };
      }
    }
  } catch {
    // Direct exchange also failed
  }

  return null;
}

/**
 * Renews expired Spotify access token using stored refresh token.
 */
export async function refreshSpotifyToken(): Promise<string | null> {
  const refreshToken = getStoredSpotifyRefreshToken();
  if (!refreshToken) return null;

  // Attempt 1: Worker API route
  try {
    const apiBase = getApiBaseUrl().replace(/\/+$/, '');
    const workerRes = await fetch(`${apiBase}/v1/spotify/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (workerRes.ok) {
      const data = (await workerRes.json()) as {
        access_token: string;
        expires_in?: number;
        refresh_token?: string;
      };
      if (data.access_token) {
        saveSpotifyToken(data.access_token, data.expires_in || 3600, data.refresh_token || refreshToken);
        return data.access_token;
      }
    }
  } catch {
    // Fallback to direct token endpoint
  }

  // Attempt 2: Direct exchange
  try {
    const body = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const directRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (directRes.ok) {
      const data = (await directRes.json()) as {
        access_token: string;
        expires_in?: number;
        refresh_token?: string;
      };
      if (data.access_token) {
        saveSpotifyToken(data.access_token, data.expires_in || 3600, data.refresh_token || refreshToken);
        return data.access_token;
      }
    }
  } catch {
    // Failed
  }

  return null;
}

/**
 * Legacy implicit grant parser retained for backward compatibility.
 */
export function parseSpotifyOAuthToken(): { accessToken: string; expiresIn: number } | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.substring(1);
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const state = params.get('state');
  const token = params.get('access_token');
  const expiresInRaw = params.get('expires_in');

  if (token && state === 'spotify_auth') {
    const expiresIn = expiresInRaw ? parseInt(expiresInRaw, 10) : 3600;
    saveSpotifyToken(token, expiresIn);
    return { accessToken: token, expiresIn };
  }

  return null;
}

export function saveSpotifyToken(
  token: string,
  expiresInSec: number = 3600,
  refreshToken?: string
): void {
  if (typeof window === 'undefined') return;
  const expiresAt = Date.now() + expiresInSec * 1000;
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  localStorage.setItem(STORAGE_KEY_EXPIRY, String(expiresAt));
  if (refreshToken) {
    localStorage.setItem(STORAGE_KEY_REFRESH, refreshToken);
  }
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
        return null;
      }
    }
    return token;
  } catch {
    return null;
  }
}

export function getStoredSpotifyRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY_REFRESH);
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
  localStorage.removeItem(STORAGE_KEY_REFRESH);
  localStorage.removeItem(STORAGE_KEY_EXPIRY);
  localStorage.removeItem(STORAGE_KEY_USER);
  clearSpotifyCodeVerifier();
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
