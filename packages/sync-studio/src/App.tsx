import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { TTMLLine, TTMLMetadata, TTMLDocument } from '@brus-lyrics/shared-types';
import { Navbar } from './components/Navbar.js';
import { HeroIntro } from './components/HeroIntro.js';
import { SongCardGrid } from './components/SongCardGrid.js';
import { MusicPlayerBar } from './components/MusicPlayerBar.js';
import { LyricsPopupModal } from './components/LyricsPopupModal.js';
import { DiscordAuthModal } from './components/DiscordAuthModal.js';
import { LegalDocumentation } from './components/LegalDocumentation.js';
import { AudioMetadataDeck } from './components/AudioMetadataDeck.js';
import { TapSyncMatrix } from './components/TapSyncMatrix.js';
import { LivePreviewDeck } from './components/LivePreviewDeck.js';

import { AudioPlayerEngine } from './lib/audio-player-engine.js';
import { searchSongs, VERIFIED_FEATURED_TRACKS } from './lib/spotify-service.js';
import {
  getStoredUser,
  clearUser,
  parseOAuthRedirectToken,
  fetchDiscordUserProfile,
} from './lib/discord-auth.js';
import { fetchLyricsForTrack } from './lib/lyrics-service.js';
import type { AppViewMode, DiscordUser, UnifiedSongItem } from './lib/types.js';

