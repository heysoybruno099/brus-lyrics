import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { TTMLLine, TTMLMetadata, TTMLDocument } from '@brus-lyrics/shared-types';
import { Navbar } from './components/Navbar.js';
import { HeroIntro } from './components/HeroIntro.js';
import { SongCardGrid } from './components/SongCardGrid.js';
import { MusicPlayerBar } from './components/MusicPlayerBar.js';
import { LyricsPopupModal } from './components/LyricsPopupModal.js';
import { DiscordAuthModal } from './components/DiscordAuthModal.js';
import { LegalDocumentation } from './components/LegalDocumentation.js';
import { ProfileView } from './components/ProfileView.js';
import { AdminPanel } from './components/AdminPanel.js';
import { AudioMetadataDeck } from './components/AudioMetadataDeck.js';
import { TapSyncMatrix } from './components/TapSyncMatrix.js';
import { LivePreviewDeck } from './components/LivePreviewDeck.js';

import { AudioPlayerEngine } from './lib/audio-player-engine.js';
import { SpotifyWebPlayer } from './lib/spotify-web-player.js';
import { YouTubePlayer } from './lib/youtube-player.js';
import {
  getStoredSpotifyToken,
  getStoredSpotifyUser,
  buildSpotifyOAuthUrl,
  parseSpotifyOAuthToken,
  fetchSpotifyUserProfile,
  clearSpotifyAuth,
} from './lib/spotify-auth.js';
import { searchSongs, VERIFIED_FEATURED_TRACKS, resolveTrackPreviewUrl } from './lib/spotify-service.js';
import {
  getStoredUser,
  clearUser,
  parseOAuthRedirectToken,
  fetchDiscordUserProfile,
} from './lib/discord-auth.js';
import { fetchLyricsForTrack } from './lib/lyrics-service.js';
import type { AppViewMode, DiscordUser, SpotifyUserProfile, UnifiedSongItem } from './lib/types.js';

