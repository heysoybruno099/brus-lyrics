import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { TTMLLine, TTMLMetadata, TTMLDocument, SubmitLyricsResponse } from '@brus-lyrics/shared-types';
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
import { LogoIcon } from './components/LogoIcon.js';

import { AudioPlayerEngine } from './lib/audio-player-engine.js';
import { SpotifyWebPlayer } from './lib/spotify-web-player.js';
import { YouTubePlayer } from './lib/youtube-player.js';
import {
  getStoredSpotifyToken,
  getStoredSpotifyUser,
  buildSpotifyOAuthUrl,
  exchangeSpotifyCodeForToken,
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
import { serializeStudioToTTML, serializeLinesToLRC, serializeLinesToJSON } from './lib/ttml-serializer.js';
import { getApiBaseUrl, DEFAULT_PRODUCTION_API } from './lib/config.js';
import type { AppViewMode, DiscordUser, SpotifyUserProfile, UnifiedSongItem } from './lib/types.js';

const STUDIO_DRAFT_KEY = 'brus_lyrics_studio_draft';

function getStoredStudioDraft(): { metadata: TTMLMetadata; lines: TTMLLine[]; savedAt: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STUDIO_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

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
  const [studioMetadata, setStudioMetadata] = useState<TTMLMetadata>(() => {
    const draft = getStoredStudioDraft();
    if (draft?.metadata) return draft.metadata;
    return {
      title: 'Ella Baila Sola',
      artist: 'Eslabon Armado, Peso Pluma',
      spotifyId: '3qhlB30KknSeipLHZaYeKc',
      ytmId: '1TVyEcR5pcw',
      contributor: 'Community',
      durationMs: 165600,
    };
  });

  const [studioLines, setStudioLines] = useState<TTMLLine[]>(() => {
    const draft = getStoredStudioDraft();
    if (draft?.lines && draft.lines.length > 0) return draft.lines;
    return [
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
    ];
  });

  // Sync Editor Workstation Save & Export State
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() => {
    const draft = getStoredStudioDraft();
    return draft?.savedAt ? new Date(draft.savedAt).toLocaleTimeString() : null;
  });

  // Player Engine References
  const audioEngineRef = useRef<AudioPlayerEngine | null>(null);
  const studioAudioRef = useRef<HTMLAudioElement | null>(null);
  const spotifyPlayerRef = useRef<SpotifyWebPlayer | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);

  // Synchronized refs to avoid reinitializing audio engines and tearing down connections
  const currentPlaybackSourceRef = useRef(currentPlaybackSource);
  currentPlaybackSourceRef.current = currentPlaybackSource;
  const activeSongRef = useRef(activeSong);
  activeSongRef.current = activeSong;

  // Initialize HTML5 / Synthetic Audio Engine
  useEffect(() => {
    const engine = new AudioPlayerEngine();
    audioEngineRef.current = engine;

    const unsubscribe = engine.subscribe({
      onTimeUpdate: (cur, dur) => {
        if (currentPlaybackSourceRef.current === 'preview') {
          setCurrentTimeMs(cur);
          if (dur > 0) setDurationMs(dur);
        }
      },
      onPlayStateChange: (playing) => {
        if (currentPlaybackSourceRef.current === 'preview') {
          setIsPlaying(playing);
        }
      },
      onEnded: () => {
        if (currentPlaybackSourceRef.current === 'preview') {
          setIsPlaying(false);
        }
      },
    });

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, []);

  // Initialize YouTube IFrame Player (Free Full Track)
  useEffect(() => {
    const yt = new YouTubePlayer({
      onTimeUpdate: (cur, dur) => {
        if (currentPlaybackSourceRef.current === 'youtube') {
          setCurrentTimeMs(cur);
          if (dur > 0) setDurationMs(dur);
        }
      },
      onPlayStateChange: (playing) => {
        if (currentPlaybackSourceRef.current === 'youtube') {
          setIsPlaying(playing);
        }
      },
      onEnded: () => {
        if (currentPlaybackSourceRef.current === 'youtube') {
          setIsPlaying(false);
        }
      },
      onError: (err) => {
        console.warn('[YouTubePlayer] Playback error encountered, falling back to audio engine:', err);
        const song = activeSongRef.current;
        if (currentPlaybackSourceRef.current === 'youtube' && song) {
          setCurrentPlaybackSource('preview');
          if (audioEngineRef.current) {
            audioEngineRef.current.loadTrack(song.previewUrl, song.durationMs);
            audioEngineRef.current.play().catch(() => {});
          }
        }
      },
    });

    youtubePlayerRef.current = yt;
    yt.initialize('yt-player-mount');

    return () => {
      yt.destroy();
    };
  }, []);

  // Initialize Spotify Web Playback SDK if token is present
  useEffect(() => {
    if (!spotifyToken) return;

    const sp = new SpotifyWebPlayer({
      onTimeUpdate: (cur, dur) => {
        if (currentPlaybackSourceRef.current === 'spotify') {
          setCurrentTimeMs(cur);
          if (dur > 0) setDurationMs(dur);
        }
      },
      onPlayStateChange: (playing) => {
        if (currentPlaybackSourceRef.current === 'spotify') {
          setIsPlaying(playing);
        }
      },
      onError: (msg) => {
        // If Spotify error occurs (e.g. non-premium), fallback to YouTube or preview
        const song = activeSongRef.current;
        if (currentPlaybackSourceRef.current === 'spotify' && song?.ytmId) {
          setCurrentPlaybackSource('youtube');
          youtubePlayerRef.current?.loadVideo(song.ytmId, true);
        }
      },
    });

    spotifyPlayerRef.current = sp;
    sp.initialize(spotifyToken);

    return () => {
      sp.disconnect();
    };
  }, [spotifyToken]);

  // Handle OAuth Redirects (Spotify & Discord) and URL Parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    const search = window.location.search;
    const urlParams = new URLSearchParams(search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    const restorePreAuth = () => {
      try {
        const raw = sessionStorage.getItem('brus_spotify_pre_auth');
        if (raw) {
          sessionStorage.removeItem('brus_spotify_pre_auth');
          const data = JSON.parse(raw);
          if (data.currentView) {
            setCurrentView(data.currentView);
          }
          if (data.isLyricsPopupOpen) {
            setIsLyricsPopupOpen(true);
          }
          if (typeof data.timeMs === 'number' && data.timeMs > 0) {
            setCurrentTimeMs(data.timeMs);
          }
          const songToRestore: UnifiedSongItem | null =
            data.song ||
            (data.songId
              ? VERIFIED_FEATURED_TRACKS.find(
                  (s) => s.id === data.songId || s.spotifyId === data.songId
                ) || null
              : null);
          if (songToRestore) {
            setActiveSong(songToRestore);
            if (songToRestore.durationMs > 0) {
              setDurationMs(songToRestore.durationMs);
            }
            fetchLyricsForTrack(songToRestore)
              .then((doc) => {
                if (doc) setActiveDocument(doc);
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Failed to restore pre-auth state:', err);
      }
    };

    // 1. Spotify PKCE Authorization Code redirect check
    if (code && (state === 'spotify_auth' || window.location.pathname.includes('/callback') || !state)) {
      exchangeSpotifyCodeForToken(code).then(async (spAuth) => {
        if (spAuth) {
          setSpotifyToken(spAuth.accessToken);
          const profile = await fetchSpotifyUserProfile(spAuth.accessToken);
          if (profile) {
            setSpotifyUser(profile);
          }
          restorePreAuth();
        }
        window.history.replaceState(null, '', '/');
      });
      return;
    }

    // 1b. Spotify OAuth hash redirect check (legacy implicit grant fallback)
    if (hash.includes('state=spotify_auth')) {
      const spAuth = parseSpotifyOAuthToken();
      if (spAuth) {
        setSpotifyToken(spAuth.accessToken);
        fetchSpotifyUserProfile(spAuth.accessToken).then((profile) => {
          if (profile) {
            setSpotifyUser(profile);
          }
        });
        restorePreAuth();
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

  // Open sync workstation preloaded with track metadata and audio
  const handleOpenStudioWithTrack = useCallback((song: UnifiedSongItem) => {
    setStudioMetadata((prev) => ({
      ...prev,
      title: song.title,
      artist: song.artist,
      album: song.album || undefined,
      spotifyId: song.spotifyId || undefined,
      ytmId: song.ytmId || undefined,
      durationMs: song.durationMs,
    }));
    if (song.durationMs > 0) {
      setDurationMs(song.durationMs);
    }
    setActiveSong(song);
    if (song.previewUrl && audioEngineRef.current) {
      audioEngineRef.current.loadTrack(song.previewUrl, song.durationMs);
    } else {
      resolveTrackPreviewUrl(song.title, song.artist).then((url) => {
        if (url && audioEngineRef.current) {
          audioEngineRef.current.loadTrack(url, song.durationMs);
        }
      });
    }
    setCurrentView('studio');
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

      // Auto-fallback watchdog: if YouTube does not start or fails within 3.5s, switch to preview
      setTimeout(() => {
        if (youtubePlayerRef.current && !youtubePlayerRef.current.getIsPlaying() && audioEngineRef.current) {
          console.warn('[YouTubeWatchdog] YouTube playback not detected within 3.5s, activating audio preview fallback');
          setCurrentPlaybackSource('preview');
          audioEngineRef.current.loadTrack(playableSong.previewUrl, playableSong.durationMs);
          audioEngineRef.current.play().catch(() => {});
        }
      }, 3500);
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

  const handleConnectSpotify = async () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'brus_spotify_pre_auth',
          JSON.stringify({
            song: activeSong || null,
            songId: activeSong?.id || null,
            timeMs: currentTimeMs,
            isLyricsPopupOpen,
            currentView,
          })
        );
      }
      const authUrl = await buildSpotifyOAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      console.error('Failed to initiate Spotify connection:', err);
    }
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

  // Sync Editor Workstation Save & Export Handlers
  const getExportBaseName = () => {
    const raw = `${studioMetadata.artist || 'artist'}_${studioMetadata.title || 'lyrics'}`;
    return raw.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  };

  const handleExportTTML = () => {
    const xml = serializeStudioToTTML(studioMetadata, studioLines);
    downloadFile(xml, `${getExportBaseName()}.ttml`, 'application/xml');
  };

  const handleExportLRC = () => {
    const lrc = serializeLinesToLRC(studioMetadata, studioLines);
    downloadFile(lrc, `${getExportBaseName()}.lrc`, 'text/plain');
  };

  const handleExportJSON = () => {
    const json = serializeLinesToJSON(studioMetadata, studioLines);
    downloadFile(json, `${getExportBaseName()}.json`, 'application/json');
  };

  const handleSaveStudioWork = async () => {
    // 1. Immediately cache locally so no work is ever lost
    try {
      localStorage.setItem(
        STUDIO_DRAFT_KEY,
        JSON.stringify({
          metadata: studioMetadata,
          lines: studioLines,
          savedAt: Date.now(),
        })
      );
      const timeStr = new Date().toLocaleTimeString();
      setLastSavedAt(timeStr);
    } catch {
      // Local storage quota or unavailable
    }

    // 2. If not authenticated, inform the user and open Discord sign-in modal
    if (!user) {
      setSaveStatus({
        type: 'info',
        message: 'Draft saved to browser storage. Sign in with Discord to publish your synchronized lyrics to the catalog.',
      });
      setIsAuthModalOpen(true);
      return;
    }

    // 3. Authenticated: submit to Cloudflare Worker API
    setIsSaving(true);
    setSaveStatus({
      type: 'info',
      message: 'Submitting synchronized lyrics to catalog...',
    });

    const xml = serializeStudioToTTML(studioMetadata, studioLines);
    const duration =
      studioMetadata.durationMs ||
      (studioLines.length > 0 ? studioLines[studioLines.length - 1]!.end : 0);
    const effectiveContributor = user.username || studioMetadata.contributor || 'Community';

    const payload = {
      metadata: {
        title: studioMetadata.title || 'Untitled',
        artist: studioMetadata.artist || 'Unknown Artist',
        album: studioMetadata.album || null,
        durationMs: duration,
        spotifyId: (studioMetadata.platformTarget === 'ytm' ? null : studioMetadata.spotifyId) || null,
        ytmId: (studioMetadata.platformTarget === 'spotify' ? null : studioMetadata.ytmId) || null,
        isrc: studioMetadata.isrc || null,
        contributor: effectiveContributor,
        platformTarget: studioMetadata.platformTarget || 'both',
      },
      platformTarget: studioMetadata.platformTarget || 'both',
      ttmlRaw: xml,
      contributor: effectiveContributor,
    };

    const targetUrl = `${getApiBaseUrl().replace(/\/+$/, '')}/v1/submit`;

    try {
      let response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok && !targetUrl.includes('heysoybruno09')) {
        try {
          const fallbackRes = await fetch(`${DEFAULT_PRODUCTION_API}/v1/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (fallbackRes.ok) response = fallbackRes;
        } catch {
          // Keep primary response
        }
      }

      const data: SubmitLyricsResponse = await response.json();

      if (response.ok && data.success) {
        setSaveStatus({
          type: 'success',
          message: `Saved locally and published as @${effectiveContributor}: ${data.message} (${data.action})`,
        });
      } else {
        setSaveStatus({
          type: 'warning',
          message: `Draft preserved in local storage. Note: ${data.message || 'Submission pending'}`,
        });
      }
    } catch (err: any) {
      setSaveStatus({
        type: 'warning',
        message: `Draft preserved in local storage. Offline note: ${err?.message || 'Network unavailable'}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="app-shell">
      {/* YouTube IFrame Player mount */}
      <div
        id="yt-player-mount"
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: 240,
          height: 180,
          clipPath: 'inset(100%)',
          clip: 'rect(0 0 0 0)',
          pointerEvents: 'none',
          zIndex: -9999,
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
              catalogSongs={songs}
              onQuickPlay={handlePlaySongCard}
              onQuickAdd={handleOpenStudioWithTrack}
            />


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
              onOpenStudio={handleOpenStudioWithTrack}
              isLoading={isSearching}
            />
          </div>
        )}

        {currentView === 'studio' && (
          <div className="studio-container-wrap">
            <div className="workstation-container">
              {/* Top Workstation Header with Logo, High-Contrast Save, and Export Actions */}
              <header className="workstation-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div className="brand-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <LogoIcon size={22} color="#ffffff" />
                  <span>Lyrics Studio</span>
                  <span className="brand-badge">Syllable Workstation</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {lastSavedAt && (
                    <span style={{ fontSize: 11, color: '#71717a', marginRight: 4 }}>
                      Draft saved {lastSavedAt}
                    </span>
                  )}

                  {/* Prominent High-Contrast Primary Save Button */}
                  <button
                    type="button"
                    onClick={handleSaveStudioWork}
                    disabled={isSaving}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: '#ffffff',
                      color: '#09090b',
                      fontWeight: 700,
                      fontSize: 13,
                      padding: '8px 18px',
                      borderRadius: 6,
                      border: '1px solid #ffffff',
                      cursor: isSaving ? 'wait' : 'pointer',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.15s ease',
                    }}
                    title="Save draft locally and publish to catalog"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </button>

                  {/* Quick Export Button Group */}
                  <div style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #2e2e38' }}>
                    <button
                      type="button"
                      onClick={handleExportTTML}
                      style={{
                        backgroundColor: '#18181f',
                        color: '#e4e4e7',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '8px 12px',
                        border: 'none',
                        borderRight: '1px solid #2e2e38',
                        cursor: 'pointer',
                      }}
                      title="Download Apple Music TTML XML file"
                    >
                      Export TTML
                    </button>
                    <button
                      type="button"
                      onClick={handleExportLRC}
                      style={{
                        backgroundColor: '#18181f',
                        color: '#e4e4e7',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '8px 12px',
                        border: 'none',
                        borderRight: '1px solid #2e2e38',
                        cursor: 'pointer',
                      }}
                      title="Download Synced LRC file"
                    >
                      Export LRC
                    </button>
                    <button
                      type="button"
                      onClick={handleExportJSON}
                      style={{
                        backgroundColor: '#18181f',
                        color: '#e4e4e7',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '8px 12px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      title="Download JSON format lyrics"
                    >
                      Export JSON
                    </button>
                  </div>

                  {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                      <span className="header-status">
                        Contributor: <strong style={{ color: '#f4f4f6' }}>@{user.username}</strong>
                      </span>
                      <span className="brand-badge" style={{ color: '#4ade80' }}>
                        VERIFIED
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="brand-badge"
                      style={{ cursor: 'pointer', background: '#1c1c24', color: '#a1a1aa', border: '1px solid #33333d', marginLeft: 8 }}
                      onClick={() => setIsAuthModalOpen(true)}
                    >
                      Sign in to Publish
                    </button>
                  )}
                </div>
              </header>

              {/* Status Banner / Toast */}
              {saveStatus && (
                <div
                  style={{
                    margin: '12px 0',
                    padding: '10px 16px',
                    borderRadius: 6,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor:
                      saveStatus.type === 'success'
                        ? '#052e16'
                        : saveStatus.type === 'warning'
                        ? '#271d05'
                        : '#18181f',
                    border: `1px solid ${
                      saveStatus.type === 'success'
                        ? '#15803d'
                        : saveStatus.type === 'warning'
                        ? '#a16207'
                        : '#3b82f6'
                    }`,
                    color:
                      saveStatus.type === 'success'
                        ? '#86efac'
                        : saveStatus.type === 'warning'
                        ? '#fde047'
                        : '#93c5fd',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                      <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
                    </svg>
                    <span>{saveStatus.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSaveStatus(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      fontSize: 14,
                      opacity: 0.7,
                    }}
                    aria-label="Dismiss notice"
                  >
                    ×
                  </button>
                </div>
              )}

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

      {/* Universal Footer with Terms of Service, Privacy Policy, and Logo */}
      <footer className="site-footer" style={{ padding: '24px 20px', borderTop: '1px solid #1c1c24', backgroundColor: '#0d0d11', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <LogoIcon size={18} color="#ffffff" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f6' }}>Lyrics</span>
          </div>
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
              Privacy Policy
            </a>
            <span style={{ color: '#52525b' }}>•</span>
            <a
              href="https://github.com/heysoybruno099/brus-lyrics"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#a1a1aa', textDecoration: 'underline' }}
            >
              Extension Downloads (GitHub)
            </a>
            <span style={{ color: '#52525b' }}>•</span>
            <a
              href="https://discord.gg/aCxGMH8KrN"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#a1a1aa', textDecoration: 'underline' }}
            >
              Discord Community
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
        onOpenStudio={handleOpenStudioWithTrack}
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
