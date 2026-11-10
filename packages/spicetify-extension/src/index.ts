import { cleanTrackId } from '@brus-lyrics/shared-types';
import { BrusLyricsRenderer, parseTTML } from '@brus-lyrics/ttml-engine';
import { extractAlbumColors } from './color-extractor.js';
import { fetchLyrics, DEFAULT_API_BASE } from './api-client.js';
import type { SpicetifyGlobal } from './types.js';

declare const Spicetify: SpicetifyGlobal | undefined;

const STUDIO_BASE_URL = 'https://brus-lyrics.pages.dev';

interface ResolvedTrack {
  rawTrackId: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  durationMs?: number;
  imageUrl?: string;
}

class BrusSpicetifyExtension {
  private apiBase: string = DEFAULT_API_BASE;
  private renderer: BrusLyricsRenderer | null = null;
  private rootElement: HTMLElement | null = null;
  private blurImageEl: HTMLElement | null = null;
  private glow1El: HTMLElement | null = null;
  private glow2El: HTMLElement | null = null;
  private topBarEl: HTMLElement | null = null;
  private sourceBadgeEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private artistEl: HTMLElement | null = null;
  private studioBtnEl: HTMLAnchorElement | null = null;
  private fullscreenBtnEl: HTMLButtonElement | null = null;
  private currentTrackUri: string | null = null;
  private lyricsContainerEl: HTMLElement | null = null;
  private isOpen: boolean = false;
  private isFullscreen: boolean = false;
  private topbarBtn: any = null;
  private playbarBtn: HTMLButtonElement | null = null;
  private playbarObserver: MutationObserver | null = null;

  public init(): void {
    if (typeof window === 'undefined') return;

    this.injectStyles();
    this.createDom();
    this.attachPlayerHooks();
    this.setupTopbarButton();
    this.setupPlaybarButton();
    this.setupKeyboardShortcuts();

    window.addEventListener('resize', () => {
      if (this.isOpen) {
        this.updateOverlayBounds();
      }
    });

    // Initial check for currently playing track
    const initialTrack = this.resolveCurrentTrack();
    if (initialTrack) {
      this.onTrackChange(initialTrack);
    }
  }