export const App: React.FC = () => {
  // Navigation & View
  const [currentView, setCurrentView] = useState<AppViewMode>('discover');
  const [user, setUser] = useState<DiscordUser | null>(() => getStoredUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Spotify Authentication State
  const [spotifyToken, setSpotifyToken] = useState<string | null>(() => getStoredSpotifyToken());
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUserProfile | null>(() => getStoredSpotifyUser());
  const isSpotifyPremium = Boolean(spotifyUser?.isPremium);

  // Playback Source: 'spotify' | 'youtube' | 'preview'
  const [currentPlaybackSource, setCurrentPlaybackSource] = useState<'spotify' | 'youtube' | 'preview'>('youtube');

  // Songs & Search State
  const [songs, setSongs] = useState<UnifiedSongItem[]>(VERIFIED_FEATURED_TRACKS);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Playback & Lyrics State - initialize with first featured song
  const [activeSong, setActiveSong] = useState<UnifiedSongItem | null>(() => VERIFIED_FEATURED_TRACKS[0] || null);
  const [activeDocument, setActiveDocument] = useState<TTMLDocument | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);
  const [isLyricsPopupOpen, setIsLyricsPopupOpen] = useState<boolean>(false);

  // Player state
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(165600);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  // Studio Workstation state
  const [studioMetadata, setStudioMetadata] = useState<TTMLMetadata>({
    title: 'Ella Baila Sola',
    artist: 'Eslabon Armado, Peso Pluma',
    spotifyId: '3qhlB30KknSeipLHZaYeKc',
    ytmId: 'lZIAZhbmPvg',
    contributor: 'Community',
    durationMs: 165600,
  });

  const [studioLines, setStudioLines] = useState<TTMLLine[]>([
    {
      id: 'line_1',
      begin: 15500,
      end: 18200,
      agent: 'v1',
      text: 'Compa que le parece esa morra',
      syllables: [
        { begin: 15500, end: 16100, text: 'Compa ' },
        { begin: 16100, end: 16900, text: 'que ' },
        { begin: 16900, end: 17500, text: 'le ' },
        { begin: 17500, end: 18200, text: 'parece ' },
      ],
    },
    {
      id: 'line_2',
      begin: 18500,
      end: 22000,
      agent: 'v2',
      text: 'La que anda bailando sola',
      syllables: [
        { begin: 18500, end: 19200, text: 'La ' },
        { begin: 19200, end: 20000, text: 'que ' },
        { begin: 20000, end: 20800, text: 'anda ' },
        { begin: 20800, end: 21500, text: 'bailando ' },
        { begin: 21500, end: 22000, text: 'sola' },
      ],
    },
  ]);

  // Player Engine References
  const audioEngineRef = useRef<AudioPlayerEngine | null>(null);
  const studioAudioRef = useRef<HTMLAudioElement | null>(null);
  const spotifyPlayerRef = useRef<SpotifyWebPlayer | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);

  // Initialize HTML5 / Synthetic Audio Engine
  useEffect(() => {
    const engine = new AudioPlayerEngine();
    audioEngineRef.current = engine;

    const unsubscribe = engine.subscribe({
      onTimeUpdate: (cur, dur) => {
        if (currentPlaybackSource === 'preview') {
          setCurrentTimeMs(cur);
          if (dur > 0) setDurationMs(dur);
        }
      },
      onPlayStateChange: (playing) => {
        if (currentPlaybackSource === 'preview') {
          setIsPlaying(playing);
        }
      },
      onEnded: () => {
        if (currentPlaybackSource === 'preview') {
          setIsPlaying(false);
        }
      },
    });

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [currentPlaybackSource]);

  // Initialize YouTube IFrame Player (Free Full Track)
  useEffect(() => {
    const yt = new YouTubePlayer({
      onTimeUpdate: (cur, dur) => {
        if (currentPlaybackSource === 'youtube') {
          setCurrentTimeMs(cur);
          if (dur > 0) setDurationMs(dur);
        }
      },
      onPlayStateChange: (playing) => {
        if (currentPlaybackSource === 'youtube') {
          setIsPlaying(playing);
        }
      },
      onEnded: () => {
        if (currentPlaybackSource === 'youtube') {
          setIsPlaying(false);
        }
      },
    });

    youtubePlayerRef.current = yt;
    yt.initialize('yt-player-mount');

    return () => {
      yt.destroy();
    };
  }, [currentPlaybackSource]);

  // Initialize Spotify Web Playback SDK if token is present
  useEffect(() => {
    if (!spotifyToken) return;

    const sp = new SpotifyWebPlayer({
      onTimeUpdate: (cur, dur) => {
        if (currentPlaybackSource === 'spotify') {
          setCurrentTimeMs(cur);
          if (dur > 0) setDurationMs(dur);
        }
      },
      onPlayStateChange: (playing) => {
        if (currentPlaybackSource === 'spotify') {
          setIsPlaying(playing);
        }
      },
      onError: (msg) => {
        // If Spotify error occurs (e.g. non-premium), fallback to YouTube or preview
        if (currentPlaybackSource === 'spotify' && activeSong?.ytmId) {
          setCurrentPlaybackSource('youtube');
          youtubePlayerRef.current?.loadVideo(activeSong.ytmId, true);
        }
      },
    });

    spotifyPlayerRef.current = sp;
    sp.initialize(spotifyToken);

    return () => {
      sp.disconnect();
    };
  }, [spotifyToken, currentPlaybackSource, activeSong]);

  // Handle OAuth Redirects (Spotify & Discord) and URL Parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;

    // 1. Spotify OAuth redirect check
    if (hash.includes('state=spotify_auth')) {
      const spAuth = parseSpotifyOAuthToken();
      if (spAuth) {
        setSpotifyToken(spAuth.accessToken);
        fetchSpotifyUserProfile(spAuth.accessToken).then((profile) => {
          if (profile) {
            setSpotifyUser(profile);
          }
        });
      }
      window.history.replaceState(null, '', window.location.pathname);
    }
    // 2. Discord OAuth redirect check
    else if (hash.includes('access_token')) {
      const redirectToken = parseOAuthRedirectToken();
      if (redirectToken) {
        fetchDiscordUserProfile(redirectToken).then((u) => {
          if (u) {
            setUser(u);
            setCurrentView('studio');
          }
        });
      }
      window.history.replaceState(null, '', window.location.pathname);
    }

    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');

    // Clean callback URL cleanly so user does not 404 or get stuck on /callback
    if (path.includes('/callback')) {
      window.history.replaceState(null, '', '/');
    }

    // Direct routing
    if (path.includes('/terms') || modeParam === 'legal') {
      setCurrentView('legal');
    } else if (path.includes('/profile') || modeParam === 'profile') {
      setCurrentView('profile');
    } else if (path.includes('/admin') || modeParam === 'admin') {
      setCurrentView('admin');
    } else if (path.includes('/sync') || modeParam === 'studio') {
      setCurrentView('studio');
    }

    // External track query support
    const trackId = params.get('trackId');
    const title = params.get('title');
    const artist = params.get('artist');
    const duration = params.get('duration');

    if (title || artist || trackId) {
      const durNum = duration ? parseInt(duration, 10) : 180000;
      const songTitle = title || 'Incoming Track';
      const songArtist = artist || 'Unknown Artist';
      const platform = params.get('platform') || (trackId?.length === 22 ? 'spotify' : 'ytm');

      setStudioMetadata((prev) => ({
        ...prev,
        title: songTitle,
        artist: songArtist,
        ...(platform === 'spotify' && trackId ? { spotifyId: trackId } : {}),
        ...(platform === 'ytm' && trackId ? { ytmId: trackId } : {}),
        durationMs: durNum,
      }));
      setDurationMs(durNum);

      const matched = VERIFIED_FEATURED_TRACKS.find(
        (t) =>
          (trackId && (t.spotifyId === trackId || t.id.includes(trackId))) ||
          (title && t.title.toLowerCase().includes(title.toLowerCase()))
      );

      const targetSong: UnifiedSongItem = matched || {
        id: trackId ? `ext_${trackId}` : `ext_${Date.now()}`,
        spotifyId: platform === 'spotify' ? trackId : null,
        ytmId: platform === 'ytm' ? trackId : null,
        title: songTitle,
        artist: songArtist,
        album: 'Single',
        artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
        durationMs: durNum,
        previewUrl: null,
        source: platform === 'spotify' ? 'spotify' : 'verified',
        isSyllableSynced: false,
        contributor: user?.username || 'Community',
      };

      setActiveSong(targetSong);
      handlePlaySongCard(targetSong);
    }
  }, []);

  // Search handler
  const handleSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const results = await searchSongs(query);
      setSongs(results);
    } catch {
      setSongs(VERIFIED_FEATURED_TRACKS);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Play Song Card Handler: Selects best available audio source and starts playback
  const handlePlaySongCard = useCallback(async (song: UnifiedSongItem) => {
    let playableSong = song;

    // Resolve audio preview stream if needed
    if (!playableSong.previewUrl) {
      const resolved = await resolveTrackPreviewUrl(playableSong.title, playableSong.artist);
      if (resolved) {
        playableSong = { ...playableSong, previewUrl: resolved };
      }
    }

    setActiveSong(playableSong);
    setIsLyricsPopupOpen(true);
    setIsLoadingLyrics(true);
    setDurationMs(playableSong.durationMs || 180000);

    // Stop currently running playback engines
    audioEngineRef.current?.pause();
    youtubePlayerRef.current?.pause();
    spotifyPlayerRef.current?.pause();

    // Source Selection Priority:
    // 1. Spotify Web Playback SDK (if user connected with Spotify Premium)
    // 2. YouTube Music (Free Full Song Playback for any track with ytmId)
    // 3. Audio Preview (30-second iTunes / synthetic fallback)
    if (spotifyToken && isSpotifyPremium && playableSong.spotifyId && spotifyPlayerRef.current) {
      setCurrentPlaybackSource('spotify');
      await spotifyPlayerRef.current.playTrack(playableSong.spotifyId, 0);
    } else if (playableSong.ytmId && youtubePlayerRef.current) {
      setCurrentPlaybackSource('youtube');
      youtubePlayerRef.current.loadVideo(playableSong.ytmId, true);
    } else if (audioEngineRef.current) {
      setCurrentPlaybackSource('preview');
      audioEngineRef.current.loadTrack(playableSong.previewUrl, playableSong.durationMs);
      await audioEngineRef.current.play().catch(() => {});
    }

    // Update studio metadata
    setStudioMetadata((prev) => ({
      ...prev,
      title: playableSong.title,
      artist: playableSong.artist,
      album: playableSong.album,
      spotifyId: playableSong.spotifyId || undefined,
      ytmId: playableSong.ytmId || undefined,
      durationMs: playableSong.durationMs,
    }));

    // Fetch synchronized lyrics
    try {
      const doc = await fetchLyricsForTrack(playableSong);
      setActiveDocument(doc);
      if (doc && doc.lines && doc.lines.length > 0) {
        setStudioLines(doc.lines);
      }
    } catch {
      setActiveDocument(null);
    } finally {
      setIsLoadingLyrics(false);
    }
  }, [spotifyToken, isSpotifyPremium]);

  // Audio control callbacks routed to active playback source
  const handleTogglePlay = () => {
    if (currentPlaybackSource === 'spotify' && spotifyPlayerRef.current) {
      if (isPlaying) spotifyPlayerRef.current.pause();
      else spotifyPlayerRef.current.resume();
    } else if (currentPlaybackSource === 'youtube' && youtubePlayerRef.current) {
      if (isPlaying) youtubePlayerRef.current.pause();
      else youtubePlayerRef.current.play();
    } else if (audioEngineRef.current) {
      if (isPlaying) audioEngineRef.current.pause();
      else audioEngineRef.current.play();
    }
  };

  const handleSeek = (targetMs: number) => {
    setCurrentTimeMs(targetMs);
    if (currentPlaybackSource === 'spotify' && spotifyPlayerRef.current) {
      spotifyPlayerRef.current.seek(targetMs);
    } else if (currentPlaybackSource === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.seek(targetMs);
    } else if (audioEngineRef.current) {
      audioEngineRef.current.seek(targetMs);
    }
  };

  const handleChangeVolume = (vol: number) => {
    setVolume(vol);
    audioEngineRef.current?.setVolume(vol);
    spotifyPlayerRef.current?.setVolume(vol);
    youtubePlayerRef.current?.setVolume(vol);
  };

  const handleChangePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    audioEngineRef.current?.setPlaybackRate(rate);
  };

  // Auth callbacks
  const handleSignOut = () => {
    clearUser();
    setUser(null);
    if (currentView === 'studio' || currentView === 'admin' || currentView === 'profile') {
      setCurrentView('discover');
    }
  };

  const handleAuthSuccess = (authenticatedUser: DiscordUser) => {
    setUser(authenticatedUser);
    setCurrentView('studio');
  };

  const handleConnectSpotify = () => {
    window.location.href = buildSpotifyOAuthUrl();
  };

  const handleDisconnectSpotify = () => {
    clearSpotifyAuth();
    setSpotifyToken(null);
    setSpotifyUser(null);
    if (currentPlaybackSource === 'spotify') {
      if (activeSong?.ytmId && youtubePlayerRef.current) {
        setCurrentPlaybackSource('youtube');
        youtubePlayerRef.current.loadVideo(activeSong.ytmId, true);
      } else {
        setCurrentPlaybackSource('preview');
        audioEngineRef.current?.play();
      }
    }
  };

  return (
    <div className="app-shell">
      {/* Hidden YouTube IFrame Player mount */}
      <div
        id="yt-player-mount"
        style={{
          position: 'fixed',
          bottom: -100,
          right: -100,
          width: 1,
          height: 1,
          opacity: 0.01,
          pointerEvents: 'none',
        }}
      />

      {/* Top Sticky Minimalist Header */}
      <Navbar
        currentView={currentView}
        onSelectView={(view) => {
          if (view === 'studio' && !user) {
            setIsAuthModalOpen(true);
          } else {
            setCurrentView(view);
          }
        }}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main View Switching */}
      <main className="app-main-content">
        {currentView === 'discover' && (
          <div className="discover-page-wrap">
            <HeroIntro
              onSearch={handleSearch}
              isSearching={isSearching}
              totalTracksCount={songs.length}
            />

            {/* Informative Banner for 30s preview vs Full playback */}
            {currentPlaybackSource === 'preview' && !isSpotifyPremium && (
              <div
                style={{
                  maxWidth: 1200,
                  margin: '0 auto 20px auto',
                  padding: '12px 20px',
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 13,
                  color: '#fbbf24',
                }}
              >
                <span>30-Second Preview Mode. Connect Spotify Premium to unlock full-length playback.</span>
                <button
                  type="button"
                  onClick={handleConnectSpotify}
                  style={{
                    backgroundColor: '#1db954',
                    color: '#000000',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Connect Spotify
                </button>
              </div>
            )}

            {currentPlaybackSource === 'youtube' && (
              <div
                style={{
                  maxWidth: 1200,
                  margin: '0 auto 20px auto',
                  padding: '10px 18px',
                  backgroundColor: '#0c1a2e',
                  border: '1px solid #1e3a5f',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  color: '#93c5fd',
                }}
              >
                <span>Free Full-Song Playback active via YouTube Music. Zero subscription required.</span>
                <span style={{ fontSize: 11, color: '#60a5fa' }}>Syllable Synced</span>
              </div>
            )}

            <SongCardGrid
              songs={songs}
              currentTrackId={activeSong?.id}
              isPlaying={isPlaying}
              onSelectAndPlay={handlePlaySongCard}
              isLoading={isSearching}
            />
          </div>
        )}

        {currentView === 'studio' && (
          <div className="studio-container-wrap">
            <div className="workstation-container">
              {/* Top Workstation Header */}
              <header className="workstation-header">
                <div className="brand-title">
                  <span>Lyrics Studio</span>
                  <span className="brand-badge">Syllable Workstation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {user ? (
                    <>
                      <span className="header-status">
                        Contributor: <strong style={{ color: '#f4f4f6' }}>@{user.username}</strong>
                      </span>
                      <span className="brand-badge" style={{ color: '#4ade80' }}>
                        VERIFIED
                      </span>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="brand-badge"
                      style={{ cursor: 'pointer', background: '#1c1c24', color: '#a1a1aa', border: '1px solid #33333d' }}
                      onClick={() => setIsAuthModalOpen(true)}
                    >
                      Sign in to Publish
                    </button>
                  )}
                </div>
              </header>

              {/* Hidden audio element for file decoding */}
              <audio
                ref={studioAudioRef}
                onTimeUpdate={() => {
                  if (studioAudioRef.current) {
                    setCurrentTimeMs(Math.round(studioAudioRef.current.currentTime * 1000));
                  }
                }}
              />

              {/* Pane 1: Audio & Metadata Deck */}
              <AudioMetadataDeck
                metadata={studioMetadata}
                onChangeMetadata={(meta) => setStudioMetadata((prev) => ({ ...prev, ...meta }))}
                audioRef={studioAudioRef}
                currentTimeMs={currentTimeMs}
                durationMs={durationMs}
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                onSeek={handleSeek}
                playbackRate={playbackRate}
                onChangePlaybackRate={handleChangePlaybackRate}
                onAudioLoaded={(file, totalDur) => {
                  if (studioAudioRef.current) {
                    const objUrl = URL.createObjectURL(file);
                    studioAudioRef.current.src = objUrl;
                    studioAudioRef.current.load();
                  }
                  if (audioEngineRef.current) {
                    audioEngineRef.current.loadAudioFile(file);
                  }
                  setCurrentPlaybackSource('preview');
                  setDurationMs(totalDur);
                  setStudioMetadata((prev) => ({ ...prev, durationMs: totalDur }));
                }}
              />

              {/* Pane 2: Multi-format Syllable Tap-Sync Matrix */}
              <TapSyncMatrix
                lines={studioLines}
                onChangeLines={setStudioLines}
                currentTimeMs={currentTimeMs}
                durationMs={durationMs}
                onSeek={handleSeek}
                onChangeMetadata={(meta) => setStudioMetadata((prev) => ({ ...prev, ...meta }))}
              />

              {/* Pane 3: Live 60FPS Render Preview & One-Click Publish */}
              <LivePreviewDeck
                metadata={studioMetadata}
                lines={studioLines}
                currentTimeMs={currentTimeMs}
                onSeek={handleSeek}
                user={user}
                onRequireAuth={() => setIsAuthModalOpen(true)}
              />
            </div>
          </div>
        )}

        {currentView === 'profile' && (
          <ProfileView
            user={user}
            onUpdateUser={setUser}
            onSignOut={handleSignOut}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onViewTerms={() => setCurrentView('legal')}
            spotifyUser={spotifyUser}
            onConnectSpotify={handleConnectSpotify}
            onDisconnectSpotify={handleDisconnectSpotify}
          />
        )}

        {currentView === 'admin' && (
          <AdminPanel
            user={user}
            onSelectAndPlaySong={handlePlaySongCard}
            onOpenStudioWithTrack={(track) => {
              setStudioMetadata((prev) => ({
                ...prev,
                title: track.title,
                artist: track.artist,
                spotifyId: track.id,
              }));
              setCurrentView('studio');
            }}
          />
        )}

        {currentView === 'legal' && <LegalDocumentation />}
      </main>

      {/* Universal Footer with Terms of Service and Privacy Policy */}
      <footer className="site-footer" style={{ padding: '24px 20px', borderTop: '1px solid #1c1c24', backgroundColor: '#0d0d11', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, color: '#a1a1aa', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => setCurrentView('legal')}
              style={{ background: 'none', border: 'none', color: '#f4f4f6', cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}
            >
              Terms of Service
            </button>
            <span style={{ color: '#52525b' }}>•</span>
            <a
              href="https://github.com/heysoybruno09"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4ade80', textDecoration: 'underline' }}
            >
              Privacy Policy (heysoybruno09)
            </a>
            <span style={{ color: '#52525b' }}>•</span>
            <button
              type="button"
              onClick={() => setCurrentView('legal')}
              style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
            >
              DMCA 512 Notice &amp; Takedown
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#71717a' }}>
            International Copyright Safe Harbor • Berne Convention &amp; WIPO WCT Compliant
          </div>
        </div>
      </footer>

      {/* In-Browser Music Player Bar */}
      <MusicPlayerBar
        song={activeSong}
        currentTimeMs={currentTimeMs}
        durationMs={durationMs}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        volume={volume}
        onChangeVolume={handleChangeVolume}
        playbackRate={playbackRate}
        onChangePlaybackRate={handleChangePlaybackRate}
        onToggleLyricsPopup={() => setIsLyricsPopupOpen((prev) => !prev)}
        isLyricsPopupOpen={isLyricsPopupOpen}
        currentPlaybackSource={currentPlaybackSource}
        isSpotifyConnected={Boolean(spotifyToken)}
        isSpotifyPremium={isSpotifyPremium}
        onConnectSpotify={handleConnectSpotify}
      />

      {/* Pop-up Lyrics Overlay */}
      <LyricsPopupModal
        isOpen={isLyricsPopupOpen}
        onClose={() => setIsLyricsPopupOpen(false)}
        song={activeSong}
        document={activeDocument}
        currentTimeMs={currentTimeMs}
        durationMs={durationMs}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        isLoadingLyrics={isLoadingLyrics}
        currentPlaybackSource={currentPlaybackSource}
        isSpotifyPremium={isSpotifyPremium}
        onConnectSpotify={handleConnectSpotify}
      />

      {/* Discord Authentication Modal with Terms Acceptance Pop-up */}
      <DiscordAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onViewTerms={() => setCurrentView('legal')}
      />
    </div>
  );
};

export default App;
