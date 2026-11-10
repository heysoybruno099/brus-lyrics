-- Migration 0004: Grant admin role to heysoybruno09 Discord user
INSERT OR REPLACE INTO users (id, username, discriminator, avatar, email, role, is_verified, created_at, updated_at)
VALUES ('708497847753900042', 'heysoybruno09', '0', 'cb459d924a3706f8ce8695793c2124f6', 'heysoybruno09@bruslyrics.com', 'admin', 1, '2026-11-08T00:00:00.000Z', '2026-11-08T00:00:00.000Z');

UPDATE users SET role = 'admin', is_verified = 1 WHERE id = '708497847753900042' OR username = 'heysoybruno09';
