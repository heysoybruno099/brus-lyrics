import React, { useEffect, useRef } from 'react';
import type { TTMLDocument } from '@brus-lyrics/shared-types';
import type { UnifiedSongItem } from '../lib/types.js';

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
            </div>
          </div>

          <div className="lyrics-header-actions">
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
