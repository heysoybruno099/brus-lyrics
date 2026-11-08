import React from 'react';
import type { UnifiedSongItem } from '../lib/types.js';

interface SongCardGridProps {
  songs: UnifiedSongItem[];
  currentTrackId?: string | null;
  isPlaying: boolean;
  onSelectAndPlay: (song: UnifiedSongItem) => void;
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

                <div className="card-footer-row">
                  <span className="card-duration">{formatDuration(song.durationMs)}</span>
                  {song.isSyllableSynced ? (
                    <span className="card-badge-syllable">TTML SYLLABLE</span>
                  ) : (
                    <span className="card-badge-standard">{song.source.toUpperCase()}</span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
