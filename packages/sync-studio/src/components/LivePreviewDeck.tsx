import React, { useRef, useEffect, useState } from 'react';
import { BrusLyricsRenderer } from '@brus-lyrics/ttml-engine';
import type { TTMLLine, TTMLMetadata, SubmitLyricsResponse } from '@brus-lyrics/shared-types';
import { serializeStudioToTTML, linesToTTMLDocument } from '../lib/ttml-serializer.js';

interface LivePreviewDeckProps {
  metadata: TTMLMetadata;
  lines: TTMLLine[];
  currentTimeMs: number;
  onSeek: (ms: number) => void;
  apiBaseUrl?: string;
}

export const LivePreviewDeck: React.FC<LivePreviewDeckProps> = ({
  metadata,
  lines,
  currentTimeMs,
  onSeek,
  apiBaseUrl = 'http://127.0.0.1:8787',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<BrusLyricsRenderer | null>(null);
  const currentTimeRef = useRef<number>(currentTimeMs);
  const [publishStatus, setPublishStatus] = useState<{
    type: 'success' | 'error' | 'loading' | null;
    message: string;
  }>({ type: null, message: '' });

  useEffect(() => {
    currentTimeRef.current = currentTimeMs;
    if (rendererRef.current) {
      rendererRef.current.setCurrentTimeMs(currentTimeMs);
    }
  }, [currentTimeMs]);

  // Initialize renderer on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new BrusLyricsRenderer(mountRef.current, {
      getCurrentTimeMs: () => currentTimeRef.current,
      onSeek: (timestampMs) => onSeek(timestampMs),
      enableAmbient: true,
      enableSpringScroll: true,
      targetHeightRatio: 0.35,
    });

    rendererRef.current = renderer;
    renderer.play();

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // Update renderer document when lines or metadata change
  useEffect(() => {
    if (!rendererRef.current) return;
    const doc = linesToTTMLDocument(metadata, lines);
    rendererRef.current.setDocument(doc);
  }, [lines, metadata]);

  // Handle Download .TTML File
  const handleDownloadTTML = () => {
    const xml = serializeStudioToTTML(metadata, lines);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const primaryId =
      metadata.spotifyId ||
      metadata.ytmId ||
      `${metadata.artist || 'artist'}_${metadata.title || 'song'}`.replace(/\s+/g, '_').toLowerCase();

    link.href = url;
    link.download = `${primaryId}.ttml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle Publish to Bru's Lyrics API
  const handlePublish = async () => {
    setPublishStatus({ type: 'loading', message: 'Submitting to API...' });

    const xml = serializeStudioToTTML(metadata, lines);
    const duration = metadata.durationMs || (lines.length > 0 ? lines[lines.length - 1]!.end : 0);

    const payload = {
      metadata: {
        title: metadata.title || 'Untitled',
        artist: metadata.artist || 'Unknown Artist',
        durationMs: duration,
        spotifyId: metadata.spotifyId || null,
        ytmId: metadata.ytmId || null,
        isrc: metadata.isrc || null,
        contributor: metadata.contributor || 'community',
      },
      ttmlRaw: xml,
      contributor: metadata.contributor || 'community',
    };

    try {
      const response = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/v1/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data: SubmitLyricsResponse = await response.json();

      if (!response.ok || !data.success) {
        setPublishStatus({
          type: 'error',
          message: data.message || `Failed with status ${response.status}`,
        });
      } else {
        setPublishStatus({
          type: 'success',
          message: `Published successfully: ${data.message} (${data.action})`,
        });
      }
    } catch (err: any) {
      setPublishStatus({
        type: 'error',
        message: err?.message || 'Network connection failed',
      });
    }
  };

  return (
    <div className="deck-pane right-pane" style={{ width: 420 }}>
      <div className="pane-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pane-title">Live 60FPS Render</span>
          <span className="brand-badge">Deck 3</span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#98c379' }}>
          Renderer Active
        </span>
      </div>

      {/* Embedded DOM Renderer Mount */}
      <div
        ref={mountRef}
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#0a0a0c',
          overflow: 'hidden',
        }}
      />

      {/* Action Publish Controls */}
      <div
        style={{
          padding: 16,
          backgroundColor: '#141418',
          borderTop: '1px solid #26262e',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={handleDownloadTTML}
          >
            Download .TTML File
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handlePublish}
          >
            Publish to API
          </button>
        </div>

        {publishStatus.type && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 3,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              backgroundColor:
                publishStatus.type === 'success'
                  ? 'var(--success-subtle)'
                  : publishStatus.type === 'error'
                  ? 'var(--danger-subtle)'
                  : '#1b1b24',
              color:
                publishStatus.type === 'success'
                  ? 'var(--success-text)'
                  : publishStatus.type === 'error'
                  ? 'var(--danger-text)'
                  : '#f4f4f6',
              border: '1px solid #26262e',
              wordBreak: 'break-word',
            }}
          >
            {publishStatus.message}
          </div>
        )}
      </div>
    </div>
  );
};
