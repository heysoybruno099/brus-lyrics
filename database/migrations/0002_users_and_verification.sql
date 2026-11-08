-- Migration 0002: Contributor Profiles, Usernames, and Verification Status
-- Compact schema with indexed lookup and minimal footprint

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    discriminator TEXT DEFAULT '0',
    avatar TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'contributor',
    is_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified);

-- Seed default verified creator
INSERT OR IGNORE INTO users (id, username, discriminator, avatar, email, role, is_verified, created_at, updated_at)
VALUES ('1568826229006540882', 'Bru', '0', NULL, 'bruno@bruslyrics.com', 'verified_creator', 1, '2026-11-08T00:00:00.000Z', '2026-11-08T00:00:00.000Z');
