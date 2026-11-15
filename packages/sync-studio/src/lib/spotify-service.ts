import type { UnifiedSongItem } from './types.js';
import { getApiBaseUrl, DEFAULT_PRODUCTION_API } from './config.js';

export const SPOTIFY_CLIENT_ID = '9b91a4fd101942cfb3fafbfad89e5d70';
export const SPOTIFY_CLIENT_SECRET = 'bae08de7546a4ee4b7067e41c787c7b1';

export {
  buildSpotifyOAuthUrl,
  exchangeSpotifyCodeForToken,
  refreshSpotifyToken,
  generateCodeVerifier,
  generateCodeChallenge,
  saveSpotifyCodeVerifier,
  getStoredSpotifyCodeVerifier,
  clearSpotifyCodeVerifier,
} from './spotify-auth.js';

// Verified default catalog tracks with rich metadata, artwork, and official studio audio tracks
export const VERIFIED_FEATURED_TRACKS: UnifiedSongItem[] = [
  {
    id: 'spotify_0VjIjW4GlUZAMYd2vXMi3b',
    spotifyId: '0VjIjW4GlUZAMYd2vXMi3b',
    ytmId: '4NRXx6U8ABQ',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
    durationMs: 200040,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_11mDIi9MNeOXoeSqiYQnWI',
    spotifyId: '11mDIi9MNeOXoeSqiYQnWI',
    ytmId: '25tKbsTDRS8',
    title: 'PANTI Y COLALE 2.0',
    artist: 'El Alfa',
    album: 'PANTI Y COLALE 2.0',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273e642500777950f8f396f47b5',
    durationMs: 279685,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_1ipcb9qXpSHWhSUvdxJhsx',
    spotifyId: '1ipcb9qXpSHWhSUvdxJhsx',
    ytmId: null,
    title: 'Forever and Ever, Amen',
    artist: 'Randy Travis',
    album: 'Always & Forever',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273723376f081b369b02795a7fb',
    durationMs: 212640,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_2Jko3yQgktaKnFcmyLv3g7',
    spotifyId: '2Jko3yQgktaKnFcmyLv3g7',
    ytmId: null,
    title: '1865 (96º In The Shade)',
    artist: 'Third World',
    album: '96 Degrees In The Shade',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27385022daef38da8c9a7f81ac6',
    durationMs: 267826,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_2XRqhe4lmCQVaUWawR5wRo',
    spotifyId: '2XRqhe4lmCQVaUWawR5wRo',
    ytmId: null,
    title: 'Rica y Apretadita',
    artist: 'El General, Anayka',
    album: 'Originales',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273a908ed6eeeb286b8775a1724',
    durationMs: 261866,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_36SJ7ZFx8J1f1RsewmUwMX',
    spotifyId: '36SJ7ZFx8J1f1RsewmUwMX',
    ytmId: '9tQRhAuJHGE',
    title: 'Magalenha',
    artist: 'Sérgio Mendes',
    album: 'Brasileiro',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273b415fc6505fe00219d017df4',
    durationMs: 216933,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_3h5T5JypYU7huFiVYhv1dr',
    spotifyId: '3h5T5JypYU7huFiVYhv1dr',
    ytmId: null,
    title: 'BbY WOW',
    artist: 'KAROL G',
    album: 'NO ME ARREPIENTO DE SENTIR TANTO',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27321deb742375f88edfb2e7368',
    durationMs: 225834,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_3KkXRkHbMCARz0aVfEt68P',
    spotifyId: '3KkXRkHbMCARz0aVfEt68P',
    ytmId: 'ApXoWvfEYVU',
    title: 'Sunflower',
    artist: 'Post Malone, Swae Lee',
    album: 'Spider-Man: Into the Spider-Verse',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273e2e352d89826aef6dbd5ff8f',
    durationMs: 158040,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_4Dvkj6JhhA12EX05fT7y2e',
    spotifyId: '4Dvkj6JhhA12EX05fT7y2e',
    ytmId: 'H5v3kku4y6Q',
    title: 'As It Was',
    artist: 'Harry Styles',
    album: "Harry's House",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b27382ce362511fb3d9dda6578ee',
    durationMs: 167303,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_5tRNzcUvgWGtuOozOR7skP',
    spotifyId: '5tRNzcUvgWGtuOozOR7skP',
    ytmId: null,
    title: 'El Paso del Gigante',
    artist: 'Grupo Soñador',
    album: 'Antología De 20 Aniversario',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273103311b7c4c2c73922d393f1',
    durationMs: 216950,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_7catwNsmz9tHX68C1SOfcj',
    spotifyId: '7catwNsmz9tHX68C1SOfcj',
    ytmId: 'O6b2KX0FOSo',
    title: 'Me Quedo',
    artist: 'Daddy Yankee',
    album: 'Los Homerun-es',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273b7b93e3343f9e4b2d91c2204',
    durationMs: 72013,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'spotify_7qiZfU4dY1lWllzX7mPBI3',
    spotifyId: '7qiZfU4dY1lWllzX7mPBI3',
    ytmId: 'JGwWNGJdvx8',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    album: '÷ (Deluxe)',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96',
    durationMs: 233712,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
];

const SPOTIFY_ARTWORK_MAP: Record<string, string> = {
  '0VjIjW4GlUZAMYd2vXMi3b': 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
  '11mDIi9MNeOXoeSqiYQnWI': 'https://i.scdn.co/image/ab67616d0000b273e642500777950f8f396f47b5',
  '1ipcb9qXpSHWhSUvdxJhsx': 'https://i.scdn.co/image/ab67616d0000b273723376f081b369b02795a7fb',
  '2Jko3yQgktaKnFcmyLv3g7': 'https://i.scdn.co/image/ab67616d0000b27385022daef38da8c9a7f81ac6',
  '2XRqhe4lmCQVaUWawR5wRo': 'https://i.scdn.co/image/ab67616d0000b273a908ed6eeeb286b8775a1724',
  '36SJ7ZFx8J1f1RsewmUwMX': 'https://i.scdn.co/image/ab67616d0000b273b415fc6505fe00219d017df4',
  '3h5T5JypYU7huFiVYhv1dr': 'https://i.scdn.co/image/ab67616d0000b27321deb742375f88edfb2e7368',
  '3KkXRkHbMCARz0aVfEt68P': 'https://i.scdn.co/image/ab67616d0000b273e2e352d89826aef6dbd5ff8f',
  '4Dvkj6JhhA12EX05fT7y2e': 'https://i.scdn.co/image/ab67616d0000b27382ce362511fb3d9dda6578ee',
  '5tRNzcUvgWGtuOozOR7skP': 'https://i.scdn.co/image/ab67616d0000b273103311b7c4c2c73922d393f1',
  '7catwNsmz9tHX68C1SOfcj': 'https://i.scdn.co/image/ab67616d0000b273b7b93e3343f9e4b2d91c2204',
  '7qiZfU4dY1lWllzX7mPBI3': 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96',
};

export function resolveTrackArtwork(item: { artworkUrl?: string | null; ytmId?: string | null; spotifyId?: string | null }): string {
  if (item.spotifyId) {
    const cleanId = item.spotifyId.replace(/^spotify:track:/i, '').replace(/^spotify_/i, '');
    if (SPOTIFY_ARTWORK_MAP[cleanId]) {
      return SPOTIFY_ARTWORK_MAP[cleanId];
    }
  }
  if (item.artworkUrl && !item.artworkUrl.includes('unsplash.com') && !item.artworkUrl.includes('ytimg.com')) {
    return item.artworkUrl;
  }
  return 'https://i.scdn.co/image/ab67616d0000b273b06cf595709fa22a46c3b6ce';
}


let clientCredentialsToken: { token: string; expiresAt: number } | null = null;

async function getDirectSpotifyToken(): Promise<string | null> {
  const now = Date.now();
  if (clientCredentialsToken && clientCredentialsToken.expiresAt > now + 30000) {
    return clientCredentialsToken.token;
  }

  try {
    const creds = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
    const body = new URLSearchParams({ grant_type: 'client_credentials' });

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${creds}`,
      },
      body: body.toString(),
    });

    if (!res.ok) return null;
    const data = await res.json();
    clientCredentialsToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in || 3600) * 1000,
    };
    return clientCredentialsToken.token;
  } catch {
    return null;
  }
}

export async function searchSongs(
  query: string,
  apiBaseUrl: string = getApiBaseUrl()
): Promise<UnifiedSongItem[]> {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) {
    return VERIFIED_FEATURED_TRACKS;
  }

  // 1. Search verified local catalog first
  const localMatches = VERIFIED_FEATURED_TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(cleanQ) ||
      t.artist.toLowerCase().includes(cleanQ) ||
      t.album.toLowerCase().includes(cleanQ)
  );

  // 2. Query API worker or direct Spotify Web API
  let remoteResults: UnifiedSongItem[] = [];

  try {
    // Attempt via API worker
    const workerRes = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/v1/spotify/search?q=${encodeURIComponent(cleanQ)}&limit=15`);
    if (workerRes.ok) {
      const data = await workerRes.json();
      remoteResults = (data.tracks || []).map((t: any) => ({
        id: `spotify_${t.id}`,
        spotifyId: t.id,
        ytmId: null,
        title: t.title,
        artist: t.artist,
        album: t.album,
        artworkUrl: resolveTrackArtwork({
          artworkUrl: t.artworkUrl,
          ytmId: t.ytmId,
          spotifyId: t.id,
        }),
        durationMs: t.durationMs,
        previewUrl: t.previewUrl,
        source: 'spotify',
        isSyllableSynced: false,
        contributor: 'Community',
      }));
    }
  } catch {
    // If worker is not reachable, attempt direct Spotify API query
    try {
      const token = await getDirectSpotifyToken();
      if (token) {
        const spotRes = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(cleanQ)}&type=track&limit=15`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (spotRes.ok) {
          const sData = await spotRes.json();
          remoteResults = (sData.tracks?.items || []).map((t: any) => ({
            id: `spotify_${t.id}`,
            spotifyId: t.id,
            ytmId: null,
            title: t.name,
            artist: t.artists.map((a: any) => a.name).join(', '),
            album: t.album?.name || '',
            artworkUrl: resolveTrackArtwork({
              artworkUrl: t.album?.images?.[0]?.url,
              spotifyId: t.id,
            }),
            durationMs: t.duration_ms,
            previewUrl: t.preview_url,
            source: 'spotify',
            isSyllableSynced: false,
            contributor: 'Community',
          }));
        }
      }
    } catch {
      // Fallback
    }
  }

  // 3. Fallback to LRCLIB search if remote returned nothing
  if (remoteResults.length === 0 && localMatches.length === 0) {
    try {
      const lrclibRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanQ)}`, {
        headers: { 'User-Agent': 'Brus-Lyrics/1.0' },
      });
      if (lrclibRes.ok) {
        const lrclibData = (await lrclibRes.json()) as any[];
        remoteResults = (lrclibData || []).slice(0, 10).map((l: any) => ({
          id: `lrclib_${l.id}`,
          spotifyId: null,
          ytmId: null,
          title: l.trackName || l.name,
          artist: l.artistName,
          album: l.albumName || '',
          artworkUrl: resolveTrackArtwork({
            artworkUrl: null,
            spotifyId: null,
          }),
          durationMs: (l.duration || 180) * 1000,
          previewUrl: null,
          source: 'lrclib',
          isSyllableSynced: false,
          contributor: 'LRCLIB',
        }));
      }
    } catch {
      // Fallback
    }
  }

  // Deduplicate and prioritize local verified tracks
  const seenIds = new Set<string>();
  const combined: UnifiedSongItem[] = [];

  for (const song of localMatches) {
    const key = `${song.title.toLowerCase()}::${song.artist.toLowerCase()}`;
    seenIds.add(key);
    combined.push(song);
  }

  for (const song of remoteResults) {
    const key = `${song.title.toLowerCase()}::${song.artist.toLowerCase()}`;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      combined.push(song);
    }
  }

  return combined;
}

/**
 * Dynamically resolves a high-quality playable audio preview URL from iTunes API
 * if Spotify preview_url is not present.
 */
export async function resolveTrackPreviewUrl(title: string, artist: string): Promise<string | null> {
  try {
    const q = `${artist} ${title}`.trim();
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results[0] && data.results[0].previewUrl) {
        return data.results[0].previewUrl;
      }
    }
  } catch {
    // Ignore and fallback
  }
  return null;
}

