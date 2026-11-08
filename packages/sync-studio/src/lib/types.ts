import type { TTMLDocument, TTMLLine, TTMLMetadata } from '@brus-lyrics/shared-types';

export interface UnifiedSongItem {
  id: string;
  spotifyId?: string | null;
  ytmId?: string | null;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  durationMs: number;
  previewUrl?: string | null;
  source: 'verified' | 'spotify' | 'lrclib';
  isSyllableSynced?: boolean;
  contributor?: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator?: string;
  avatar?: string | null;
  email?: string | null;
  isVerified: boolean;
  role: 'creator' | 'verified_creator' | 'admin' | 'contributor';
}

export type AppViewMode = 'discover' | 'studio' | 'legal';