  private injectStyles(): void {
    if (document.getElementById('brus-spicetify-styles')) return;

    const style = document.createElement('style');
    style.id = 'brus-spicetify-styles';
    style.textContent = `
      :root {
        --brus-bg: #08080a;
        --brus-text: #f4f4f6;
        --brus-muted: #8e8e98;
        --brus-border: rgba(255, 255, 255, 0.08);
      }

      /* Full Window Overlay - Positioned safely between Spotify top bar and bottom player bar */
      .brus-spotify-wrapper {
        position: fixed !important;
        top: var(--top-bar-height, 64px) !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 90px !important;
        width: 100vw !important;
        height: calc(100vh - var(--top-bar-height, 64px) - 90px) !important;
        z-index: 9999 !important;
        display: none;
        flex-direction: column;
        background-color: var(--brus-bg);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        overflow: hidden;
        box-sizing: border-box;
        animation: brusFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .brus-spotify-wrapper.is-fullscreen {
        top: 0 !important;
        bottom: 0 !important;
        height: 100vh !important;
      }

      .brus-spotify-wrapper.is-open {
        display: flex !important;
      }

      @keyframes brusFadeIn {
        from { opacity: 0; transform: scale(0.995); }
        to { opacity: 1; transform: scale(1); }
      }

      /* Dynamic Album Art Blur Backdrop */
      .brus-album-backdrop {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
        z-index: 1;
      }

      .brus-album-blur-image {
        position: absolute;
        top: -30%;
        left: -30%;
        width: 160%;
        height: 160%;
        background-size: cover;
        background-position: center center;
        background-repeat: no-repeat;
        filter: blur(80px) saturate(2.2) brightness(0.28);
        transform: scale(1.15);
        transition: background-image 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease;
        will-change: transform, filter;
        opacity: 0;
      }

      .brus-album-vignette {
        position: absolute;
        inset: 0;
        background: 
          radial-gradient(circle at 50% 40%, rgba(8, 8, 10, 0.2) 0%, rgba(8, 8, 10, 0.82) 75%, rgba(8, 8, 10, 0.98) 100%),
          linear-gradient(180deg, rgba(8, 8, 10, 0.85) 0%, rgba(8, 8, 10, 0.15) 25%, rgba(8, 8, 10, 0.75) 80%, rgba(8, 8, 10, 0.98) 100%);
      }

      .brus-ambient-glow {
        position: absolute;
        border-radius: 50%;
        filter: blur(120px);
        opacity: 0.32;
        pointer-events: none;
        transition: background-color 1.2s ease;
      }

      .brus-glow-1 {
        width: 55vw;
        height: 55vw;
        top: -15vw;
        left: 20vw;
      }

      .brus-glow-2 {
        width: 45vw;
        height: 45vw;
        bottom: -10vw;
        right: 15vw;
      }

      /* Top Bar - 180px right padding ensures complete clearance from native window controls */
      .brus-topbar {
        position: relative;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 180px 12px 28px;
        background: rgba(8, 8, 10, 0.72);
        border-bottom: 1px solid var(--brus-border);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        user-select: none;
      }

      .brus-meta-pane {
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-width: 55%;
      }

      .brus-song-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--brus-text);
        letter-spacing: -0.015em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .brus-song-artist {
        font-size: 13px;
        color: var(--brus-muted);
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .brus-actions-pane {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .brus-pill-badge {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        border: 1px solid #26262e;
        background: #141418;
        color: #9e9ea8;
      }

      .brus-pill-badge[data-source="brus-lyrics-verified"] {
        border-color: #2e5a3c;
        background: #11261a;
        color: #4ade80;
      }

      .brus-pill-badge[data-source="spotify-musixmatch"] {
        border-color: #2e5a3c;
        background: #11261a;
        color: #1ed760;
      }

      .brus-pill-badge[data-source="lrclib-fallback"] {
        border-color: #33333d;
        background: #16161b;
        color: #98c379;
      }

      .brus-pill-badge[data-source="not-found"] {
        border-color: #2e2626;
        background: #181414;
        color: #887e7e;
      }

      .brus-btn-studio {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 600;
        padding: 6px 12px;
        background: #1f1f26;
        color: #f4f4f6;
        border: 1px solid #33333d;
        border-radius: 4px;
        text-decoration: none;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease;
      }

      .brus-btn-studio:hover {
        background: #2b2b36;
        border-color: #444452;
      }

      .brus-btn-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        background: transparent;
        border: 1px solid #33333d;
        border-radius: 4px;
        color: #b3b3b3;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }

      .brus-btn-icon:hover {
        background: #2b2b36;
        color: #ffffff;
      }

      /* Playbar Bottom-Right Button */
      .brus-playbar-btn {
        background: transparent;
        border: none;
        color: #b3b3b3;
        width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        border-radius: 50%;
        transition: color 0.15s ease, transform 0.1s ease;
        padding: 0;
        margin: 0 4px;
      }

      .brus-playbar-btn:hover {
        color: #ffffff;
        transform: scale(1.08);
      }

      .brus-playbar-btn.is-active {
        color: #1db954 !important;
      }

      .brus-playbar-btn.is-active::after {
        content: '';
        position: absolute;
        bottom: 1px;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 4px;
        background-color: #1db954;
        border-radius: 50%;
      }

      /* TTML Engine Mount & Renderer Styles */
      .brus-lyrics-mount {
        position: relative;
        z-index: 5;
        flex: 1;
        width: 100%;
        height: calc(100% - 55px);
        overflow: hidden;
      }

      .brus-lyrics-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        user-select: none;
        background-color: transparent !important;
        color: var(--brus-text);
        display: flex;
        flex-direction: column;
      }

      .brus-lyrics-ambient {
        display: none !important;
      }

      .brus-lyrics-viewport {
        position: relative;
        z-index: 2;
        width: 100%;
        height: 100%;
        overflow: hidden;
        box-sizing: border-box;
      }

      .brus-lyrics-track {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        padding: 120px 48px 340px 48px;
        display: flex;
        flex-direction: column;
        gap: 36px;
        align-items: center;
        will-change: transform;
        transform: translate3d(0, 0, 0);
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .brus-line {
        position: relative;
        display: inline-flex;
        flex-direction: column;
        max-width: 85%;
        font-size: 32px;
        font-weight: 700;
        line-height: 1.35;
        letter-spacing: -0.02em;
        word-spacing: 0.08em;
        cursor: pointer;
        transform-origin: center center;
        text-align: center;
        transition: opacity 0.35s ease, filter 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        will-change: transform, opacity, filter;
      }

      .brus-line[data-agent="v1"] {
        align-self: center;
        text-align: center;
      }

      .brus-line[data-agent="v2"] {
        align-self: center;
        text-align: center;
      }

      .brus-line.is-inactive {
        opacity: 0.28;
        filter: blur(1px);
      }

      .brus-line.is-distant {
        opacity: 0.12;
        filter: blur(2.5px);
      }

      .brus-line.is-active {
        opacity: 1;
        filter: blur(0px);
        transform: scale(1.05);
      }

      .brus-line.is-past {
        opacity: 0.4;
        filter: blur(0.5px);
      }

      .brus-line-content {
        display: inline;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .brus-word {
        position: relative;
        display: inline-block;
        white-space: pre-wrap;
        transition: transform 0.15s ease-out;
        cursor: pointer;
      }

      .brus-word-fill {
        background: linear-gradient(
          to right,
          #ffffff 0%,
          #ffffff calc(var(--word-progress, 0) * 100%),
          rgba(255, 255, 255, 0.3) calc(var(--word-progress, 0) * 100%),
          rgba(255, 255, 255, 0.3) 100%
        );
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        display: inline-block;
        white-space: pre-wrap;
        will-change: transform;
      }

      .brus-word.is-sung .brus-word-fill {
        --word-progress: 1;
      }

      .brus-word.is-singing {
        transform: translate3d(0, -2px, 0);
      }

      .brus-word.is-singing .brus-word-fill {
        text-shadow: 0 0 16px rgba(255, 255, 255, 0.35);
      }

      .brus-word.is-unsung .brus-word-fill {
        --word-progress: 0;
      }

      .brus-bg-vocals {
        margin-top: 6px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: center;
      }

      .brus-bg-line {
        font-size: 20px;
        font-weight: 500;
        font-style: italic;
        letter-spacing: -0.01em;
        opacity: 0.75;
        color: #9e9ea8;
      }

      .brus-bg-line .brus-word-fill {
        background: linear-gradient(
          to right,
          #9e9ea8 0%,
          #9e9ea8 calc(var(--word-progress, 0) * 100%),
          rgba(158, 158, 168, 0.3) calc(var(--word-progress, 0) * 100%),
          rgba(158, 158, 168, 0.3) 100%
        );
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .brus-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 250px;
        color: #6e6e78;
        font-size: 15px;
        font-weight: 500;
        font-family: 'Inter', sans-serif;
        letter-spacing: -0.01em;
        gap: 8px;
        text-align: center;
      }

      /* Contributor Attribution Footer */
      .brus-lyrics-attribution {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 48px;
        padding-top: 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        width: 100%;
      }

      .brus-attribution-card {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 6px 14px;
        background-color: rgba(20, 20, 24, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        color: #a1a1aa;
      }

      .brus-attribution-text,
      .brus-attribution-link {
        font-weight: 500;
        color: #f4f4f6;
        text-decoration: underline;
        text-decoration-color: rgba(255, 255, 255, 0.2);
        transition: color 0.15s ease, text-decoration-color 0.15s ease;
        cursor: pointer;
      }

      .brus-attribution-link:hover {
        color: #ffffff;
        text-decoration-color: #38bdf8;
      }

      .brus-verified-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 7px;
        border-radius: 4px;
        background-color: rgba(34, 197, 94, 0.12);
        border: 1px solid rgba(34, 197, 94, 0.25);
        color: #4ade80;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-decoration: none;
        cursor: pointer;
      }

      .brus-admin-badge {
        background: linear-gradient(135deg, #f59e0b25 0%, #fbbf2440 100%) !important;
        border-color: #f59e0b80 !important;
        color: #fbbf24 !important;
        box-shadow: 0 0 10px rgba(245, 158, 11, 0.35);
      }

      .brus-contributor-badge {
        background: linear-gradient(135deg, #0284c725 0%, #38bdf840 100%) !important;
        border-color: #38bdf880 !important;
        color: #38bdf8 !important;
        box-shadow: 0 0 8px rgba(56, 189, 248, 0.3);
      }
    `;
    document.head.appendChild(style);
  }


