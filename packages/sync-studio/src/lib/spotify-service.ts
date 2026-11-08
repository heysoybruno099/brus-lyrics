import type { UnifiedSongItem } from './types.js';
import { getApiBaseUrl, DEFAULT_PRODUCTION_API } from './config.js';

export const SPOTIFY_CLIENT_ID = '9b91a4fd101942cfb3fafbfad89e5d70';
export const SPOTIFY_CLIENT_SECRET = 'bae08de7546a4ee4b7067e41c787c7b1';

// Verified default catalog tracks with rich metadata and artwork
export const VERIFIED_FEATURED_TRACKS: UnifiedSongItem[] = [
  {
    id: 'song_3qhlB30KknSeipLHZaYeKc',
    spotifyId: '3qhlB30KknSeipLHZaYeKc',
    ytmId: 'lZIAZhbmPvg',
    title: 'Ella Baila Sola',
    artist: 'Eslabon Armado, Peso Pluma',
    album: 'DESVELADO',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273b3780fb944e45c43d92419a4',
    durationMs: 165600,
    previewUrl: null,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'song_0VjIjW4GlUZAMYd2vXMi3b',
    spotifyId: '0VjIjW4GlUZAMYd2vXMi3b',
    ytmId: '4NRXx6U8ABQ',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
    durationMs: 200040,
    previewUrl: null,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'song_4Dvkj6JhhA12EX05fT7y2e',
    spotifyId: '4Dvkj6JhhA12EX05fT7y2e',
    ytmId: 'H5v3kku4y6Q',
    title: 'As It Was',
    artist: 'Harry Styles',
    album: "Harry's House",
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b2732e8f6390059b047514a68285',
    durationMs: 167303,
    previewUrl: null,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'song_4cOdK2wGLETKBW3PvgPWqT',
    spotifyId: '4cOdK2wGLETKBW3PvgPWqT',
    ytmId: null,
    title: 'Yellow',
    artist: 'Coldplay',
    album: 'Parachutes',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b2739164ba810e394f454a856641',
    durationMs: 266773,
    previewUrl: null,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'song_3KkXRkHbMCARz0aVfEt68P',
    spotifyId: '3KkXRkHbMCARz0aVfEt68P',
    ytmId: 'ApXoWvfEYVU',
    title: 'Sunflower',
    artist: 'Post Malone, Swae Lee',
    album: 'Spider-Man: Into the Spider-Verse',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273e2e352d89826aef6dbd5ff8f',
    durationMs: 158040,
    previewUrl: null,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'song_7qiZfU4dY1lWllzX7mPBI3',
    spotifyId: '7qiZfU4dY1lWllzX7mPBI3',
    ytmId: 'JGwWNGJdvx8',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    album: 'Divide',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96',
    durationMs: 233712,
    previewUrl: null,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'song_36SJ7ZFx8J1f1RsewmUwMX',
    spotifyId: '36SJ7ZFx8J1f1RsewmUwMX',
    ytmId: '9tQRhAuJHGE',
    title: 'Magalenha',
    artist: 'Sérgio Mendes',
    album: 'Brasileiro',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b2734138e93892a403b2230a1eb8',
    durationMs: 216933,
    previewUrl: null,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'song_11mDIi9MNeOXoeSqiYQnWI',
    spotifyId: '11mDIi9MNeOXoeSqiYQnWI',
    ytmId: '25tKbsTDRS8',
    title: 'PANTI Y COLALE 2.0',
    artist: 'El Alfa',
    album: 'PANTI Y COLALE 2.0',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b2736181f185efafbe46f884949a',
    durationMs: 279685,
    previewUrl: null,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
  {
    id: 'song_1X4mH8d1n6zU80o6U7M1uX',
    spotifyId: '1X4mH8d1n6zU80o6U7M1uX',
    ytmId: 'd-diB65654A',
    title: 'Entre Golpes y Besos',
    artist: 'Los Dareyes de la Sierra',
    album: 'Con Banda',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273419386e88544ca944d156cb2',
    durationMs: 192000,
    previewUrl: null,
    source: 'verified',
    isSyllableSynced: true,
    contributor: 'Bru',
  },
];

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
        artworkUrl: t.artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
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
            artworkUrl:
              t.album?.images?.[0]?.url ||
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
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
          artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
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
