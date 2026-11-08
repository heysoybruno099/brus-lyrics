import React from 'react';
import type { UnifiedSongItem } from '../lib/types.js';

interface SongCardGridProps {
  songs: UnifiedSongItem[];
  currentTrackId?: string | null;
  isPlaying: boolean;
  onSelectAndPlay: (song: UnifiedSongItem) => void;
  onOpenStudio?: (song: UnifiedSongItem) => void;
  isLoading: boolean;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export const SongCardGrid: React.FC<SongCardGridProps> = ({
  songs,
  currentTrackId,
  isPlaying,
  onSelectAndPlay,
  onOpenStudio,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="card-grid-state">
        <div className="spinner-ring" />
        <span>Searching catalog and Spotify archives...</span>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="card-grid-state">
        <span className="empty-title">No songs found matching your search.</span>
        <span className="empty-sub">Try searching by artist name, track title, or browse the verified list.</span>
      </div>
    );
  }

  return (
    <div className="song-cards-container">
      <div className="section-header-row">
        <h2 className="section-title">Available Songs</h2>
        <span className="section-subtitle">Click any card to play and display synced lyrics</span>
      </div>

      <div className="song-cards-grid">
        {songs.map((song) => {
          const isCurrent = currentTrackId === song.id || currentTrackId === song.spotifyId;
          const isCurrentlyPlaying = isCurrent && isPlaying;

          return (
            <article
              key={song.id}
              className={`song-card ${isCurrent ? 'is-active-card' : ''}`}
              onClick={() => onSelectAndPlay(song)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectAndPlay(song);
                }
              }}
            >
              {/* Artwork Container */}
              <div className="card-artwork-wrap">
                <img
                  src={song.artworkUrl}
                  alt={song.title}
                  className="card-artwork-img"
                  loading="lazy"
                />
                <div className={`card-play-overlay ${isCurrentlyPlaying ? 'playing' : ''}`}>
                  <button
                    type="button"
                    className="card-play-btn"
                    aria-label={`Play ${song.title}`}
                  >
                    {isCurrentlyPlaying ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Card Meta */}
              <div className="card-meta">
                <div className="card-meta-top">
                  <h3 className="card-title" title={song.title}>
                    {song.title}
                  </h3>
                  <p className="card-artist" title={song.artist}>
                    {song.artist}
                  </p>
                </div>

                <div className="card-external-links" style={{ display: 'flex', gap: 6, margin: '6px 0', flexWrap: 'wrap' }}>
                  {song.spotifyId && (
                    <a
                      href={`https://open.spotify.com/track/${song.spotifyId.replace(/^spotify:track:/i, '').replace(/^spotify_/i, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card-ext-link"
                      onClick={(e) => e.stopPropagation()}
                      title="Open in Spotify"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 10,
                        padding: '3px 7px',
                        borderRadius: 4,
                        backgroundColor: '#1db95420',
                        color: '#1db954',
                        border: '1px solid #1db95440',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.495 17.306c-.216.353-.674.466-1.027.25-2.812-1.718-6.35-2.107-10.518-1.155-.403.093-.805-.158-.898-.561-.093-.404.158-.805.561-.898 4.562-1.042 8.475-.597 11.632 1.337.353.216.466.674.25 1.027zm1.467-3.262c-.272.441-.849.58-1.29.308-3.219-1.978-8.125-2.55-11.932-1.393-.497.151-1.024-.134-1.175-.631-.151-.497.134-1.024.631-1.175 4.354-1.321 9.771-.681 13.458 1.584.441.272.58.849.308 1.307zm.126-3.41c-3.86-2.292-10.222-2.503-13.886-1.391-.592.179-1.22-.162-1.399-.754-.179-.592.162-1.22.754-1.399 4.225-1.282 11.246-1.036 15.688 1.6c.531.315.704 1.004.389 1.535-.315.531-1.004.704-1.546.409z" />
                      </svg>
                      <span>Spotify</span>
                    </a>
                  )}

                  {song.ytmId && (
                    <a
                      href={`https://music.youtube.com/watch?v=${song.ytmId.replace(/^ytm_/i, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card-ext-link"
                      onClick={(e) => e.stopPropagation()}
                      title="Open in YouTube Music (Free Full Track)"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 10,
                        padding: '3px 7px',
                        borderRadius: 4,
                        backgroundColor: '#ff000020',
                        color: '#f87171',
                        border: '1px solid #ff000040',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      <span>YouTube Music</span>
                    </a>
                  )}
                </div>

                <div className="card-footer-row">
                  <span className="card-duration">{formatDuration(song.durationMs)}</span>
                  {song.isSyllableSynced ? (
                    <span className="card-badge-syllable">TTML SYLLABLE</span>
                  ) : song.source === 'verified' ? (
                    <span className="card-badge-standard" style={{ color: '#4ade80', borderColor: '#22c55e' }}>
                      VERIFIED
                    </span>
                  ) : song.ytmId ? (
                    <span className="card-badge-standard" style={{ color: '#60a5fa', borderColor: '#3b82f6' }}>
                      YTM AUDIO
                    </span>
                  ) : (
                    <span className="card-badge-standard">{song.source.toUpperCase()}</span>
                  )}
                </div>

                {!song.isSyllableSynced && song.source !== 'verified' && (
                  <button
                    type="button"
                    className="btn-add-lyrics"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenStudio?.(song);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      width: '100%',
                      marginTop: 10,
                      padding: '7px 12px',
                      backgroundColor: '#ffffff',
                      color: '#09090b',
                      border: '1px solid #ffffff',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                    }}
                    title="Add verified lyrics in Sync Studio"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add it</span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
