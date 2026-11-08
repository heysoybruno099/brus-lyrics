import type { DiscordUser } from './types.js';

export const DISCORD_CLIENT_ID = '1568826229006540882';
export const DISCORD_CLIENT_SECRET = '0KO2Y-qo35sK-7fcU7Z9N-ZacJKvNFFg';

const STORAGE_KEY = 'brus_lyrics_discord_user';

export function getStoredUser(): DiscordUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DiscordUser;
  } catch {
    return null;
  }
}

export function saveUser(user: DiscordUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function buildDiscordOAuthUrl(redirectUri?: string): string {
  const redirect =
    redirectUri ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/callback`
      : 'https://brus-lyrics.pages.dev/callback');

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: 'token',
    scope: 'identify email',
    redirect_uri: redirect,
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export function parseOAuthRedirectToken(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.substring(1);
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  if (token) {
    // Clear hash without reloading
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return token;
  }
  return null;
}

export async function fetchDiscordUserProfile(accessToken: string): Promise<DiscordUser | null> {
  try {
    const res = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const u = await res.json();
    const avatarUrl = u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(u.discriminator || '0', 10) % 5}.png`;

    const user: DiscordUser = {
      id: u.id,
      username: u.username,
      discriminator: u.discriminator,
      avatar: avatarUrl,
      email: u.email || null,
      isVerified: true,
      role: 'verified_creator',
    };
    saveUser(user);
    return user;
  } catch {
    return null;
  }
}

// Seamless developer / contributor sign-in for testing & verified creation
export function createMockVerifiedUser(username: string = 'Bru'): DiscordUser {
  const user: DiscordUser = {
    id: DISCORD_CLIENT_ID,
    username,
    discriminator: '0001',
    avatar: null,
    email: `${username.toLowerCase()}@bruslyrics.com`,
    isVerified: true,
    role: 'verified_creator',
  };
  saveUser(user);
  return user;
}