  private createDom(): void {
    if (this.rootElement) return;

    this.rootElement = document.createElement('div');
    this.rootElement.className = 'brus-spotify-wrapper';
    this.rootElement.id = 'brus-spotify-overlay';

    // 1. Dynamic Album Art Blur Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'brus-album-backdrop';

    this.blurImageEl = document.createElement('div');
    this.blurImageEl.className = 'brus-album-blur-image';

    const vignette = document.createElement('div');
    vignette.className = 'brus-album-vignette';

    this.glow1El = document.createElement('div');
    this.glow1El.className = 'brus-ambient-glow brus-glow-1';

    this.glow2El = document.createElement('div');
    this.glow2El.className = 'brus-ambient-glow brus-glow-2';

    backdrop.appendChild(this.blurImageEl);
    backdrop.appendChild(vignette);
    backdrop.appendChild(this.glow1El);
    backdrop.appendChild(this.glow2El);

    // 2. Top Bar
    this.topBarEl = document.createElement('div');
    this.topBarEl.className = 'brus-topbar';

    const metaPane = document.createElement('div');
    metaPane.className = 'brus-meta-pane';

    this.titleEl = document.createElement('div');
    this.titleEl.className = 'brus-song-title';
    this.titleEl.textContent = 'Waiting for track...';

    this.artistEl = document.createElement('div');
    this.artistEl.className = 'brus-song-artist';
    this.artistEl.textContent = '-';

    metaPane.appendChild(this.titleEl);
    metaPane.appendChild(this.artistEl);

    const actionsPane = document.createElement('div');
    actionsPane.className = 'brus-actions-pane';

    this.sourceBadgeEl = document.createElement('span');
    this.sourceBadgeEl.className = 'brus-pill-badge';
    this.sourceBadgeEl.textContent = 'Standby';

    this.studioBtnEl = document.createElement('a');
    this.studioBtnEl.className = 'brus-btn-studio';
    this.studioBtnEl.textContent = 'Open in Sync Studio';
    this.studioBtnEl.target = '_blank';
    this.studioBtnEl.rel = 'noreferrer';
    this.studioBtnEl.href = STUDIO_BASE_URL;

    this.fullscreenBtnEl = document.createElement('button');
    this.fullscreenBtnEl.className = 'brus-btn-icon';
    this.fullscreenBtnEl.title = 'Toggle Fullscreen';
    this.fullscreenBtnEl.innerHTML = `
      <svg role="img" height="14" width="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 1 0V2h3.5a.5.5 0 0 0 0-1h-4zm13 0h-4a.5.5 0 0 0 0 1H14v3.5a.5.5 0 0 0 1 0v-4a.5.5 0 0 0-.5-.5zM1 10.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 0-1H2v-3.5a.5.5 0 0 0-1 0zm14 0a.5.5 0 0 0-1 0V14h-3.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 .5-.5v-4z"/>
      </svg>
    `;
    this.fullscreenBtnEl.addEventListener('click', () => this.toggleFullscreen());

    const closeBtn = document.createElement('button');
    closeBtn.className = 'brus-btn-icon';
    closeBtn.title = 'Close Lyrics (Esc)';
    closeBtn.innerHTML = `
      <svg role="img" height="14" width="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/>
      </svg>
    `;
    closeBtn.addEventListener('click', () => this.toggleView(false));

    actionsPane.appendChild(this.sourceBadgeEl);
    actionsPane.appendChild(this.studioBtnEl);
    actionsPane.appendChild(this.fullscreenBtnEl);
    actionsPane.appendChild(closeBtn);

    this.topBarEl.appendChild(metaPane);
    this.topBarEl.appendChild(actionsPane);

    // 3. Renderer Container
    this.lyricsContainerEl = document.createElement('div');
    this.lyricsContainerEl.className = 'brus-lyrics-mount';

    this.rootElement.appendChild(backdrop);
    this.rootElement.appendChild(this.topBarEl);
    this.rootElement.appendChild(this.lyricsContainerEl);

    // Mount to document.body
    document.body.appendChild(this.rootElement);

    // Initialize Renderer
    this.renderer = new BrusLyricsRenderer(this.lyricsContainerEl, {
      getCurrentTimeMs: () => {
        if (window.Spicetify?.Player?.getProgress) {
          return window.Spicetify.Player.getProgress();
        }
        return 0;
      },
      onSeek: (timestampMs: number) => {
        if (window.Spicetify?.Player?.seek) {
          window.Spicetify.Player.seek(timestampMs);
        }
      },
      enableAmbient: false,
      enableSpringScroll: true,
      targetHeightRatio: 0.35,
    });

    this.renderer.play();
  }

