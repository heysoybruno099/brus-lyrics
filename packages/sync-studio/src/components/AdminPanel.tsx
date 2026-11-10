import React, { useState, useEffect, useCallback } from 'react';
import type { DiscordUser, UnifiedSongItem } from '../lib/types.js';
import { getApiBaseUrl } from '../lib/config.js';
import { formatTimestampTTML } from '@brus-lyrics/shared-types';
import { VerifiedSticker } from './VerifiedSticker.js';

interface AdminPanelProps {
  user: DiscordUser | null;
  onSelectAndPlaySong: (song: UnifiedSongItem) => void;
  onOpenStudioWithTrack: (track: {
    title: string;
    artist: string;
    id?: string;
    spotifyId?: string;
    ytmId?: string;
    durationMs?: number;
  }) => void;
  onCatalogUpdated?: () => void;
}

interface SongRecord {
  id: string;
  spotify_id?: string | null;
  ytm_id?: string | null;
  isrc?: string | null;
  title: string;
  artist: string;
  duration_ms: number;
  contributor: string;
  file_path?: string;
  updated_at?: string;
  is_verified?: number | boolean;
}

interface SubmissionRecord {
  id: string;
  spotify_id?: string | null;
  ytm_id?: string | null;
  isrc?: string | null;
  title: string;
  artist: string;
  duration_ms: number;
  contributor: string;
  ttml_raw: string;
  status: string;
  created_at: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  user,
  onSelectAndPlaySong,
  onOpenStudioWithTrack,
  onCatalogUpdated,
}) => {
  const isAdmin = Boolean(
    user &&
      (user.id === '708497847753900042' ||
        user.id === '1568826229006540882' ||
        user.username.toLowerCase() === 'heysoybruno09' ||
        user.username.toLowerCase() === 'heysoybruno099' ||
        user.username.toLowerCase() === 'bru' ||
        user.role === 'admin')
  );

  const [catalog, setCatalog] = useState<SongRecord[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'catalog' | 'submissions'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const apiBase = getApiBaseUrl();
  const adminUsername = user?.username || 'heysoybruno09';
  const adminId = user?.id || '708497847753900042';
  const adminHeaders = {
    'X-Admin-User': adminUsername,
    'X-Admin-Id': adminId,
  };

  const fetchAdminData = useCallback(async (silent: boolean = false) => {
    if (!isAdmin) return;
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(
        `${apiBase}/v1/admin/songs?adminUser=${encodeURIComponent(adminUsername)}&adminId=${encodeURIComponent(adminId)}`,
        {
          headers: adminHeaders,
        }
      );
      if (res.ok) {
        const data = await res.json();
        setCatalog(data.catalog || []);
        setSubmissions(data.submissions || []);
      } else {
        const fallbackRes = await fetch(`${apiBase}/v1/catalog`);
        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          setCatalog(fbData.songs || []);
        }
      }
    } catch {
      try {
        const fallbackRes = await fetch(`${apiBase}/v1/catalog`);
        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          setCatalog(fbData.songs || []);
        }
      } catch {
        // Fallback exhausted
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [apiBase, isAdmin, adminUsername, adminId]);

  // Initial fetch and real-time polling every 6 seconds
  useEffect(() => {
    fetchAdminData();
    if (!isAdmin) return;
    const interval = setInterval(() => {
      fetchAdminData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchAdminData, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="admin-restricted-container" style={{ padding: 60, textAlign: 'center', color: '#f87171' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Access Restricted</h2>
        <p style={{ color: '#a1a1aa', fontSize: 14 }}>
          This dedicated administration console is strictly restricted to user <strong>heysoybruno09</strong> (Discord ID: 708497847753900042).
        </p>
      </div>
    );
  }

  // 1-Click Delete Song or Lyrics
  const handleDeleteSong = async (songId: string, songTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${songTitle}"?`)) {
      return;
    }

    try {
      const res = await fetch(
        `${apiBase}/v1/songs/${encodeURIComponent(songId)}?adminUser=${encodeURIComponent(adminUsername)}&adminId=${encodeURIComponent(adminId)}`,
        {
          method: 'DELETE',
          headers: adminHeaders,
        }
      );

      if (res.ok) {
        setNotice({ type: 'success', message: `"${songTitle}" was deleted successfully.` });
        setCatalog((prev) => prev.filter((s) => s.id !== songId && s.spotify_id !== songId && s.ytm_id !== songId));
        setSubmissions((prev) => prev.filter((s) => s.id !== songId && s.spotify_id !== songId));
        await fetchAdminData(true);
        onCatalogUpdated?.();
      } else {
        const err = await res.json();
        setNotice({ type: 'error', message: err.error || 'Failed to delete song' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: `Deletion error: ${err.message}` });
    }
  };

  // 1-Click Verify / Approve Lyrics
  const handleVerifyLyrics = async (songId: string, songTitle: string) => {
    const cleanId = songId.replace(/^song_/, '').toLowerCase();

    // Optimistically update local state immediately
    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === songId ||
        sub.id.replace(/^song_/, '').toLowerCase() === cleanId ||
        (sub.spotify_id && sub.spotify_id.toLowerCase() === cleanId)
          ? { ...sub, status: 'verified' }
          : sub
      )
    );
    setCatalog((prev) => {
      const exists = prev.some(
        (cat) =>
          cat.id === songId ||
          cat.id.replace(/^song_/, '').toLowerCase() === cleanId ||
          (cat.spotify_id && cat.spotify_id.toLowerCase() === cleanId)
      );
      if (exists) {
        return prev.map((cat) =>
          cat.id === songId ||
          cat.id.replace(/^song_/, '').toLowerCase() === cleanId ||
          (cat.spotify_id && cat.spotify_id.toLowerCase() === cleanId)
            ? { ...cat, is_verified: 1 }
            : cat
        );
      }
      const matchedSub = submissions.find(
        (sub) =>
          sub.id === songId ||
          sub.id.replace(/^song_/, '').toLowerCase() === cleanId ||
          (sub.spotify_id && sub.spotify_id.toLowerCase() === cleanId)
      );
      if (matchedSub) {
        return [
          {
            id: matchedSub.id,
            spotify_id: matchedSub.spotify_id || null,
            ytm_id: matchedSub.ytm_id || null,
            isrc: matchedSub.isrc || null,
            title: matchedSub.title,
            artist: matchedSub.artist,
            duration_ms: matchedSub.duration_ms,
            contributor: matchedSub.contributor || 'Verified Catalog',
            is_verified: 1,
            updated_at: new Date().toISOString(),
          },
          ...prev,
        ];
      }
      return prev;
    });

    try {
      const res = await fetch(
        `${apiBase}/v1/admin/verify?adminUser=${encodeURIComponent(adminUsername)}&adminId=${encodeURIComponent(adminId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...adminHeaders,
          },
          body: JSON.stringify({ songId, verified: true }),
        }
      );

      if (res.ok) {
        setNotice({ type: 'success', message: `Lyrics for "${songTitle}" verified and approved!` });
        await fetchAdminData(true);
        onCatalogUpdated?.();
      } else {
        const err = await res.json();
        setNotice({ type: 'error', message: err.error || 'Failed to verify song' });
        await fetchAdminData(true);
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: `Verification error: ${err.message}` });
      await fetchAdminData(true);
    }
  };

  // Filtering
  const cleanSearch = searchTerm.trim().toLowerCase();
  const filteredCatalog = catalog.filter(
    (s) =>
      s.title.toLowerCase().includes(cleanSearch) ||
      s.artist.toLowerCase().includes(cleanSearch) ||
      (s.contributor && s.contributor.toLowerCase().includes(cleanSearch))
  );

  const filteredSubmissions = submissions.filter(
    (s) =>
      s.title.toLowerCase().includes(cleanSearch) ||
      s.artist.toLowerCase().includes(cleanSearch) ||
      (s.contributor && s.contributor.toLowerCase().includes(cleanSearch))
  );

  return (
    <div className="admin-page-container" style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid #27272a', paddingBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f4f4f6', margin: 0 }}>
              Dedicated Admin Panel
            </h1>
            <VerifiedSticker tier="admin" size="md" />
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 9999, backgroundColor: '#14532d', color: '#4ade80', fontWeight: 600 }}>
              ADMIN ONLY
            </span>

          </div>
          <p style={{ fontSize: 13, color: '#a1a1aa', margin: '4px 0 0 0' }}>
            Manage published songs and incoming submissions. 1-click verify or delete mistakes with immediate sync.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => { fetchAdminData(); }}
          disabled={isLoading}
          style={{ padding: '8px 14px', fontSize: 12 }}
        >
          {isLoading ? 'Refreshing...' : 'Refresh Catalog'}
        </button>
      </div>

      {notice && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 6,
            marginBottom: 20,
            fontSize: 13,
            backgroundColor: notice.type === 'success' ? '#14532d' : '#7f1d1d',
            color: notice.type === 'success' ? '#86efac' : '#fca5a5',
            border: `1px solid ${notice.type === 'success' ? '#22c55e' : '#ef4444'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
          >
            x
          </button>
        </div>
      )}

      {/* Controls Bar: Filter & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={`btn btn-secondary ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              backgroundColor: filter === 'all' ? '#27272a' : '#18181b',
              color: filter === 'all' ? '#ffffff' : '#a1a1aa',
            }}
          >
            All Items ({filteredCatalog.length + filteredSubmissions.length})
          </button>
          <button
            type="button"
            className={`btn btn-secondary ${filter === 'catalog' ? 'active' : ''}`}
            onClick={() => setFilter('catalog')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              backgroundColor: filter === 'catalog' ? '#27272a' : '#18181b',
              color: filter === 'catalog' ? '#ffffff' : '#a1a1aa',
            }}
          >
            Catalog Songs ({filteredCatalog.length})
          </button>
          <button
            type="button"
            className={`btn btn-secondary ${filter === 'submissions' ? 'active' : ''}`}
            onClick={() => setFilter('submissions')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              backgroundColor: filter === 'submissions' ? '#27272a' : '#18181b',
              color: filter === 'submissions' ? '#ffffff' : '#a1a1aa',
            }}
          >
            Submissions ({filteredSubmissions.length})
          </button>
        </div>

        <input
          type="text"
          className="text-input"
          placeholder="Filter by title, artist, or contributor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 320, padding: '6px 12px', fontSize: 12 }}
        />
      </div>

      {/* Catalog Table */}
      {(filter === 'all' || filter === 'catalog') && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f4f4f6', marginBottom: 12 }}>
            Catalog Songs ({filteredCatalog.length})
          </h2>
          {filteredCatalog.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', backgroundColor: '#141418', borderRadius: 6, color: '#71717a', fontSize: 13 }}>
              No catalog songs matching filter.
            </div>
          ) : (
            <div style={{ border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#18181b', borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
                    <th style={{ padding: '10px 14px' }}>Track</th>
                    <th style={{ padding: '10px 14px' }}>Duration</th>
                    <th style={{ padding: '10px 14px' }}>Platform ID</th>
                    <th style={{ padding: '10px 14px' }}>Contributor</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalog.map((s, idx) => (
                    <tr
                      key={s.id || idx}
                      style={{
                        borderBottom: '1px solid #1f1f23',
                        backgroundColor: idx % 2 === 0 ? '#101014' : '#141418',
                      }}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#f4f4f6' }}>{s.title}</div>
                        <div style={{ fontSize: 11, color: '#a1a1aa' }}>{s.artist}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#a1a1aa' }}>
                        {formatTimestampTTML(s.duration_ms)}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#71717a' }}>
                        {s.spotify_id ? (
                          <a
                            href={`https://open.spotify.com/track/${s.spotify_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#1db954', textDecoration: 'none', marginRight: 6 }}
                            title="Open Spotify Track in new tab"
                          >
                            SP: {s.spotify_id.slice(0, 10)}...
                          </a>
                        ) : null}
                        {s.ytm_id ? (
                          <a
                            href={`https://music.youtube.com/watch?v=${s.ytm_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#f87171', textDecoration: 'none' }}
                            title="Open YouTube Music in new tab"
                          >
                            YT: {s.ytm_id}
                          </a>
                        ) : null}
                        {!s.spotify_id && !s.ytm_id ? s.id : null}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, backgroundColor: '#27272a', color: '#e4e4e7' }}>
                          @{s.contributor || 'Community'}
                        </span>
                        {(s.is_verified === 1 || s.is_verified === true || s.contributor === 'Verified Catalog') && (
                          <span style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px', borderRadius: 4, backgroundColor: '#14532d', color: '#4ade80', fontWeight: 600 }}>
                            VERIFIED
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() =>
                              onSelectAndPlaySong({
                                id: s.id || s.spotify_id || '',
                                spotifyId: s.spotify_id || undefined,
                                ytmId: s.ytm_id || undefined,
                                title: s.title,
                                artist: s.artist,
                                album: '',
                                artworkUrl: '',
                                durationMs: s.duration_ms,
                                source: 'verified',
                                isSyllableSynced: true,
                              })
                            }
                            title="Play lyrics"
                          >
                            Play
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() =>
                              onOpenStudioWithTrack({
                                title: s.title,
                                artist: s.artist,
                                id: s.spotify_id || s.ytm_id || s.id,
                                spotifyId: s.spotify_id || undefined,
                                ytmId: s.ytm_id || undefined,
                                durationMs: s.duration_ms,
                              })
                            }
                            title="Edit lyrics in Studio"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11, color: '#4ade80', borderColor: '#22c55e' }}
                            onClick={() => handleVerifyLyrics(s.id || s.spotify_id!, s.title)}
                            title="Verify lyrics"
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11, color: '#f87171', borderColor: '#ef4444' }}
                            onClick={() => handleDeleteSong(s.id || s.spotify_id!, s.title)}
                            title="1-click delete song / lyrics if mistake was made"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Submissions Table */}
      {(filter === 'all' || filter === 'submissions') && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f4f4f6', marginBottom: 12 }}>
            Community Submissions ({filteredSubmissions.length})
          </h2>
          {filteredSubmissions.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', backgroundColor: '#141418', borderRadius: 6, color: '#71717a', fontSize: 13 }}>
              No submissions queued.
            </div>
          ) : (
            <div style={{ border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#18181b', borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
                    <th style={{ padding: '10px 14px' }}>Track</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Contributor</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((sub, idx) => (
                    <tr
                      key={sub.id || idx}
                      style={{
                        borderBottom: '1px solid #1f1f23',
                        backgroundColor: idx % 2 === 0 ? '#101014' : '#141418',
                      }}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#f4f4f6' }}>{sub.title}</div>
                        <div style={{ fontSize: 11, color: '#a1a1aa' }}>{sub.artist}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: sub.status === 'verified' ? '#14532d' : '#3f2c00',
                            color: sub.status === 'verified' ? '#4ade80' : '#fbbf24',
                            fontWeight: 600,
                          }}
                        >
                          {sub.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, color: '#a1a1aa' }}>
                          @{sub.contributor}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() =>
                              onOpenStudioWithTrack({
                                title: sub.title,
                                artist: sub.artist,
                                id: sub.spotify_id || sub.ytm_id || sub.id,
                                spotifyId: sub.spotify_id || undefined,
                                ytmId: sub.ytm_id || undefined,
                                durationMs: sub.duration_ms,
                              })
                            }
                            title="Edit submission in Studio"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11, color: '#4ade80', borderColor: '#22c55e' }}
                            onClick={() => handleVerifyLyrics(sub.id, sub.title)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11, color: '#f87171', borderColor: '#ef4444' }}
                            onClick={() => handleDeleteSong(sub.id, sub.title)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
