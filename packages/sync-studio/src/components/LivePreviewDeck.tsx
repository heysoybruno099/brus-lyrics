import React, { useRef, useEffect, useState } from 'react';
import { BrusLyricsRenderer } from '@brus-lyrics/ttml-engine';
import type { TTMLLine, TTMLMetadata, SubmitLyricsResponse } from '@brus-lyrics/shared-types';
import { serializeStudioToTTML, linesToTTMLDocument } from '../lib/ttml-serializer.js';
import { getApiBaseUrl, DEFAULT_PRODUCTION_API } from '../lib/config.js';
import type { DiscordUser } from '../lib/types.js';

interface LivePreviewDeckProps {
  metadata: TTMLMetadata;
  lines: TTMLLine[];
  currentTimeMs: number;
  onSeek: (ms: number) => void;
  apiBaseUrl?: string;
  user?: DiscordUser | null;
  onRequireAuth?: () => void;
}

export const LivePreviewDeck: React.FC<LivePreviewDeckProps> = ({
  metadata,
  lines,
  currentTimeMs,
  onSeek,
  apiBaseUrl = getApiBaseUrl(),
  user = null,
  onRequireAuth,
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

  // Handle Publish to BruLyrics API
  const handlePublish = async () => {
    setPublishStatus({ type: 'loading', message: 'Submitting lyrics to catalog...' });

    const xml = serializeStudioToTTML(metadata, lines);
    const duration = metadata.durationMs || (lines.length > 0 ? lines[lines.length - 1]!.end : 180000);
    const effectiveContributor = user?.username ? `@${user.username}` : (metadata.contributor || 'Community');

    const payload = {
      metadata: {
        title: metadata.title || 'Untitled',
        artist: metadata.artist || 'Unknown Artist',
        durationMs: duration,
        spotifyId: (metadata.platformTarget === 'ytm' ? null : metadata.spotifyId) || null,
        ytmId: (metadata.platformTarget === 'spotify' ? null : metadata.ytmId) || null,
        isrc: metadata.isrc || null,
        contributor: effectiveContributor,
        platformTarget: metadata.platformTarget || 'both',
      },
      platformTarget: metadata.platformTarget || 'both',
      ttmlRaw: xml,
      contributor: effectiveContributor,
    };

    const targetUrl = `${apiBaseUrl.replace(/\/+$/, '')}/v1/submit`;
    const submitHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (user) {
      submitHeaders['X-Admin-User'] = user.username;
      submitHeaders['X-Admin-Id'] = user.id;
    }

    try {
      let response = await fetch(targetUrl, {
        method: 'POST',
        headers: submitHeaders,
        body: JSON.stringify(payload),
      });

      // If initial target failed and wasn't already production, attempt production worker
      if (!response.ok && !targetUrl.includes('heysoybruno09')) {
        try {
          const fallbackResponse = await fetch(`${DEFAULT_PRODUCTION_API}/v1/submit`, {
            method: 'POST',
            headers: submitHeaders,
            body: JSON.stringify(payload),
          });
          if (fallbackResponse.ok) {
            response = fallbackResponse;
          }
        } catch {
          // Keep original response
        }
      }

      const data: SubmitLyricsResponse = await response.json();

      if (!response.ok || !data.success) {
        setPublishStatus({
          type: 'error',
          message: data.message || `Failed with status ${response.status}`,
        });
      } else {
        setPublishStatus({
          type: 'success',
          message: `Published successfully as @${effectiveContributor}: ${data.message} (${data.action})`,
        });
      }
    } catch (err: any) {
      // Try production fallback on network exception
      if (!targetUrl.includes('heysoybruno09')) {
        try {
          const fallbackRes = await fetch(`${DEFAULT_PRODUCTION_API}/v1/submit`, {
            method: 'POST',
            headers: submitHeaders,
            body: JSON.stringify(payload),
          });
          const data: SubmitLyricsResponse = await fallbackRes.json();
          if (fallbackRes.ok && data.success) {
            setPublishStatus({
              type: 'success',
              message: `Published successfully as @${effectiveContributor}: ${data.message} (${data.action})`,
            });
            return;
          }
        } catch {
          // Fall through
        }
      }

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
