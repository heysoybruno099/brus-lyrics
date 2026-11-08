import React, { useRef, useState, useEffect } from 'react';
import { cleanTrackId, formatTimestampTTML, type TTMLMetadata } from '@brus-lyrics/shared-types';

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

          <div className="form-field">
            <label className="form-label">Spotify Track ID / Link</label>
            <input
              className="text-input"
              value={metadata.spotifyId || ''}
              onChange={(e) => onChangeMetadata({ spotifyId: cleanTrackId(e.target.value) })}
              placeholder="3qhlB30KknSeipLHZaYeKc"
            />
          </div>

          <div className="form-field">
            <label className="form-label">YouTube Video ID / Link</label>
            <input
              className="text-input"
              value={metadata.ytmId || ''}
              onChange={(e) => onChangeMetadata({ ytmId: cleanTrackId(e.target.value) })}
              placeholder="lZIA_sVvj5Y"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Contributor Name</label>
            <input
              className="text-input"
              value={metadata.contributor || ''}
              onChange={(e) => onChangeMetadata({ contributor: e.target.value })}
              placeholder="Your username"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
