-- Bru's Lyrics D1 SQLite Schema
-- Indexes song metadata and verified TTML storage references

CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    spotify_id TEXT UNIQUE,
    ytm_id TEXT UNIQUE,
    isrc TEXT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    title_norm TEXT NOT NULL,
    artist_norm TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    contributor TEXT NOT NULL DEFAULT 'community',
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_songs_spotify_id ON songs(spotify_id);
CREATE INDEX IF NOT EXISTS idx_songs_ytm_id ON songs(ytm_id);
CREATE INDEX IF NOT EXISTS idx_songs_norm ON songs(title_norm, artist_norm);
CREATE INDEX IF NOT EXISTS idx_songs_duration ON songs(duration_ms);

CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    spotify_id TEXT,
    ytm_id TEXT,
    isrc TEXT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    contributor TEXT NOT NULL,
    ttml_raw TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
