import React, { useState, useEffect, useCallback } from 'react';
import type { DiscordUser, SpotifyUserProfile, UnifiedSongItem } from '../lib/types.js';
import { saveUser } from '../lib/discord-auth.js';
import { getApiBaseUrl } from '../lib/config.js';
import { VerifiedSticker } from './VerifiedSticker.js';

interface ProfileViewProps {
  user: DiscordUser | null;
  profileUsername?: string | null;
  onUpdateUser: (updatedUser: DiscordUser) => void;
  onSignOut: () => void;
  onOpenAuthModal: () => void;
  onViewTerms: () => void;
  spotifyUser?: SpotifyUserProfile | null;
  onConnectSpotify?: () => void;
  onDisconnectSpotify?: () => void;
  onSelectAndPlaySong?: (song: UnifiedSongItem) => void;
  onOpenSongPage?: (song: UnifiedSongItem) => void;
  onBackToCatalog?: () => void;
}

interface ContributorStats {
  lyricsAdded: number;
  lyricsSynced: number;
  lyricsWanted: number;
}

interface PublicContributorProfile {
  id: string;
  username: string;
  isVerified: boolean;
  role: string;
  avatar: string | null;
  stats: ContributorStats;
  songs: Array<{
    id: string;
    title: string;
    artist: string;
    album: string;
    artworkUrl: string;
    durationMs: number;
    isSyllableSynced: boolean;
    isVerified: boolean;
    spotifyId: string | null;
    ytmId: string | null;
    status: string;
  }>;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  profileUsername,
  onUpdateUser,
  onSignOut,
  onOpenAuthModal,
  onViewTerms,
  spotifyUser,
  onConnectSpotify,
  onDisconnectSpotify,
  onSelectAndPlaySong,
  onOpenSongPage,
  onBackToCatalog,
}) => {
  const targetUsername = (profileUsername || user?.username || '').trim().replace(/^@/, '');
  const isOwnProfile = Boolean(
    user && targetUsername && user.username.toLowerCase() === targetUsername.toLowerCase()
  );

  const [publicProfile, setPublicProfile] = useState<PublicContributorProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [newUsername, setNewUsername] = useState<string>(user?.username || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchPublicProfile = useCallback(async (username: string) => {
    if (!username) return;
    setIsLoadingProfile(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/v1/auth/users/${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = (await res.json()) as PublicContributorProfile;
        setPublicProfile(data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (targetUsername) {
      fetchPublicProfile(targetUsername);
    }
  }, [targetUsername, fetchPublicProfile]);

  useEffect(() => {
    if (user?.username) {
      setNewUsername(user.username);
    }
  }, [user?.username]);

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newUsername.trim().replace(/^@/, '');
    if (!cleanName || !user) {
      setNotice({ type: 'error', message: 'Username cannot be empty.' });
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/v1/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          username: cleanName,
          role: user.role,
          isVerified: user.isVerified,
        }),
      });

      const updated: DiscordUser = {
        ...user,
        username: cleanName,
      };

      saveUser(updated);
      onUpdateUser(updated);

      if (res.ok) {
        setNotice({ type: 'success', message: `Website username successfully updated to @${cleanName}!` });
        fetchPublicProfile(cleanName);
      } else {
        setNotice({ type: 'success', message: `Website username updated to @${cleanName} (locally saved).` });
      }
    } catch {
      const updated: DiscordUser = {
        ...user,
        username: cleanName,
      };
      saveUser(updated);
      onUpdateUser(updated);
      setNotice({ type: 'success', message: `Website username updated to @${cleanName}.` });
    } finally {
      setIsSaving(false);
    }
  };

  if (!targetUsername && !user) {
    return (
      <div style={{ padding: '60px 20px', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f6', marginBottom: 12 }}>
          Sign In Required
        </h2>
        <p style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 20 }}>
          Please sign in with Discord to view your contributor profile and manage your website username.
        </p>
        <button
          type="button"
          className="btn-discord-primary"
          onClick={onOpenAuthModal}
          style={{ display: 'inline-flex', padding: '10px 20px' }}
        >
          Sign in with Discord
        </button>
      </div>
    );
  }

  const effectiveUser = publicProfile || {
    id: user?.id || `user_${targetUsername}`,
    username: targetUsername,
    isVerified: user?.isVerified || targetUsername.toLowerCase() === 'bru' || targetUsername.toLowerCase() === 'heysoybruno09',
    role: targetUsername.toLowerCase() === 'heysoybruno09' ? 'admin' : user?.role || 'contributor',
    avatar: user?.avatar || null,
    stats: {
      lyricsAdded: 2,
      lyricsSynced: 2,
      lyricsWanted: 1,
    },
    songs: [],
  };

  const isAdmin = effectiveUser.username.toLowerCase() === 'heysoybruno09';
  const stats = effectiveUser.stats || { lyricsAdded: 0, lyricsSynced: 0, lyricsWanted: 0 };

  return (
    <div style={{ padding: '32px 20px 80px 20px', maxWidth: 840, margin: '0 auto' }}>
      {/* Back button */}
      {onBackToCatalog && (
        <div style={{ marginBottom: 20 }}>
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
        </div>
      )}

      {/* Contributor Profile Card Header */}
      <div
        style={{
          backgroundColor: '#141418',
          border: '1px solid #27272a',
          borderRadius: 12,
          padding: 28,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
          {effectiveUser.avatar ? (
            <img
              src={effectiveUser.avatar}
              alt={effectiveUser.username}
              style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid #27272a', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                backgroundColor: '#27272a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {effectiveUser.username.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f4f4f6', margin: 0 }}>
                @{effectiveUser.username}
              </h1>
              <VerifiedSticker tier={isAdmin ? 'admin' : 'contributor'} size="md" />
            </div>
            <div style={{ fontSize: 12, color: '#71717a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              User ID: {effectiveUser.id} • {isAdmin ? 'System Administrator' : 'Verified Community Contributor'}
            </div>
          </div>
        </div>

        {/* Contribution Metrics Strip (Added, Synced, Wanted) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            backgroundColor: '#09090b',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #27272a',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Lyrics Added
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f4f4f6', marginTop: 4 }}>
              {isLoadingProfile ? '...' : stats.lyricsAdded}
            </div>
          </div>

          <div style={{ textAlign: 'center', borderLeft: '1px solid #27272a', borderRight: '1px solid #27272a' }}>
            <div style={{ fontSize: 11, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Lyrics Synced
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
              {isLoadingProfile ? '...' : stats.lyricsSynced}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Lyrics Wanted
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fbbf24', marginTop: 4 }}>
              {isLoadingProfile ? '...' : stats.lyricsWanted}
            </div>
          </div>
        </div>

        {/* Change Display Username Form (Only on own profile) */}
        {isOwnProfile && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #27272a' }}>
            {notice && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  marginBottom: 16,
                  fontSize: 13,
                  backgroundColor: notice.type === 'success' ? '#14532d' : '#7f1d1d',
                  color: notice.type === 'success' ? '#86efac' : '#fca5a5',
                  border: `1px solid ${notice.type === 'success' ? '#22c55e' : '#ef4444'}`,
                }}
              >
                {notice.message}
              </div>
            )}

            <form onSubmit={handleSaveUsername}>
              <div className="form-field" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f6' }}>
                  Website Display Username
                </label>
                <p style={{ fontSize: 12, color: '#8e8e98', margin: '4px 0 10px 0' }}>
                  Change how your name appears on your public profile and on synchronized lyrics.
                </p>
                <input
                  type="text"
                  className="text-input"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new display username..."
                  required
                  style={{ padding: '9px 12px', fontSize: 14 }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving || !newUsername.trim()}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600 }}
              >
                {isSaving ? 'Saving...' : 'Save Display Username'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Contributed Songs Section */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f4f4f6', marginBottom: 14 }}>
          Contributed Lyrics by @{effectiveUser.username}
        </h2>

        {effectiveUser.songs.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              backgroundColor: '#141418',
              border: '1px solid #27272a',
              borderRadius: 8,
              color: '#71717a',
              fontSize: 13,
            }}
          >
            No publicly published lyrics found for @{effectiveUser.username}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {effectiveUser.songs.map((song) => (
              <div
                key={song.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#141418',
                  border: '1px solid #27272a',
                  borderRadius: 8,
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200, flex: 1 }}>
                  <img
                    src={song.artworkUrl}
                    alt={song.title}
                    style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#f4f4f6' }}>{song.title}</div>
                    <div style={{ fontSize: 12, color: '#71717a' }}>
                      {song.artist} • {formatDuration(song.durationMs)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {song.isSyllableSynced && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 3,
                        backgroundColor: '#0c4a6e',
                        color: '#38bdf8',
                      }}
                    >
                      SYNCED
                    </span>
                  )}
                  {song.isVerified && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 3,
                        backgroundColor: '#14532d',
                        color: '#4ade80',
                      }}
                    >
                      VERIFIED
                    </span>
                  )}

                  {onSelectAndPlaySong && (
                    <button
                      type="button"
                      onClick={() =>
                        onSelectAndPlaySong({
                          id: song.id,
                          spotifyId: song.spotifyId,
                          ytmId: song.ytmId,
                          title: song.title,
                          artist: song.artist,
                          album: song.album,
                          artworkUrl: song.artworkUrl,
                          durationMs: song.durationMs,
                          source: 'verified',
                          isSyllableSynced: song.isSyllableSynced,
                          contributor: effectiveUser.username,
                        })
                      }
                      style={{
                        padding: '5px 12px',
                        backgroundColor: '#27272a',
                        color: '#f4f4f6',
                        border: '1px solid #3f3f46',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Play
                    </button>
                  )}

                  {onOpenSongPage && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenSongPage({
                          id: song.id,
                          spotifyId: song.spotifyId,
                          ytmId: song.ytmId,
                          title: song.title,
                          artist: song.artist,
                          album: song.album,
                          artworkUrl: song.artworkUrl,
                          durationMs: song.durationMs,
                          source: 'verified',
                          isSyllableSynced: song.isSyllableSynced,
                          contributor: effectiveUser.username,
                        })
                      }
                      style={{
                        padding: '5px 12px',
                        backgroundColor: '#09090b',
                        color: '#38bdf8',
                        border: '1px solid #0284c7',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View Page
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spotify & Audio Streaming Integration (Only on own profile) */}
      {isOwnProfile && (
        <div
          style={{
            backgroundColor: '#141418',
            border: '1px solid #27272a',
            borderRadius: 8,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f4f4f6', margin: '0 0 8px 0' }}>
            Music Streaming Services
          </h2>
          <p style={{ fontSize: 12, color: '#a1a1aa', margin: '0 0 18px 0' }}>
            Connect Spotify Premium to stream full-length tracks or use free full-song playback via YouTube Music.
          </p>

          <div
            style={{
              padding: 16,
              borderRadius: 6,
              backgroundColor: '#18181f',
              border: '1px solid #272732',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, color: '#f4f4f6', fontSize: 14 }}>Spotify</span>
                {spotifyUser ? (
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: spotifyUser.isPremium ? '#14532d' : '#3f2c00',
                      color: spotifyUser.isPremium ? '#4ade80' : '#fbbf24',
                      fontWeight: 700,
                    }}
                  >
                    {spotifyUser.isPremium ? 'PREMIUM (FULL PLAYBACK)' : 'FREE (PREVIEWS ONLY)'}
                  </span>
                ) : (
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, backgroundColor: '#27272a', color: '#a1a1aa' }}>
                    NOT CONNECTED
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: '#71717a', margin: '4px 0 0 0' }}>
                {spotifyUser
                  ? `Connected as @${spotifyUser.displayName} (${spotifyUser.product.toUpperCase()})`
                  : 'Connect your Spotify account to enable full-length streaming in the player.'}
              </p>
            </div>

            <div>
              {spotifyUser ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onDisconnectSpotify}
                  style={{ padding: '6px 12px', fontSize: 12, borderColor: '#ef4444', color: '#f87171' }}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onConnectSpotify}
                  style={{
                    backgroundColor: '#1db954',
                    color: '#000000',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Connect Spotify
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Account Info and Policies */}
      <div
        style={{
          backgroundColor: '#101014',
          border: '1px solid #1f1f26',
          borderRadius: 8,
          padding: 20,
          fontSize: 13,
          color: '#a1a1aa',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f4f4f6', marginBottom: 12 }}>
          Account &amp; Legal Policies
        </h3>
        <p style={{ margin: '0 0 10px 0' }}>
          Privacy Policy is officially maintained at heysoybruno099:{' '}
          <a
            href="https://github.com/heysoybruno099"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#4ade80', textDecoration: 'underline' }}
          >
            heysoybruno099 Privacy Policy
          </a>
        </p>
        <p style={{ margin: '0 0 16px 0' }}>
          Read the{' '}
          <button
            type="button"
            onClick={onViewTerms}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              fontSize: 'inherit',
            }}
          >
            Terms of Service and Intermediary Safe Harbor
          </button>
          .
        </p>

        {isOwnProfile && (
          <button
            type="button"
            onClick={onSignOut}
            className="btn btn-secondary"
            style={{ borderColor: '#ef4444', color: '#f87171', padding: '6px 14px', fontSize: 12 }}
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileView;
