-- Migration 0003: Add is_verified column to songs table
-- Supports instant verification state persistence in Cloudflare D1

ALTER TABLE songs ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_songs_verified ON songs(is_verified);

-- Backfill verified songs in catalog
UPDATE songs SET is_verified = 1 WHERE contributor = 'Verified Catalog' OR contributor = 'Bru' OR contributor = 'CommunityDrop';
