import React, { useState } from 'react';

interface HeroIntroProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
  totalTracksCount: number;
}

export const HeroIntro: React.FC<HeroIntroProps> = ({
  onSearch,
  isSearching,
  totalTracksCount,
}) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchValue);
  };

  const handleClear = () => {
    setSearchValue('');
    onSearch('');
  };

  return (
    <section className="hero-intro-section">
      <div className="hero-content">
        {/* Intro Badge */}
        <div className="hero-pill-badge">
          <span className="hero-pill-dot" />
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

        {/* Search Bar */}
        <form className="hero-search-form" onSubmit={handleSubmit}>
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
                if (e.target.value === '') {
                  onSearch('');
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
        </form>

        {/* Stats Strip */}
        <div className="hero-stats-row">
          <div className="hero-stat-item">
            <span className="stat-label">Active Catalog:</span>
            <span className="stat-value">{totalTracksCount} Verified Songs</span>
          </div>
          <div className="hero-stat-sep">/</div>
          <div className="hero-stat-item">
            <span className="stat-label">Playback:</span>
            <span className="stat-value">In-Browser Player</span>
          </div>
          <div className="hero-stat-sep">/</div>
          <div className="hero-stat-item">
            <span className="stat-label">Contributors:</span>
            <span className="stat-value">Discord OAuth Verified</span>
          </div>
        </div>
      </div>
    </section>
  );
};
