import React, { useState } from 'react';
import type { TTMLDocument, TTMLLine, TTMLSyllable } from '@brus-lyrics/shared-types';
import type { UnifiedSongItem } from '../lib/types.js';
import { VerifiedSticker } from './VerifiedSticker.js';

interface DedicatedSongViewProps {
  song: UnifiedSongItem;
  document: TTMLDocument | null;
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (timeMs: number) => void;
  isLoadingLyrics: boolean;
  onOpenArtist: (artist: string) => void;
  onOpenContributor: (contributor: string) => void;
  onOpenStudio: (song: UnifiedSongItem) => void;
  onBackToCatalog: () => void;
}

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export const DedicatedSongView: React.FC<DedicatedSongViewProps> = ({
  song,
  document,
  currentTimeMs,
  durationMs,
  isPlaying,
  onTogglePlay,
  onSeek,
  isLoadingLyrics,
  onOpenArtist,
  onOpenContributor,
  onOpenStudio,
  onBackToCatalog,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const cleanSongId = (song.spotifyId || song.id).replace(/^song_/, '').replace(/^spotify:/i, '');
  const connectedLyricsId = song.spotifyId || song.id;
  const lyricsEditId = `edit_${cleanSongId.slice(0, 12)}_v1`;
  const contributor = song.contributor || 'Bru';
  const isContributorAdmin =
    contributor.toLowerCase() === 'heysoybruno09' ||
    contributor.toLowerCase() === 'heysoybruno099' ||
    contributor.toLowerCase() === 'bru';

  const copyToClipboard = (text: string, fieldName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleShare = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://brus-lyrics.pages.dev';
    const songUrl = `${origin}/song/${cleanSongId}`;
    copyToClipboard(songUrl, 'share');
  };

  const activeLineIndex = document?.lines?.findIndex(
    (line: TTMLLine) => currentTimeMs >= line.begin && currentTimeMs <= line.end
  ) ?? -1;

  return (
    <div className="dedicated-song-container" style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 20px 80px 20px' }}>
      {/* Top Navigation Bar */}
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

        <div style={{ display: 'flex', gap: 10 }}>
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
            <span>{copiedField === 'share' ? 'Link Copied' : 'Share Song Link'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenStudio(song)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              backgroundColor: '#ffffff',
              color: '#09090b',
              border: '1px solid #ffffff',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>Edit in Studio</span>
          </button>
        </div>
      </div>

      {/* Song Header Card */}
      <div
        style={{
          display: 'flex',
          gap: 28,
          alignItems: 'flex-start',
          backgroundColor: '#141418',
          border: '1px solid #27272a',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <img
          src={song.artworkUrl}
          alt={song.title}
          style={{
            width: 180,
            height: 180,
            borderRadius: 8,
            objectFit: 'cover',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            border: '1px solid #27272a',
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                backgroundColor: '#14532d',
                color: '#4ade80',
                border: '1px solid #22c55e40',
              }}
            >
              APPLE MUSIC GRADE TTML
            </span>
            {song.isSyllableSynced && (
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
                SYLLABLE SYNCED
              </span>
            )}
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f4f4f6', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            {song.title}
          </h1>

          <div style={{ fontSize: 16, color: '#d4d4d8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>By</span>
            <button
              type="button"
              onClick={() => onOpenArtist(song.artist)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: 16,
                fontWeight: 600,
                color: '#38bdf8',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
              title={`View ${song.artist} dedicated artist page`}
            >
              {song.artist}
            </button>
            {song.album && <span style={{ color: '#71717a' }}>• {song.album}</span>}
          </div>

          {/* Unique Identifiers Strip */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  backgroundColor: '#09090b',
                  border: '1px solid #27272a',
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: '#a1a1aa',
                }}
              >
                <span>Song ID:</span>
                <strong style={{ color: '#f4f4f6' }}>{cleanSongId}</strong>
                <button
                  type="button"
                  onClick={() => copyToClipboard(cleanSongId, 'songId')}
                  style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: 0 }}
                  title="Copy Song ID"
                >
                  {copiedField === 'songId' ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  backgroundColor: '#09090b',
                  border: '1px solid #27272a',
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: '#a1a1aa',
                }}
              >
                <span>Lyrics Edit ID:</span>
                <strong style={{ color: '#fbbf24' }}>{lyricsEditId}</strong>
                <button
                  type="button"
                  onClick={() => copyToClipboard(lyricsEditId, 'editId')}
                  style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: 0 }}
                  title="Copy Lyrics Edit ID"
                >
                  {copiedField === 'editId' ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  backgroundColor: '#09090b',
                  border: '1px solid #27272a',
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: '#a1a1aa',
                }}
              >
                <span>Connected Lyrics ID:</span>
                <strong style={{ color: '#38bdf8' }}>{connectedLyricsId}</strong>
                <button
                  type="button"
                  onClick={() => copyToClipboard(connectedLyricsId, 'lyricsId')}
                  style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: 0 }}
                  title="Copy Connected Lyrics ID"
                >
                  {copiedField === 'lyricsId' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Contributor Attribution Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: '#71717a' }}>Synced by</span>
              <button
                type="button"
                onClick={() => onOpenContributor(contributor)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: 9999,
                  padding: '3px 10px',
                  color: '#f4f4f6',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title={`View ${contributor} profile`}
              >
                <span>@{contributor}</span>
                <VerifiedSticker tier={isContributorAdmin ? 'admin' : 'contributor'} size="sm" />
              </button>
            </div>
          </div>

          {/* Quick Play Control */}
          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              onClick={onTogglePlay}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                backgroundColor: isPlaying ? '#ef4444' : '#22c55e',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isPlaying ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                  <span>Pause Playback</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Play Song in Browser</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Synchronized Lyrics Player Body */}
      <div
        style={{
          backgroundColor: '#09090b',
          border: '1px solid #27272a',
          borderRadius: 12,
          padding: '24px 28px',
          minHeight: 400,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid #18181b', paddingBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f6' }}>
            Synchronized Lyrics (Live Player)
          </div>
          <div style={{ fontSize: 12, color: '#71717a', fontFamily: 'var(--font-mono, monospace)' }}>
            {formatTime(currentTimeMs)} / {formatTime(durationMs || song.durationMs)}
          </div>
        </div>

        {/* Progress Bar scrubber */}
        <div style={{ marginBottom: 24 }}>
          <input
            type="range"
            min={0}
            max={durationMs || song.durationMs || 1000}
            value={currentTimeMs}
            onChange={(e) => onSeek(parseInt(e.target.value, 10))}
            style={{
              width: '100%',
              cursor: 'pointer',
              accentColor: '#38bdf8',
            }}
          />
        </div>

        {/* Lyrics Lines List */}
        {isLoadingLyrics ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#71717a' }}>
            <span>Loading synchronized lyrics...</span>
          </div>
        ) : !document || document.lines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#71717a' }}>
            <p style={{ margin: 0, fontSize: 14 }}>No synchronized lyrics available for this song yet.</p>
            <button
              type="button"
              onClick={() => onOpenStudio(song)}
              style={{
                marginTop: 12,
                padding: '7px 14px',
                backgroundColor: '#ffffff',
                color: '#09090b',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Add Lyrics Now
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 0' }}>
            {document.lines.map((line: TTMLLine, idx: number) => {
              const isActive = idx === activeLineIndex;
              const isPast = currentTimeMs > line.end;

              return (
                <div
                  key={line.id || `line_${idx}`}
                  onClick={() => onSeek(line.begin)}
                  style={{
                    cursor: 'pointer',
                    fontSize: isActive ? 24 : 19,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#ffffff' : isPast ? '#71717a' : '#3f3f46',
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    transformOrigin: 'left center',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    padding: '4px 0',
                    lineHeight: 1.4,
                  }}
                  title={`Jump to ${formatTime(line.begin)}`}
                >
                  {line.syllables && line.syllables.length > 0 ? (
                    line.syllables.map((syl: TTMLSyllable, sIdx: number) => {
                      const sylSung = currentTimeMs >= syl.end;
                      const sylSinging = currentTimeMs >= syl.begin && currentTimeMs < syl.end;

                      return (
                        <span
                          key={`syl_${sIdx}`}
                          style={{
                            color: sylSung || sylSinging ? '#ffffff' : 'inherit',
                            textShadow: sylSinging ? '0 0 12px rgba(255, 255, 255, 0.5)' : 'none',
                          }}
                        >
                          {syl.text}
                        </span>
                      );
                    })
                  ) : (
                    <span>{line.text}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DedicatedSongView;
