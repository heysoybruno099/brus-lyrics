import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cleanTrackId, formatTimestampTTML, type TTMLMetadata } from '@brus-lyrics/shared-types';
import { VERIFIED_FEATURED_TRACKS } from '../lib/spotify-service.js';
import { getApiBaseUrl } from '../lib/config.js';

interface AudioMetadataDeckProps {
  metadata: TTMLMetadata;
  onChangeMetadata: (meta: Partial<TTMLMetadata>) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
  onAudioLoaded: (file: File, durationMs: number) => void;
}

interface IdSuggestion {
  id: string;
  title: string;
  artist: string;
  spotifyId?: string | null;
  ytmId?: string | null;
  durationMs?: number;
  album?: string;
  source: 'catalog' | 'spotify';
}

export const AudioMetadataDeck: React.FC<AudioMetadataDeckProps> = ({
  metadata,
  onChangeMetadata,
  currentTimeMs,
  durationMs,
  isPlaying,
  onTogglePlay,
  onSeek,
  playbackRate,
  onChangePlaybackRate,
  onAudioLoaded,
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic ID Lookup State
  const [suggestions, setSuggestions] = useState<IdSuggestion[]>([]);
  const [isSearchingIds, setIsSearchingIds] = useState<boolean>(false);
  const [hasDismissedSuggestions, setHasDismissedSuggestions] = useState<boolean>(false);

  const handleFileDrop = async (file: File) => {
    if (!file) return;
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const totalMs = Math.round(decodedBuffer.duration * 1000);
      onAudioLoaded(file, totalMs);

      // Compute waveform peaks (100 bins)
      const rawData = decodedBuffer.getChannelData(0);
      const samples = 100;
      const blockSize = Math.floor(rawData.length / samples);
      const peaks: number[] = [];

      for (let i = 0; i < samples; i++) {
        const start = i * blockSize;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[start + j] || 0);
        }
        peaks.push(Math.min(1, (sum / blockSize) * 2.5));
      }
      setWaveformPeaks(peaks);
    } catch (err) {
      console.error('[AudioDeck] Failed to decode audio file:', err);
    }
  };

  // Draw waveform canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#141418';
    ctx.fillRect(0, 0, width, height);

    const peaks = waveformPeaks.length > 0 ? waveformPeaks : Array(80).fill(0.15);
    const progressRatio = durationMs > 0 ? currentTimeMs / durationMs : 0;
    const barWidth = width / peaks.length;

    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i]!;
      const barHeight = Math.max(4, peak * (height - 8));
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      const isPast = i / peaks.length <= progressRatio;

      ctx.fillStyle = isPast ? '#f4f4f6' : '#2e2e38';
      ctx.fillRect(x + 1, y, Math.max(1, barWidth - 1), barHeight);
    }

    // Draw Scrubber Line
    const playheadX = progressRatio * width;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(playheadX - 1, 0, 2, height);
  }, [waveformPeaks, currentTimeMs, durationMs]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || durationMs <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(Math.round(ratio * durationMs));
  };

  // Automatic Dynamic ID Lookup based on Track Title and Artist Name
  useEffect(() => {
    const title = (metadata.title || '').trim();
    const artist = (metadata.artist || '').trim();

    if (title.length < 2 && artist.length < 2) {
      setSuggestions([]);
      setIsSearchingIds(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingIds(true);
      const query = `${title} ${artist}`.trim().toLowerCase();
      const results: IdSuggestion[] = [];
      const seenKeys = new Set<string>();

      // 1. Search verified catalog songs (both local featured and remote catalog)
      const catalogMatches = VERIFIED_FEATURED_TRACKS.filter((t) => {
        const tTitle = t.title.toLowerCase();
        const tArtist = t.artist.toLowerCase();
        return (
          (title.length >= 2 && tTitle.includes(title.toLowerCase())) ||
          (artist.length >= 2 && tArtist.includes(artist.toLowerCase())) ||
          tTitle.includes(query) ||
          tArtist.includes(query)
        );
      });

      for (const m of catalogMatches.slice(0, 4)) {
        const key = `${m.title.toLowerCase()}::${m.artist.toLowerCase()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          results.push({
            id: m.id,
            title: m.title,
            artist: m.artist,
            spotifyId: m.spotifyId,
            ytmId: m.ytmId,
            durationMs: m.durationMs,
            album: m.album,
            source: 'catalog',
          });
        }
      }

      const apiBase = getApiBaseUrl().replace(/\/+$/, '');

      // Also query verified remote catalog via API
      try {
        const catRes = await fetch(`${apiBase}/v1/catalog?q=${encodeURIComponent(query)}&limit=5`);
        if (catRes.ok) {
          const catData = (await catRes.json()) as any;
          for (const s of catData.songs || []) {
            const key = `${s.title.toLowerCase()}::${s.artist.toLowerCase()}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              results.push({
                id: s.id,
                title: s.title,
                artist: s.artist,
                spotifyId: s.spotify_id,
                ytmId: s.ytm_id,
                durationMs: s.duration_ms,
                source: 'catalog',
              });
            }
          }
        }
      } catch {
        // Fallback
      }

      // 2. Query API Worker Spotify Search for live Spotify Track IDs
      try {
        const res = await fetch(`${apiBase}/v1/spotify/search?q=${encodeURIComponent(query)}&limit=4`);
        if (res.ok) {
          const data = (await res.json()) as any;
          for (const item of data.tracks || []) {
            const key = `${item.title.toLowerCase()}::${item.artist.toLowerCase()}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              results.push({
                id: `spot_${item.id}`,
                title: item.title,
                artist: item.artist,
                spotifyId: item.id,
                ytmId: null,
                durationMs: item.durationMs,
                album: item.album,
                source: 'spotify',
              });
            }
          }
        }
      } catch {
        // Network fallback
      }

      // 3. For any track missing ytmId, look up YouTube video ID
      await Promise.all(
        results.slice(0, 4).map(async (item) => {
          if (!item.ytmId) {
            try {
              const ytQuery = `${item.title} ${item.artist}`.trim();
              const ytRes = await fetch(`${apiBase}/v1/youtube/search?q=${encodeURIComponent(ytQuery)}`);
              if (ytRes.ok) {
                const ytData = (await ytRes.json()) as any;
                if (ytData.results && ytData.results.length > 0 && ytData.results[0].id) {
                  item.ytmId = ytData.results[0].id;
                }
              }
            } catch {
              // Ignore failure
            }
          }
        })
      );

      setSuggestions(results.slice(0, 6));
      setIsSearchingIds(false);
      setHasDismissedSuggestions(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [metadata.title, metadata.artist]);

  const platformTarget = metadata.platformTarget || 'both';

  const handleApplySuggestion = (s: IdSuggestion) => {
    const newMeta: Partial<TTMLMetadata> = {
      title: s.title,
      artist: s.artist,
      ...(s.durationMs ? { durationMs: s.durationMs } : {}),
      ...(s.album ? { album: s.album } : {}),
    };

    if (platformTarget === 'spotify') {
      if (s.spotifyId) newMeta.spotifyId = s.spotifyId;
      newMeta.ytmId = undefined;
    } else if (platformTarget === 'ytm') {
      if (s.ytmId) newMeta.ytmId = s.ytmId;
      newMeta.spotifyId = undefined;
    } else {
      if (s.spotifyId) newMeta.spotifyId = s.spotifyId;
      if (s.ytmId) newMeta.ytmId = s.ytmId;
    }

    onChangeMetadata(newMeta);
    setHasDismissedSuggestions(true);
  };

  const handleApplySpotifyId = (spotifyId: string) => {
    onChangeMetadata({ spotifyId: cleanTrackId(spotifyId) });
  };

  const handleApplyYtmId = (ytmId: string) => {
    onChangeMetadata({ ytmId: cleanTrackId(ytmId) });
  };

  return (
    <div className="deck-pane" style={{ width: 280 }}>
      <div className="pane-header">
        <span className="pane-title">Audio & Metadata</span>
        <span className="brand-badge">Deck 1</span>
      </div>

      <div className="pane-scrollable">
        {/* Audio File Dropzone */}
        <div className="form-field">
          <label className="form-label">Audio Source (.mp3, .wav, .flac)</label>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".mp3,.wav,.flac,.ogg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileDrop(file);
            }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFileDrop(file);
            }}
            style={{
              padding: '16px 12px',
              border: '1px dashed #26262e',
              borderRadius: 3,
              backgroundColor: '#0a0a0c',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#f4f4f6', fontWeight: 600 }}>
              {fileName ? fileName : 'Drop Audio or Click to Select'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#5e5e68', marginTop: 4 }}>
              MP3, WAV, FLAC, OGG supported
            </div>
          </div>
        </div>

        {/* Waveform Scrubber */}
        <div className="form-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label">Waveform Scrubber</label>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#9e9ea8' }}>
              {formatTimestampTTML(currentTimeMs)} / {formatTimestampTTML(durationMs)}
            </span>
          </div>
          <canvas
            ref={canvasRef}
            width={248}
            height={60}
            onClick={handleCanvasClick}
            style={{
              width: '100%',
              height: 60,
              borderRadius: 3,
              border: '1px solid #26262e',
              cursor: 'crosshair',
            }}
          />
        </div>

        {/* Playback Controls & Speed Selector */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={onTogglePlay}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>

        <div className="form-field">
          <label className="form-label">Playback Speed</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {([0.5, 0.75, 1.0] as const).map((rate) => (
              <button
                key={rate}
                className={`btn ${playbackRate === rate ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '6px 0', fontSize: 10 }}
                onClick={() => onChangePlaybackRate(rate)}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Metadata Inputs */}
        <div style={{ borderTop: '1px solid #26262e', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-field">
            <label className="form-label">Track Title</label>
            <input
              className="text-input"
              value={metadata.title || ''}
              onChange={(e) => onChangeMetadata({ title: e.target.value })}
              placeholder="e.g. Ella Baila Sola"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Artist Name</label>
            <input
              className="text-input"
              value={metadata.artist || ''}
              onChange={(e) => onChangeMetadata({ artist: e.target.value })}
              placeholder="e.g. Eslabon Armado, Peso Pluma"
            />
          </div>

          {/* Platform Target Selector */}
          <div className="form-field">
            <label className="form-label">Platform Target</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['both', 'spotify', 'ytm'] as const).map((plat) => {
                const active = platformTarget === plat;
                const label = plat === 'both' ? 'Both' : plat === 'spotify' ? 'Spotify' : 'YouTube';
                return (
                  <button
                    key={plat}
                    type="button"
                    className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 600 }}
                    onClick={() => onChangeMetadata({ platformTarget: plat })}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: '#71717a', marginTop: 4, lineHeight: 1.4 }}>
              {platformTarget === 'both' && 'Synchronized for both Spotify and YouTube tracks.'}
              {platformTarget === 'spotify' && 'Targeted for Spotify timing (audio edits differ on YouTube).'}
              {platformTarget === 'ytm' && 'Targeted for YouTube Music timing (audio edits differ on Spotify).'}
            </div>
          </div>

          {/* Dynamic Track ID Suggestions */}
          {suggestions.length > 0 && !hasDismissedSuggestions && (
            <div
              style={{
                backgroundColor: '#121217',
                border: '1px solid #27272f',
                borderRadius: 6,
                padding: '10px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#e4e4e7' }}>
                  Suggested IDs ({suggestions.length})
                </span>
                <button
                  type="button"
                  onClick={() => setHasDismissedSuggestions(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#71717a',
                    fontSize: 10,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Dismiss
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      padding: '7px 8px',
                      backgroundColor: '#18181f',
                      border: '1px solid #27272f',
                      borderRadius: 4,
                      fontSize: 11,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleApplySuggestion(s)}
                      title="Click to populate all track metadata"
                    >
                      <div style={{ fontWeight: 600, color: '#f4f4f6', lineHeight: 1.2 }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: 10, color: '#a1a1aa' }}>
                        {s.artist}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                      {s.spotifyId && (
                        <button
                          type="button"
                          onClick={() => handleApplySpotifyId(s.spotifyId!)}
                          title="Click to populate Spotify ID"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '2px 6px',
                            backgroundColor: '#1db95420',
                            border: '1px solid #1db95440',
                            borderRadius: 3,
                            color: '#1db954',
                            fontSize: 9,
                            fontFamily: 'var(--font-mono)',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          <span>Spotify: {s.spotifyId.slice(0, 8)}...</span>
                        </button>
                      )}

                      {s.ytmId && (
                        <button
                          type="button"
                          onClick={() => handleApplyYtmId(s.ytmId!)}
                          title="Click to populate YouTube ID"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '2px 6px',
                            backgroundColor: '#ff000020',
                            border: '1px solid #ff000040',
                            borderRadius: 3,
                            color: '#f87171',
                            fontSize: 9,
                            fontFamily: 'var(--font-mono)',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          <span>YTM: {s.ytmId}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isSearchingIds && (
            <div style={{ fontSize: 10, color: '#71717a', fontStyle: 'italic' }}>
              Searching Spotify and verified catalog for track IDs...
            </div>
          )}

          {/* Spotify ID Field */}
          {platformTarget !== 'ytm' && (
            <div className="form-field">
              <label className="form-label">Spotify Track ID / Link</label>
              <input
                className="text-input"
                value={metadata.spotifyId || ''}
                onChange={(e) => onChangeMetadata({ spotifyId: cleanTrackId(e.target.value) })}
                placeholder="3qhlB30KknSeipLHZaYeKc"
              />
            </div>
          )}

          {/* YouTube Video ID Field */}
          {platformTarget !== 'spotify' && (
            <div className="form-field">
              <label className="form-label">YouTube Video ID / Link</label>
              <input
                className="text-input"
                value={metadata.ytmId || ''}
                onChange={(e) => onChangeMetadata({ ytmId: cleanTrackId(e.target.value) })}
                placeholder="lZIA_sVvj5Y"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