  private updateOverlayBounds(): void {
    if (!this.rootElement) return;

    if (this.isFullscreen) {
      this.rootElement.style.top = '0px';
      this.rootElement.style.bottom = '0px';
      this.rootElement.style.height = '100vh';
      return;
    }

    const topBar =
      document.querySelector('.main-topBar-container') ||
      document.querySelector('.Root__top-bar') ||
      document.querySelector('[data-testid="top-bar"]') ||
      document.querySelector('header');

    let topOffset = 64;
    if (topBar) {
      const rect = topBar.getBoundingClientRect();
      if (rect.height > 20) {
        topOffset = Math.round(rect.bottom);
      }
    }

    this.rootElement.style.top = `${topOffset}px`;
    this.rootElement.style.bottom = '90px';
    this.rootElement.style.height = `calc(100vh - ${topOffset}px - 90px)`;
  }

  private setupTopbarButton(): void {
    if (!window.Spicetify?.Topbar?.Button) {
      setTimeout(() => this.setupTopbarButton(), 1000);
      return;
    }

    if (!this.topbarBtn) {
      this.topbarBtn = new window.Spicetify.Topbar.Button(
        "Bru's Lyrics",
        'lyrics',
        () => this.toggleView(),
        false,
        false
      );
    }
  }

  private setupPlaybarButton(): void {
    const inject = () => {
      const extraControls = document.querySelector('.main-nowPlayingBar-extraControls');
      if (!extraControls) return;

      if (this.playbarBtn && document.contains(this.playbarBtn)) {
        return;
      }

      if (!this.playbarBtn) {
        this.playbarBtn = document.createElement('button');
        this.playbarBtn.id = 'brus-playbar-btn';
        this.playbarBtn.className = 'brus-playbar-btn';
        this.playbarBtn.setAttribute('aria-label', "Bru's Syllable Lyrics");
        this.playbarBtn.setAttribute('title', "Bru's Syllable Lyrics");
        this.playbarBtn.innerHTML = `
          <svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.5 3A1.5 1.5 0 0 1 4 1.5h8A1.5 1.5 0 0 1 13.5 3v10a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 13V3zm1.5-.5a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V3a.5.5 0 0 0-.5-.5H4zm1 3a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5z"/>
          </svg>
        `;
        this.playbarBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleView();
        });
      }

