import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { UnifiedSongItem } from '../lib/types.js';
import { LogoIcon } from './LogoIcon.js';
import { VerifiedSticker } from './VerifiedSticker.js';

interface HeroIntroProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
  totalTracksCount: number;
  catalogSongs?: UnifiedSongItem[];
  onQuickPlay?: (song: UnifiedSongItem) => void;
  onQuickAdd?: (song: UnifiedSongItem) => void;
  onOpenSongPage?: (song: UnifiedSongItem) => void;
}

export const HeroIntro: React.FC<HeroIntroProps> = ({
  onSearch,
  isSearching,
  totalTracksCount,
  catalogSongs = [],
  onQuickPlay,
  onQuickAdd,
  onOpenSongPage,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  const topMatch = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q || !catalogSongs || catalogSongs.length === 0) return null;

    const matches = catalogSongs.filter((s) => {
      const t = s.title.toLowerCase();
      const a = s.artist.toLowerCase();
      const alb = (s.album || '').toLowerCase();
      return t.includes(q) || a.includes(q) || alb.includes(q);
    });

    if (matches.length === 0) return null;

    matches.sort((a, b) => {
      const aTitleStart = a.title.toLowerCase().startsWith(q) ? 1 : 0;
      const bTitleStart = b.title.toLowerCase().startsWith(q) ? 1 : 0;
      if (aTitleStart !== bTitleStart) return bTitleStart - aTitleStart;

      const aArtistStart = a.artist.toLowerCase().startsWith(q) ? 1 : 0;
      const bArtistStart = b.artist.toLowerCase().startsWith(q) ? 1 : 0;
      if (aArtistStart !== bArtistStart) return bArtistStart - aArtistStart;

      return 0;
    });

    return matches[0] || null;
  }, [searchValue, catalogSongs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDropdownOpen(false);
    onSearch(searchValue);
  };

  const handleClear = () => {
    setSearchValue('');
    setIsDropdownOpen(false);
    onSearch('');
  };

  return (
    <section className="hero-intro-section">
      <div className="hero-content">
        {/* Intro Badge with Logo */}
        <div className="hero-pill-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <LogoIcon size={16} color="#4ade80" />
          <span>Apple Music Grade TTML Engine</span>
        </div>

        {/* Main Title */}
        <h1 className="hero-title">
          Live Lyrics. <span className="hero-title-accent">Precision Sync.</span>
        </h1>

        {/* Description */}
        <p className="hero-subtitle">
          Precision syllable-level animated lyrics with sub-millisecond spring scroll. Search any track across Spotify, the verified catalog, and community archives. Click any song card to play in-browser with live pop-up lyrics.
        </p>

        {/* Search Bar with Dynamic Autocomplete */}
        <form ref={formRef} className="hero-search-form" onSubmit={handleSubmit} style={{ position: 'relative' }}>
          <div className="search-input-wrapper">
            <svg
              className="search-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            <input
              type="text"
              className="search-input"
              placeholder="Search by track name, artist, or album (e.g. Ella Baila Sola, The Weeknd)..."
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setIsDropdownOpen(true);
                if (e.target.value === '') {
                  onSearch('');
                }
              }}
              onFocus={() => {
                if (searchValue.trim().length > 0) setIsDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsDropdownOpen(false);
                }
              }}
            />

            {searchValue && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={handleClear}
                title="Clear search"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z" />
                </svg>
              </button>
            )}

            <button
              type="submit"
              className="search-submit-btn"
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Dynamic Search Autocomplete Suggestion Dropdown */}
          {topMatch && isDropdownOpen && (
            <div
              className="search-autocomplete-dropdown"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 8,
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                borderRadius: 8,
                padding: '10px 14px',
                zIndex: 50,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flex: 1,
                  minWidth: 0,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (onQuickPlay) onQuickPlay(topMatch);
                  setIsDropdownOpen(false);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (onQuickPlay) onQuickPlay(topMatch);
                  if (onOpenSongPage) onOpenSongPage(topMatch);
                  setIsDropdownOpen(false);
                }}
                title={`Play ${topMatch.title} (Double-click to open song page)`}
              >
                <img
                  src={topMatch.artworkUrl}
                  alt={topMatch.title}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 6,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: '#f4f4f6',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {topMatch.title}
                    </span>
                    {topMatch.isSyllableSynced || topMatch.source === 'verified' ? (
                      <VerifiedSticker
                        size="sm"
                        tier={
                          topMatch.contributor &&
                          (topMatch.contributor.toLowerCase() === 'heysoybruno09' ||
                            topMatch.contributor.toLowerCase() === 'heysoybruno099' ||
                            topMatch.contributor.toLowerCase() === 'bru')
                            ? 'admin'
                            : 'contributor'
                        }
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 3,
                          backgroundColor: '#3f2c00',
                          color: '#fbbf24',
                        }}
                      >
                        NO LYRICS
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#a1a1aa',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {topMatch.artist}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {onQuickPlay && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickPlay(topMatch);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 12px',
                      backgroundColor: '#27272a',
                      color: '#f4f4f6',
                      border: '1px solid #3f3f46',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Play</span>
                  </button>
                )}

                {onQuickAdd && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAdd(topMatch);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 12px',
                      backgroundColor: '#ffffff',
                      color: '#09090b',
                      border: '1px solid #ffffff',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add it</span>
                  </button>
                )}

                {onOpenSongPage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSongPage(topMatch);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 12px',
                      backgroundColor: '#09090b',
                      color: '#38bdf8',
                      border: '1px solid #0284c7',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span>Song Page</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Stats Strip */}
        <div className="hero-stats-row">
          <div className="hero-stat-item">
            <span className="stat-label">Active Catalog:</span>
            <span className="stat-value">{totalTracksCount} Verified Songs</span>
          </div>
        </div>

      </div>
    </section>
  );
};