export const App: React.FC = () => {
  // Navigation & View
  const [currentView, setCurrentView] = useState<AppViewMode>('discover');
  const [user, setUser] = useState<DiscordUser | null>(() => getStoredUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Songs & Search State
  const [songs, setSongs] = useState<UnifiedSongItem[]>(VERIFIED_FEATURED_TRACKS);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Playback & Lyrics State
  const [activeSong, setActiveSong] = useState<UnifiedSongItem | null>(null);
  const [activeDocument, setActiveDocument] = useState<TTMLDocument | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);
  const [isLyricsPopupOpen, setIsLyricsPopupOpen] = useState<boolean>(false);

  // Player state
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(180000);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  // Studio Workstation state (for contributors)
  const [studioMetadata, setStudioMetadata] = useState<TTMLMetadata>({
    title: 'Ella Baila Sola',
    artist: 'Eslabon Armado, Peso Pluma',
    spotifyId: '3qhlB30KknSeipLHZaYeKc',
    ytmId: 'lZIAZhbmPvg',
    contributor: 'Bru',
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

  // Audio Engine Instance
  const audioEngineRef = useRef<AudioPlayerEngine | null>(null);
  const studioAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const engine = new AudioPlayerEngine();
    audioEngineRef.current = engine;

    const unsubscribe = engine.subscribe({
      onTimeUpdate: (cur, dur) => {
        setCurrentTimeMs(cur);
        setDurationMs(dur);
      },
      onPlayStateChange: (playing) => {
        setIsPlaying(playing);
      },
      onEnded: () => {
        setIsPlaying(false);
      },
    });

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, []);

  // Handle OAuth Redirect & URL Search Parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check for Discord OAuth redirect token in URL hash
    const redirectToken = parseOAuthRedirectToken();
    if (redirectToken) {
      fetchDiscordUserProfile(redirectToken).then((u) => {
        if (u) {
          setUser(u);
          // If came from redirect, automatically open studio
          setCurrentView('studio');
        }
      });
    }

    // 2. Parse URL parameters (e.g. from Spicetify / YTM extension)
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    const path = window.location.pathname;

    const trackId = params.get('trackId');
    const title = params.get('title');
    const artist = params.get('artist');
    const duration = params.get('duration');

    if (path.includes('/sync') || modeParam === 'studio') {
      setCurrentView('studio');
    } else if (modeParam === 'legal') {
      setCurrentView('legal');
    }

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

      // Match against local featured or construct unified song item
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
        contributor: user?.username || 'Bru',
      };

      setActiveSong(targetSong);

      // If user came via /sync or studio mode, start playback in background workstation without popup obstruction
      if (path.includes('/sync') || modeParam === 'studio') {
        setIsLyricsPopupOpen(false);
        if (audioEngineRef.current) {
          audioEngineRef.current.loadTrack(targetSong.previewUrl, targetSong.durationMs);
          audioEngineRef.current.play().catch(() => {});
        }
        setIsLoadingLyrics(true);
        fetchLyricsForTrack(targetSong)
          .then((doc) => {
            if (doc) {
              setActiveDocument(doc);
              if (doc.lines && doc.lines.length > 0) {
                setStudioLines(doc.lines);
              }
            }
          })
          .finally(() => {
            setIsLoadingLyrics(false);
          });
      } else {
        handlePlaySongCard(targetSong);
      }
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

  // Play Song Card Handler: "just one click on play card. Have your own music player, but make sure the lyrics pop up."
  const handlePlaySongCard = useCallback(async (song: UnifiedSongItem) => {
    setActiveSong(song);
    setIsLyricsPopupOpen(true); // "make sure the lyrics pop up"
    setIsLoadingLyrics(true);

    // Load track and start audio playback
    if (audioEngineRef.current) {
      audioEngineRef.current.loadTrack(song.previewUrl, song.durationMs);
      await audioEngineRef.current.play();
    }

    // Update studio metadata as well
    setStudioMetadata((prev) => ({
      ...prev,
      title: song.title,
      artist: song.artist,
      album: song.album,
      spotifyId: song.spotifyId || undefined,
      ytmId: song.ytmId || undefined,
      durationMs: song.durationMs,
    }));

    // Fetch synchronized lyrics
    try {
      const doc = await fetchLyricsForTrack(song);
      setActiveDocument(doc);
      if (doc && doc.lines && doc.lines.length > 0) {
        setStudioLines(doc.lines);
      }
    } catch {
      setActiveDocument(null);
    } finally {
      setIsLoadingLyrics(false);
    }
  }, []);

  // Audio control callbacks
  const handleTogglePlay = () => {
    if (!audioEngineRef.current) return;
    if (isPlaying) {
      audioEngineRef.current.pause();
    } else {
      audioEngineRef.current.play();
    }
  };

  const handleSeek = (targetMs: number) => {
    setCurrentTimeMs(targetMs);
    if (audioEngineRef.current) {
      audioEngineRef.current.seek(targetMs);
    }
  };

  const handleChangeVolume = (vol: number) => {
    setVolume(vol);
    if (audioEngineRef.current) {
      audioEngineRef.current.setVolume(vol);
    }
  };

  const handleChangePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioEngineRef.current) {
      audioEngineRef.current.setPlaybackRate(rate);
    }
  };

  // Auth callbacks
  const handleSignOut = () => {
    clearUser();
    setUser(null);
    if (currentView === 'studio') {
      setCurrentView('discover');
    }
  };

  const handleAuthSuccess = (authenticatedUser: DiscordUser) => {
    setUser(authenticatedUser);
    setCurrentView('studio');
  };

  return (
    <div className="app-shell">
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
            {/* Intro: "Bru Lyrics. Bru Lyrics." */}
            <HeroIntro
              onSearch={handleSearch}
              isSearching={isSearching}
              totalTracksCount={songs.length}
            />

            {/* Song Card Grid: "just one click on play card" */}
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
                  <span>Bru&apos;s Sync Studio</span>
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
                  setDurationMs(totalDur);
                  setStudioMetadata((prev) => ({ ...prev, durationMs: totalDur }));
                }}
              />

              {/* Pane 2: Syllable Tap-Sync Matrix */}
              <TapSyncMatrix
                lines={studioLines}
                onChangeLines={setStudioLines}
                currentTimeMs={currentTimeMs}
                durationMs={durationMs}
                onSeek={handleSeek}
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

        {currentView === 'legal' && <LegalDocumentation />}
      </main>

      {/* In-Browser Music Player Bar: "Have your own music player" */}
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
      />

      {/* Pop-up Lyrics Overlay: "make sure the lyrics pop up" */}
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
      />

      {/* Discord Authentication Modal */}
      <DiscordAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default App;