      // Locate Spotify's native lyrics button or extraControls child
      const nativeLyricsBtn =
        extraControls.querySelector('button[data-testid="lyrics-button"]') ||
        extraControls.querySelector('button[aria-label*="Lyrics" i]') ||
        extraControls.querySelector('button[aria-label*="Letras" i]') ||
        extraControls.querySelector('button[aria-label*="Letra" i]');

      if (nativeLyricsBtn && nativeLyricsBtn.parentElement === extraControls) {
        extraControls.insertBefore(this.playbarBtn, nativeLyricsBtn.nextSibling);
      } else {
        extraControls.insertBefore(this.playbarBtn, extraControls.firstChild);
      }

      this.updatePlaybarButtonState();
    };

    inject();

    if (typeof MutationObserver !== 'undefined') {
      if (this.playbarObserver) {
        this.playbarObserver.disconnect();
      }
      this.playbarObserver = new MutationObserver(() => {
        inject();
      });
      this.playbarObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  private updatePlaybarButtonState(): void {
    if (!this.playbarBtn) return;
    if (this.isOpen) {
      this.playbarBtn.classList.add('is-active');
    } else {
      this.playbarBtn.classList.remove('is-active');
    }
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.toggleView(false);
      }
    });
  }

  public toggleView(forceState?: boolean): void {
    this.isOpen = forceState !== undefined ? forceState : !this.isOpen;

    if (!this.rootElement) {
      this.createDom();
    }
    if (!this.rootElement) return;

    if (this.isOpen) {
      if (!document.contains(this.rootElement)) {
        document.body.appendChild(this.rootElement);
      }
      this.updateOverlayBounds();
      this.rootElement.classList.add('is-open');
      this.rootElement.style.display = 'flex';
      this.updatePlaybarButtonState();

      // Refresh track on open
      const track = this.resolveCurrentTrack();
      if (track) {
        this.onTrackChange(track);
      }

      this.renderer?.update();
    } else {
      this.rootElement.classList.remove('is-open');
      this.rootElement.style.display = 'none';
      this.updatePlaybarButtonState();
    }
  }

  public toggleFullscreen(): void {
    if (!this.rootElement) return;
    this.isFullscreen = !this.isFullscreen;
    if (this.isFullscreen) {
      this.rootElement.classList.add('is-fullscreen');
    } else {
      this.rootElement.classList.remove('is-fullscreen');
    }
    this.updateOverlayBounds();
    this.renderer?.update();
  }

  private resolveCurrentTrack(inputCandidate?: any): ResolvedTrack | null {
    const player = window.Spicetify?.Player;

    const candidate =
      inputCandidate?.item ||
      inputCandidate ||
      player?.data?.item ||
      (player?.data as any) ||
      (window as any).Spicetify?.Platform?.PlayerAPI?._state?.item;

    const meta = candidate?.metadata || (player?.data as any)?.metadata || {};
    const uri = candidate?.uri || (player?.data as any)?.uri || '';
    const rawTrackId = cleanTrackId(uri);

    // 1. Resolve Title
    let title = (meta.title || candidate?.name || candidate?.title || '').trim();
    if (!title || title.toLowerCase() === 'unknown title') {
      const domTitle = document.querySelector(
        '.main-trackInfo-name a, .main-trackInfo-name, [data-testid="nowplaying-track-link"], [data-testid="context-item-info-title"]'
      );
      if (domTitle?.textContent?.trim()) {
        title = domTitle.textContent.trim();
      }
    }

    // 2. Resolve Artist
    let artist = (meta.artist_name || '').trim();
    if (!artist && Array.isArray(candidate?.artists) && candidate.artists.length > 0) {
      artist = candidate.artists.map((a: any) => a.name).join(', ').trim();
    }
    if (!artist) {
      const artistKeys = Object.keys(meta).filter((k) => k.startsWith('artist_name')).sort();
      if (artistKeys.length > 0) {
        artist = artistKeys.map((k) => meta[k]).join(', ').trim();
      }
    }
    if (!artist || artist.toLowerCase() === 'unknown artist') {
      const domArtist = document.querySelector(
        '.main-trackInfo-artists a, .main-trackInfo-artists, [data-testid="nowplaying-artist"], [data-testid="context-item-info-artist"]'
      );
      if (domArtist?.textContent?.trim()) {
        artist = domArtist.textContent.trim();
      }
    }

    // 3. Resolve Album, Duration, Image
    const album = meta.album_title || candidate?.album?.name || '';
    const durationMs =
      (meta.duration ? parseInt(meta.duration, 10) : undefined) ||
      candidate?.duration ||
      (player?.data as any)?.duration;
    const imageUrl =
      meta.image_xlarge_url ||
      meta.image_url ||
      candidate?.album?.images?.[0]?.url;

    if (!title && !uri) return null;

    return {
      rawTrackId,
      uri,
      title: title || 'Unknown Title',
      artist: artist || 'Unknown Artist',
      album,
      durationMs,
      imageUrl,
    };
  }

  private attachPlayerHooks(): void {
    if (!window.Spicetify?.Player) {
      setTimeout(() => this.attachPlayerHooks(), 1000);
      return;
    }

    window.Spicetify.Player.addEventListener('songchange', (event: any) => {
      const track = this.resolveCurrentTrack(event?.data);
      if (track) {
        this.onTrackChange(track);
      }
    });

    // Check track every 1.5s when lyrics view is open
    setInterval(() => {
      if (this.isOpen) {
        const track = this.resolveCurrentTrack();
        if (track && track.uri !== this.currentTrackUri) {
          this.onTrackChange(track);
        }
      }
    }, 1500);
  }

  private updateBackdrop(imageUrl?: string, colors?: { ambient1: string; ambient2: string }): void {
    if (this.blurImageEl) {
      if (imageUrl) {
        this.blurImageEl.style.backgroundImage = `url("${imageUrl}")`;
        this.blurImageEl.style.opacity = '0.85';
      } else {
        this.blurImageEl.style.backgroundImage = 'none';
        this.blurImageEl.style.opacity = '0';
      }
    }

    if (colors) {
      if (this.glow1El) {
        this.glow1El.style.backgroundColor = colors.ambient1;
      }
      if (this.glow2El) {
        this.glow2El.style.backgroundColor = colors.ambient2;
      }
    }
  }

  private async onTrackChange(track: ResolvedTrack): Promise<void> {
    if (!track || track.uri === this.currentTrackUri) return;
    this.currentTrackUri = track.uri;

    const { rawTrackId, title, artist, durationMs, imageUrl } = track;

    if (this.titleEl) this.titleEl.textContent = title;
    if (this.artistEl) this.artistEl.textContent = artist;

    if (this.studioBtnEl) {
      const params = new URLSearchParams({
        trackId: rawTrackId,
        title,
        artist,
        platform: 'spotify',
        mode: 'studio',
        ...(durationMs ? { duration: String(durationMs) } : {}),
      });
      this.studioBtnEl.href = `${STUDIO_BASE_URL}/sync?${params.toString()}`;
    }

    if (this.sourceBadgeEl) {
      this.sourceBadgeEl.textContent = 'Searching...';
      this.sourceBadgeEl.removeAttribute('data-source');
    }

    // Extract dominant album ambient colors and apply blur backdrop
    const colors = await extractAlbumColors(imageUrl);
    this.updateBackdrop(imageUrl, colors);

    if (this.renderer) {
      this.renderer.setThemeAmbient(colors.ambient1, colors.ambient2);
    }

    // Query lyrics (Waterfall: Bru's Lyrics -> Spotify / Musixmatch Native -> LRCLIB)
    const res = await fetchLyrics(this.apiBase, {
      trackId: rawTrackId,
      title,
      artist,
      durationMs,
    });

    if (res.source === 'brus-lyrics-verified') {
      if (this.sourceBadgeEl) {
        this.sourceBadgeEl.textContent = "Bru's Lyrics Verified";
        this.sourceBadgeEl.setAttribute('data-source', 'brus-lyrics-verified');
      }
    } else if (res.source === 'spotify-musixmatch') {
      if (this.sourceBadgeEl) {
        this.sourceBadgeEl.textContent = 'Spotify / Musixmatch';
        this.sourceBadgeEl.setAttribute('data-source', 'spotify-musixmatch');
      }
    } else if (res.source === 'lrclib-fallback') {
      if (this.sourceBadgeEl) {
        this.sourceBadgeEl.textContent = 'LRCLIB Fallback';
        this.sourceBadgeEl.setAttribute('data-source', 'lrclib-fallback');
      }
    } else {
      if (this.sourceBadgeEl) {
        this.sourceBadgeEl.textContent = 'No Lyrics Available';
        this.sourceBadgeEl.setAttribute('data-source', 'not-found');
      }
    }

    if (res.ttml) {
      const doc = parseTTML(res.ttml);
      this.renderer?.setDocument(doc);
    } else {
      this.renderer?.setDocument({
        metadata: { title, artist, durationMs },
        lines: [],
      });
    }
  }

  public getRootElement(): HTMLElement | null {
    return this.rootElement;
  }
}

// Spicetify Extension Entry Point
const app = new BrusSpicetifyExtension();
app.init();

export default app;
