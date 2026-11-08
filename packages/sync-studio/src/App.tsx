import React, { useState, useRef, useEffect } from 'react';
import type { TTMLLine, TTMLMetadata } from '@brus-lyrics/shared-types';
import { AudioMetadataDeck } from './components/AudioMetadataDeck.js';
import { TapSyncMatrix } from './components/TapSyncMatrix.js';
import { LivePreviewDeck } from './components/LivePreviewDeck.js';

export const App: React.FC = () => {
  const [metadata, setMetadata] = useState<TTMLMetadata>({
    title: 'Ella Baila Sola',
    artist: 'Eslabon Armado, Peso Pluma',
    spotifyId: '3qhlB30KknSeipLHZaYeKc',
    ytmId: 'lZIA_sVvj5Y',
    contributor: 'bruno',
    durationMs: 165000,
  });

  const [lines, setLines] = useState<TTMLLine[]>([
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
        { begin: 17500, end: 18200, text: 'parece' },
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

  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(165000);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Parse URL search params if opened from Spicetify or YTM extension
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const title = params.get('title');
    const artist = params.get('artist');
    const trackId = params.get('trackId');
    const duration = params.get('duration');

    if (title || artist || trackId) {
      setMetadata((prev) => ({
        ...prev,
        ...(title ? { title } : {}),
        ...(artist ? { artist } : {}),
        ...(trackId ? { spotifyId: trackId } : {}),
        ...(duration ? { durationMs: parseInt(duration, 10) } : {}),
      }));
      if (duration) {
        setDurationMs(parseInt(duration, 10));
      }
    }
  }, []);

  // Sync animation loop with audio element
  const syncLoop = () => {
    if (audioRef.current && !audioRef.current.paused) {
      const curMs = Math.round(audioRef.current.currentTime * 1000);
      setCurrentTimeMs(curMs);
      animFrameRef.current = requestAnimationFrame(syncLoop);
    }
  };

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        animFrameRef.current = requestAnimationFrame(syncLoop);
      }).catch((e) => {
        console.warn('Playback error (e.g. no audio loaded yet):', e.message);
        // Simulate playback if no audio file loaded
        setIsPlaying(true);
      });
    }
  };

  const handleSeek = (targetMs: number) => {
    setCurrentTimeMs(targetMs);
    if (audioRef.current) {
      audioRef.current.currentTime = targetMs / 1000;
    }
  };

  const handleChangePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleAudioLoaded = (file: File, totalDurationMs: number) => {
    if (audioRef.current) {
      const objUrl = URL.createObjectURL(file);
      audioRef.current.src = objUrl;
      audioRef.current.load();
    }
    setDurationMs(totalDurationMs);
    setMetadata((prev) => ({ ...prev, durationMs: totalDurationMs }));
  };

  return (
    <div className="workstation-container">
      {/* Hidden audio element for audio decoding and playback */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTimeMs(Math.round(audioRef.current.currentTime * 1000));
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        }}
      />

      {/* Workstation Top Header */}
      <header className="workstation-header">
        <div className="brand-title">
          <span>Bru&apos;s Sync Studio</span>
          <span className="brand-badge">Syllable Workstation</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="header-status">
            API Target: <strong style={{ color: '#f4f4f6' }}>127.0.0.1:8787</strong>
          </span>
          <span className="brand-badge" style={{ color: '#98c379' }}>
            Ready
          </span>
        </div>
      </header>

      {/* Pane 1: Audio & Metadata Deck (280px) */}
      <AudioMetadataDeck
        metadata={metadata}
        onChangeMetadata={(meta) => setMetadata((prev) => ({ ...prev, ...meta }))}
        audioRef={audioRef}
        currentTimeMs={currentTimeMs}
        durationMs={durationMs}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        playbackRate={playbackRate}
        onChangePlaybackRate={handleChangePlaybackRate}
        onAudioLoaded={handleAudioLoaded}
      />

      {/* Pane 2: Syllable Tap-Sync Matrix (Flexible) */}
      <TapSyncMatrix
        lines={lines}
        onChangeLines={setLines}
        currentTimeMs={currentTimeMs}
        durationMs={durationMs}
        onSeek={handleSeek}
      />

      {/* Pane 3: Live 60FPS Render Preview & One-Click Publish (420px) */}
      <LivePreviewDeck
        metadata={metadata}
        lines={lines}
        currentTimeMs={currentTimeMs}
        onSeek={handleSeek}
      />
    </div>
  );
};

export default App;
