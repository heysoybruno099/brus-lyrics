import React, { useState } from 'react';
import type { UnifiedSongItem } from '../lib/types.js';
import { normalizeString } from '@brus-lyrics/shared-types';

interface DedicatedArtistViewProps {
  artistName: string;
  songs: UnifiedSongItem[];
  onSelectAndPlaySong: (song: UnifiedSongItem) => void;
  onOpenSongPage: (song: UnifiedSongItem) => void;
  onOpenStudio: (song: UnifiedSongItem) => void;
  onBackToCatalog: () => void;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export const DedicatedArtistView: React.FC<DedicatedArtistViewProps> = ({
  artistName,
  songs,
  onSelectAndPlaySong,
  onOpenSongPage,
  onOpenStudio,
  onBackToCatalog,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  // Filter songs for this artist (matching either primary or featured artist)
  const normArtist = normalizeString(artistName);
  const artistSongs = songs.filter((s) => {
    const sNorm = normalizeString(s.artist);
    return sNorm === normArtist || sNorm.includes(normArtist) || normArtist.includes(sNorm);
  });

  // Unique Artist ID depending on what lyrics they did (ID is derived from the first lyrics created)
  const cleanSlug = normArtist.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const firstSong = artistSongs[0];
  const firstLyricsId = firstSong ? (firstSong.spotifyId || firstSong.id).replace(/^song_/, '').slice(0, 10) : '';
  const artistId = firstLyricsId ? `art_${firstLyricsId}_${cleanSlug || 'artist'}` : `art_${cleanSlug || 'unknown'}`;

  const handleShare = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://brus-lyrics.pages.dev';
    const artistUrl = `${origin}/artist/${encodeURIComponent(cleanSlug)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(artistUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="dedicated-artist-container" style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 20px 80px 20px' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <button
          type="button"
          onClick={onBackToCatalog}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            color: '#a1a1aa',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            padding: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Back to Catalog</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            backgroundColor: '#18181b',
            color: '#f4f4f6',
            border: '1px solid #27272a',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>{copied ? 'Link Copied' : 'Share Artist Link'}</span>
        </button>
      </div>

      {/* Artist Profile Header Card */}
      <div
        style={{
          backgroundColor: '#141418',
          border: '1px solid #27272a',
          borderRadius: 12,
          padding: 28,
          marginBottom: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 4,
              backgroundColor: '#0c4a6e',
              color: '#38bdf8',
              border: '1px solid #0284c740',
            }}
          >
            ARTIST DIRECTORY
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono, monospace)',
              padding: '2px 8px',
              borderRadius: 4,
              backgroundColor: '#09090b',
              color: '#fbbf24',
              border: '1px solid #27272a',
            }}
          >
            Unique ID: {artistId}
          </span>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#f4f4f6', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          {artistName}
        </h1>

        <p style={{ fontSize: 14, color: '#a1a1aa', margin: 0 }}>
          {artistSongs.length} {artistSongs.length === 1 ? 'song' : 'songs'} currently registered with synchronized Apple Music TTML lyrics in the active catalog.
        </p>
      </div>

      {/* Songs Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f4f4f6', margin: 0 }}>
            Catalog Songs by {artistName}
          </h2>
          <span style={{ fontSize: 12, color: '#71717a' }}>
            Double-click or click View Page for dedicated song link
          </span>
        </div>

        {artistSongs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#09090b', borderRadius: 8, border: '1px solid #27272a', color: '#71717a' }}>
            <p style={{ margin: 0, fontSize: 14 }}>No songs in the catalog by {artistName} yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {artistSongs.map((song) => (
              <div
                key={song.id}
                onDoubleClick={() => {
                  onSelectAndPlaySong(song);
                  onOpenSongPage(song);
                }}
                onClick={() => onSelectAndPlaySong(song)}
                style={{
                  backgroundColor: '#141418',
                  border: '1px solid #27272a',
                  borderRadius: 8,
                  padding: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
                className="song-card"
              >
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 6, overflow: 'hidden' }}>
                  <img
                    src={song.artworkUrl}
                    alt={song.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {song.isSyllableSynced && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 3,
                        backgroundColor: '#14532d',
                        color: '#4ade80',
                      }}
                    >
                      SYNCED
                    </span>
                  )}
                </div>

                <div>
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#f4f4f6',
                      margin: '0 0 4px 0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={song.title}
                  >
                    {song.title}
                  </h3>
                  <div style={{ fontSize: 12, color: '#71717a' }}>
                    {formatDuration(song.durationMs)} {song.album ? `• ${song.album}` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAndPlaySong(song);
                    }}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      backgroundColor: '#27272a',
                      color: '#f4f4f6',
                      border: '1px solid #3f3f46',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Play
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSongPage(song);
                    }}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      backgroundColor: '#09090b',
                      color: '#38bdf8',
                      border: '1px solid #0284c7',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    View Page
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DedicatedArtistView;
