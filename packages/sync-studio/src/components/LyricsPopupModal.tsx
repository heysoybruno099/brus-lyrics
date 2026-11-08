import React, { useEffect, useRef } from 'react';
import type { TTMLDocument } from '@brus-lyrics/shared-types';
import type { UnifiedSongItem } from '../lib/types.js';
import { LogoIcon } from './LogoIcon.js';

interface LyricsPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: UnifiedSongItem | null;
  document: TTMLDocument | null;
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (targetMs: number) => void;
  isLoadingLyrics: boolean;
  currentPlaybackSource?: 'spotify' | 'youtube' | 'preview';
  isSpotifyPremium?: boolean;
  onConnectSpotify?: () => void;
  onOpenStudio?: (song: UnifiedSongItem) => void;
}

export const LyricsPopupModal: React.FC<LyricsPopupModalProps> = ({
  isOpen,
  onClose,
  song,
  document,
  currentTimeMs,
  durationMs,
  isPlaying,
  onTogglePlay,
  onSeek,
  isLoadingLyrics,
  currentPlaybackSource = 'preview',
  isSpotifyPremium = false,
  onConnectSpotify,
  onOpenStudio,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current active line
  useEffect(() => {
    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTimeMs]);

  if (!isOpen || !song) return null;

  const lines = document?.lines || [];
  const contributor = document?.metadata?.contributor || song.contributor || 'Community';
  const cleanSpotifyId = song.spotifyId ? song.spotifyId.replace(/^spotify:track:/i, '').replace(/^spotify_/i, '') : null;
  const cleanYtmId = song.ytmId ? song.ytmId.replace(/^ytm_/i, '') : null;

  return (
    <div className="lyrics-popup-overlay" role="dialog" aria-modal="true">
      {/* Blurred Ambient Backdrop */}
      <div
        className="lyrics-popup-ambient"
        style={{
          backgroundImage: `url(${song.artworkUrl})`,
        }}
      />

      <div className="lyrics-popup-card">
        {/* Top Header */}
        <div className="lyrics-popup-header">
          <div className="lyrics-header-meta">
            <img src={song.artworkUrl} alt={song.title} className="lyrics-header-thumb" />
            <div className="lyrics-header-text">
              <h3 className="lyrics-header-title">{song.title}</h3>
              <p className="lyrics-header-artist">{song.artist}</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {cleanSpotifyId && (
                  <a
                    href={`https://open.spotify.com/track/${cleanSpotifyId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in Spotify"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: '#1db95420',
                      color: '#1db954',
                      border: '1px solid #1db95440',
                      fontSize: 10,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Open in Spotify
                  </a>
                )}
                {cleanYtmId && (
                  <a
                    href={`https://music.youtube.com/watch?v=${cleanYtmId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in YouTube Music"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: '#ff000020',
                      color: '#f87171',
                      border: '1px solid #ff000040',
                      fontSize: 10,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Open in YouTube Music
                  </a>
                )}
                {onOpenStudio && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenStudio(song);
                    }}
                    title="Open sync workstation to add lyrics"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: '#ffffff',
                      color: '#09090b',
                      border: '1px solid #ffffff',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Add Lyrics
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lyrics-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 4,
                backgroundColor: '#18181f',
                border: '1px solid #2e2e38',
              }}
            >
              <LogoIcon size={14} color="#ffffff" />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#e4e4e7' }}>Lyrics</span>
            </div>

            <button
              type="button"
              className="lyrics-ctrl-btn"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            <button
              type="button"
              className="lyrics-close-btn"
              onClick={onClose}
              title="Close Lyrics View"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Informative Banner in Lyric Modal */}
        {currentPlaybackSource === 'preview' && (
          <div
            style={{
              backgroundColor: '#1c1917',
              borderBottom: '1px solid #292524',
              padding: '6px 16px',
              fontSize: 11,
              color: '#fbbf24',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>30-Second Preview Mode. Connect Spotify Premium to unlock full-length playback.</span>
            {onConnectSpotify && (
              <button
                type="button"
                onClick={onConnectSpotify}
                style={{
                  background: '#1db954',
                  color: '#000000',
                  border: 'none',
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Connect Spotify
              </button>
            )}
          </div>
        )}

        {currentPlaybackSource === 'youtube' && (
          <div
            style={{
              backgroundColor: '#111827',
              borderBottom: '1px solid #1f2937',
              padding: '6px 16px',
              fontSize: 11,
              color: '#60a5fa',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Free Full Song Playback via YouTube Music</span>
            {cleanYtmId && (
              <a
                href={`https://music.youtube.com/watch?v=${cleanYtmId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#93c5fd', textDecoration: 'underline', fontSize: 11 }}
              >
                Open in YouTube Music
              </a>
            )}
          </div>
        )}

        {/* Lyrics Scrollable Body */}
        <div className="lyrics-popup-body" ref={scrollContainerRef}>
          {isLoadingLyrics ? (
            <div className="lyrics-status-center">
              <div className="spinner-ring" />
              <span>Fetching syllable-accurate lyrics...</span>
            </div>
          ) : lines.length === 0 ? (
            <div className="lyrics-status-center">
              <span className="lyrics-empty-notice">No synchronized lyrics available for this song yet.</span>
              <span className="lyrics-empty-help">Sign in with Discord to be the first to sync it in the studio.</span>
              {onOpenStudio && (
                <button
                  type="button"
                  className="btn-add-lyrics"
                  onClick={() => {
                    onClose();
                    onOpenStudio(song);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    border: '1px solid #ffffff',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: 14,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Add Lyrics in Studio</span>
                </button>
              )}
            </div>
          ) : (
            <div className="lyrics-stream-wrapper">
              {lines.map((line, lineIndex) => {
                const isLineActive = currentTimeMs >= line.begin && currentTimeMs <= line.end;
                const isLinePassed = currentTimeMs > line.end;
                const isLineFuture = currentTimeMs < line.begin;

                let lineClass = 'popup-lyric-line';
                if (isLineActive) lineClass += ' is-active';
                else if (isLinePassed) lineClass += ' is-passed';
                else if (isLineFuture) lineClass += ' is-future';

                return (
                  <div
                    key={line.id || `line_${lineIndex}`}
                    ref={isLineActive ? activeLineRef : null}
                    className={lineClass}
                    data-agent={line.agent || 'v1'}
                    onClick={() => onSeek(line.begin)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="popup-line-content">
                      {line.syllables && line.syllables.length > 0 ? (
                        line.syllables.map((syl, sylIdx) => {
                          const isSylActive = currentTimeMs >= syl.begin && currentTimeMs <= syl.end;
                          const isSylPassed = currentTimeMs > syl.end;
                          const sylProgress = isSylPassed
                            ? 1
                            : isSylActive && syl.end > syl.begin
                            ? Math.min(1, Math.max(0, (currentTimeMs - syl.begin) / (syl.end - syl.begin)))
                            : 0;

                          return (
                            <span
                              key={`syl_${lineIndex}_${sylIdx}`}
                              className={`popup-syllable ${isSylActive ? 'syl-active' : ''} ${
                                isSylPassed ? 'syl-passed' : ''
                              }`}
                              style={{
                                '--syl-progress': sylProgress,
                              } as React.CSSProperties}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSeek(syl.begin);
                              }}
                            >
                              <span className="popup-syllable-fill">{syl.text}</span>
                            </span>
                          );
                        })
                      ) : (
                        <span className="popup-fallback-text">{line.text}</span>
                      )}

                      {/* Secondary Background Vocals Rendering */}
                      {line.backgroundVocals && line.backgroundVocals.length > 0 && (
                        <div
                          className="popup-bg-vocals"
                          style={{
                            fontSize: '0.85em',
                            opacity: 0.72,
                            marginTop: 4,
                            fontStyle: 'italic',
                          }}
                        >
                          {line.backgroundVocals.map((bgLine, bgIdx) => (
                            <span
                              key={`bg_${lineIndex}_${bgIdx}`}
                              className="popup-bg-line"
                              style={{ display: 'inline-flex', gap: 2, marginRight: 8 }}
                            >
                              <span style={{ color: '#a1a1aa' }}>(</span>
                              {bgLine.syllables.map((syl, sylIdx) => {
                                const isSylActive = currentTimeMs >= syl.begin && currentTimeMs <= syl.end;
                                const isSylPassed = currentTimeMs > syl.end;
                                const sylProgress = isSylPassed
                                  ? 1
                                  : isSylActive && syl.end > syl.begin
                                  ? Math.min(1, Math.max(0, (currentTimeMs - syl.begin) / (syl.end - syl.begin)))
                                  : 0;

                                return (
                                  <span
                                    key={`bg_syl_${lineIndex}_${bgIdx}_${sylIdx}`}
                                    className={`popup-syllable popup-bg-syllable ${isSylActive ? 'syl-active' : ''} ${
                                      isSylPassed ? 'syl-passed' : ''
                                    }`}
                                    style={{
                                      '--syl-progress': sylProgress,
                                    } as React.CSSProperties}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSeek(syl.begin);
                                    }}
                                  >
                                    <span className="popup-syllable-fill">{syl.text}</span>
                                  </span>
                                );
                              })}
                              <span style={{ color: '#a1a1aa' }}>)</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Contributor Attribution prominently at bottom */}
              <div className="popup-attribution-footer">
                <div className="popup-attribution-card">
                  <span className="attribution-lead">Synced by</span>
                  <span className="attribution-username">@{contributor}</span>
                  <span className="attribution-badge" title="Verified Creator">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                    </svg>
                    VERIFIED
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LyricsPopupModal;
