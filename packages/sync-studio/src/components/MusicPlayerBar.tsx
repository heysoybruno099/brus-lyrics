import React from 'react';
import type { UnifiedSongItem } from '../lib/types.js';

interface MusicPlayerBarProps {
  song: UnifiedSongItem | null;
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (targetMs: number) => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
  onToggleLyricsPopup: () => void;
  isLyricsPopupOpen: boolean;
}

function formatTime(ms: number): string {
  if (!ms || ms < 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export const MusicPlayerBar: React.FC<MusicPlayerBarProps> = ({
  song,
  currentTimeMs,
  durationMs,
  isPlaying,
  onTogglePlay,
  onSeek,
  volume,
  onChangeVolume,
  playbackRate,
  onChangePlaybackRate,
  onToggleLyricsPopup,
  isLyricsPopupOpen,
}) => {
  if (!song) return null;

  const progress = durationMs > 0 ? Math.min(1, Math.max(0, currentTimeMs / durationMs)) : 0;

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onSeek(Math.round(val * durationMs));
  };

  const handleSkip = (deltaMs: number) => {
    onSeek(Math.max(0, Math.min(currentTimeMs + deltaMs, durationMs)));
  };

  return (
    <footer className="player-bar-container">
      {/* Top Scrubber Progress Bar */}
      <div className="player-scrubber-wrap">
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={progress}
          onChange={handleScrubberChange}
          className="player-scrubber-slider"
          aria-label="Seek track"
        />
        <div
          className="player-scrubber-filled"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="player-bar-inner">
        {/* Left Track Info */}
        <div className="player-track-info" onClick={onToggleLyricsPopup} role="button" tabIndex={0}>
          <img
            src={song.artworkUrl}
            alt={song.title}
            className="player-thumb"
          />
          <div className="player-text">
            <span className="player-title" title={song.title}>
              {song.title}
            </span>
            <span className="player-artist" title={song.artist}>
              {song.artist}
            </span>
          </div>
          <span className="player-source-tag">
            {song.source === 'verified' ? 'VERIFIED' : song.source.toUpperCase()}
          </span>
        </div>

        {/* Center Controls */}
        <div className="player-controls-center">
          <div className="player-buttons-row">
            {/* -5s button */}
            <button
              type="button"
              className="player-btn-secondary"
              onClick={() => handleSkip(-5000)}
              title="Rewind 5s"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
              <span>5s</span>
            </button>

            {/* Play/Pause */}
            <button
              type="button"
              className="player-btn-play"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
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

            {/* +5s button */}
            <button
              type="button"
              className="player-btn-secondary"
              onClick={() => handleSkip(5000)}
              title="Forward 5s"
            >
              <span>5s</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="13 17 18 12 13 7" />
                <polyline points="6 17 11 12 6 7" />
              </svg>
            </button>
          </div>

          {/* Time Display */}
          <div className="player-timestamps">
            <span>{formatTime(currentTimeMs)}</span>
            <span className="timestamp-sep">/</span>
            <span>{formatTime(durationMs)}</span>
          </div>
        </div>

        {/* Right Tools: Volume, Rate, and Lyrics Toggle */}
        <div className="player-tools-right">
          {/* Rate Selector */}
          <select
            className="player-select-rate"
            value={playbackRate}
            onChange={(e) => onChangePlaybackRate(parseFloat(e.target.value))}
            aria-label="Playback speed"
          >
            <option value="0.75">0.75x</option>
            <option value="1">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
          </select>

          {/* Volume Control */}
          <div className="player-volume-wrap">
            <button
              type="button"
              className="player-vol-icon-btn"
              onClick={() => onChangeVolume(volume > 0 ? 0 : 0.8)}
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              className="player-vol-slider"
              aria-label="Volume slider"
            />
          </div>

          {/* Lyrics Popup Button ("make sure the lyrics pop up") */}
          <button
            type="button"
            className={`btn-lyrics-toggle ${isLyricsPopupOpen ? 'active' : ''}`}
            onClick={onToggleLyricsPopup}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>Lyrics</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
