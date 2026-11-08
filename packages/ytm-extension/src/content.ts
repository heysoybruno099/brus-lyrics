import { cleanTrackId, cleanYouTubeTitle } from '@brus-lyrics/shared-types';
import { BrusLyricsRenderer, parseTTML, lrcToTTMLDocument } from '@brus-lyrics/ttml-engine';

interface ExtensionConfig {
  apiUrl: string;
  enableBlur: boolean;
  enableAdLibs: boolean;
}

class BrusYtmExtension {
  private config: ExtensionConfig = {
    apiUrl: 'https://brus-lyrics-api.heysoybruno09.workers.dev',
    enableBlur: true,
    enableAdLibs: true,
  };

  private renderer: BrusLyricsRenderer | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private currentVideoId: string | null = null;
  private rootEl: HTMLElement | null = null;
  private lyricsMountEl: HTMLElement | null = null;
  private statusBadgeEl: HTMLElement | null = null;
  private studioBtnEl: HTMLAnchorElement | null = null;
  private songTitleEl: HTMLElement | null = null;
  private songArtistEl: HTMLElement | null = null;
  private sidePanelEl: HTMLElement | null = null;
  private isLyricsTabActive: boolean = false;
  private tabCheckInterval: number | null = null;
  private currentDoc: any = null;
  private currentSource: string = 'brus-lyrics-verified';

  public async init(): Promise<void> {
    await this.loadConfig();
    this.listenForConfigChanges();
    this.findVideoElement();
    this.setupPlayerObserver();
    this.setupTabMonitor();
    this.checkCurrentTrack();
  }

  private async loadConfig(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['apiUrl', 'enableBlur', 'enableAdLibs'], (items) => {
          if (items['apiUrl']) this.config.apiUrl = items['apiUrl'];
          if (items['enableBlur'] !== undefined) this.config.enableBlur = Boolean(items['enableBlur']);
          if (items['enableAdLibs'] !== undefined) this.config.enableAdLibs = Boolean(items['enableAdLibs']);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private listenForConfigChanges(): void {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync') {
          if (changes['apiUrl']) this.config.apiUrl = changes['apiUrl'].newValue;
          if (changes['enableBlur'] !== undefined) {
            this.config.enableBlur = changes['enableBlur'].newValue;
            this.applyStylePreferences();
          }
          if (changes['enableAdLibs'] !== undefined) {
            this.config.enableAdLibs = changes['enableAdLibs'].newValue;
            this.applyStylePreferences();
          }
        }
      });
    }
  }

  private findVideoElement(): void {
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (video) {
      this.videoEl = video;
    }
  }

  private setupPlayerObserver(): void {
    const playerBar = document.querySelector('ytmusic-player-bar');
    if (playerBar) {
      const observer = new MutationObserver(() => {
        this.checkCurrentTrack();
      });
      observer.observe(playerBar, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['title', 'href', 'src'],
      });
    } else {
      setTimeout(() => this.setupPlayerObserver(), 1000);
    }
  }

  // Monitor side-panel tabs to enable the "LYRICS" tab and show/hide the lyrics root
  private setupTabMonitor(): void {
    const checkTabs = () => {
      this.enableLyricsTabAndCheckState();
    };

    checkTabs();
    if (!this.tabCheckInterval) {
      this.tabCheckInterval = window.setInterval(checkTabs, 800);
    }

    // Also observe the side-panel when available
    const sidePanel = document.querySelector('ytmusic-player-page #side-panel, #side-panel') as HTMLElement | null;
    if (sidePanel && !this.sidePanelEl) {
      this.sidePanelEl = sidePanel;
      const tabObserver = new MutationObserver(() => {
        this.enableLyricsTabAndCheckState();
      });
      tabObserver.observe(sidePanel, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'selected', 'aria-selected', 'disabled'],
      });
    }
  }

  private enableLyricsTabAndCheckState(): void {
    const sidePanel = document.querySelector('ytmusic-player-page #side-panel, #side-panel') as HTMLElement | null;
    if (!sidePanel) return;

    // Find all tab elements inside side-panel
    const tabs = sidePanel.querySelectorAll('tp-yt-paper-tab, .tab-header, ytmusic-tab-header-renderer');
    let lyricsTabEl: HTMLElement | null = null;
    let isLyricsSelected = false;

    tabs.forEach((tab) => {
      const tabText = (tab.textContent || '').trim().toUpperCase();
      const ariaLabel = (tab.getAttribute('aria-label') || '').toUpperCase();
      const isLyricsTab = tabText.includes('LYRICS') || ariaLabel.includes('LYRICS') || tabText.includes('LETRAS');

      if (isLyricsTab) {
        lyricsTabEl = tab as HTMLElement;

        // Strip disabled attribute so user can click it on ANY song/video
        if (tab.hasAttribute('disabled')) {
          tab.removeAttribute('disabled');
        }
        if (tab.getAttribute('aria-disabled') === 'true') {
          tab.setAttribute('aria-disabled', 'false');
        }
        tab.setAttribute('data-brus-enabled', 'true');
        (tab as HTMLElement).style.pointerEvents = 'auto';
        (tab as HTMLElement).style.cursor = 'pointer';

        // Check if currently selected
        const isSelected =
          tab.classList.contains('iron-selected') ||
          tab.getAttribute('aria-selected') === 'true';

        if (isSelected) {
          isLyricsSelected = true;
        }

        // Attach direct click handler if not already attached
        if (!tab.getAttribute('data-brus-click-bound')) {
          tab.setAttribute('data-brus-click-bound', 'true');
          tab.addEventListener('click', () => {
            this.setLyricsVisibility(true);
          });
        }
      } else {
        // UP NEXT, RELATED, COMMENTS tabs
        const isSelected =
          tab.classList.contains('iron-selected') ||
          tab.getAttribute('aria-selected') === 'true';

        if (isSelected) {
          isLyricsSelected = false;
        }

        // Attach click listener to other tabs to immediately hide lyrics
        if (!tab.getAttribute('data-brus-click-bound')) {
          tab.setAttribute('data-brus-click-bound', 'true');
          tab.addEventListener('click', () => {
            this.setLyricsVisibility(false);
          });
        }
      }
    });

    if (this.isLyricsTabActive !== isLyricsSelected) {
      this.setLyricsVisibility(isLyricsSelected);
    }
  }

  private setLyricsVisibility(visible: boolean): void {
    this.isLyricsTabActive = visible;
    if (visible) {
      if (!this.rootEl) {
        this.ensureContainerMounted();
      }
      if (this.rootEl) {
        this.rootEl.style.display = 'flex';
        this.rootEl.classList.add('is-visible');
        if (this.currentDoc && this.renderer) {
          this.renderer.setDocument(this.currentDoc);
        }
        this.renderer?.update();
      }
    } else {
      if (this.rootEl) {
        this.rootEl.style.display = 'none';
        this.rootEl.classList.remove('is-visible');
      }
    }
  }

  private checkCurrentTrack(): void {
    this.findVideoElement();

    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v') || this.extractVideoIdFromDom();

    if (!videoId || videoId === this.currentVideoId) return;
    this.currentVideoId = videoId;

    const titleEl = document.querySelector('ytmusic-player-bar .title');
    const artistEl = document.querySelector('ytmusic-player-bar .byline a');
    const rawTitle = titleEl?.textContent?.trim() || '';
    const rawArtist = artistEl?.textContent?.trim() || '';

    // Smart YouTube Title Cleaner
    const cleaned = cleanYouTubeTitle(rawTitle, rawArtist);
    const durationSec = this.videoEl?.duration || 0;
    const durationMs = durationSec > 0 ? Math.round(durationSec * 1000) : undefined;

    if (this.songTitleEl) this.songTitleEl.textContent = cleaned.title;
    if (this.songArtistEl) this.songArtistEl.textContent = cleaned.artist;

    if (this.studioBtnEl) {
      const params = new URLSearchParams({
        trackId: videoId,
        title: cleaned.title,
        artist: cleaned.artist,
        platform: 'ytm',
        mode: 'studio',
        ...(durationMs ? { duration: String(durationMs) } : {}),
      });
      this.studioBtnEl.href = `https://brus-lyrics.pages.dev/sync?${params.toString()}`;
    }

    this.fetchAndRenderLyrics(videoId, cleaned.title, cleaned.artist, durationMs);
  }

  private extractVideoIdFromDom(): string | null {
    const link = document.querySelector('ytmusic-player-bar a[href*="watch?v="]') as HTMLAnchorElement | null;
    if (link && link.href) {
      return cleanTrackId(link.href);
    }
    return null;
  }

  // Strictly mounts inside ytmusic-player-page #side-panel. NEVER touches #main-panel or video!
  private ensureContainerMounted(): void {
    if (this.rootEl && document.contains(this.rootEl)) return;

    const sidePanel = document.querySelector('ytmusic-player-page #side-panel, #side-panel') as HTMLElement | null;
    if (!sidePanel) {
      // Side panel not in DOM yet. Wait and do NOT mount into main-panel!
      return;
    }

    // Locate the tab renderer or insert directly inside side-panel
    const targetParent =
      sidePanel.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]') ||
      sidePanel.querySelector('#tabsContent') ||
      sidePanel;

    this.rootEl = document.createElement('div');
    this.rootEl.id = 'brus-lyrics-root';
    this.rootEl.className = 'brus-ytm-container';
    this.rootEl.style.display = this.isLyricsTabActive ? 'flex' : 'none';

    // Header with branding, track metadata, and status pill
    const header = document.createElement('div');
    header.className = 'brus-ytm-header';

    const brandingCol = document.createElement('div');
    brandingCol.style.display = 'flex';
    brandingCol.style.flexDirection = 'column';
    brandingCol.style.gap = '2px';

    const brandTitle = document.createElement('span');
    brandTitle.className = 'brus-ytm-branding';
    brandTitle.textContent = "Bru's Lyrics";

    this.songTitleEl = document.createElement('span');
    this.songTitleEl.style.fontSize = '12px';
    this.songTitleEl.style.fontWeight = '600';
    this.songTitleEl.style.color = '#f4f4f6';
    this.songTitleEl.textContent = '';

    this.songArtistEl = document.createElement('span');
    this.songArtistEl.style.fontSize = '11px';
    this.songArtistEl.style.color = '#9e9ea8';
    this.songArtistEl.textContent = '';

    brandingCol.appendChild(brandTitle);
    brandingCol.appendChild(this.songTitleEl);
    brandingCol.appendChild(this.songArtistEl);

    const actionsCol = document.createElement('div');
    actionsCol.style.display = 'flex';
    actionsCol.style.alignItems = 'center';
    actionsCol.style.gap = '8px';

    this.studioBtnEl = document.createElement('a');
    this.studioBtnEl.className = 'brus-ytm-pill';
    this.studioBtnEl.style.textDecoration = 'none';
    this.studioBtnEl.style.cursor = 'pointer';
    this.studioBtnEl.textContent = 'Open in Sync Studio';
    this.studioBtnEl.target = '_blank';
    this.studioBtnEl.rel = 'noreferrer';
    this.studioBtnEl.href = 'https://brus-lyrics.pages.dev/sync';

    this.statusBadgeEl = document.createElement('span');
    this.statusBadgeEl.className = 'brus-ytm-pill';
    this.statusBadgeEl.textContent = 'Standby';

    actionsCol.appendChild(this.studioBtnEl);
    actionsCol.appendChild(this.statusBadgeEl);

    header.appendChild(brandingCol);
    header.appendChild(actionsCol);

    this.lyricsMountEl = document.createElement('div');
    this.lyricsMountEl.className = 'brus-ytm-mount';

    this.rootEl.appendChild(header);
    this.rootEl.appendChild(this.lyricsMountEl);

    targetParent.appendChild(this.rootEl);

    // Initialize renderer
    this.renderer = new BrusLyricsRenderer(this.lyricsMountEl, {
      getCurrentTimeMs: () => {
        if (this.videoEl && !isNaN(this.videoEl.currentTime)) {
          return Math.round(this.videoEl.currentTime * 1000);
        }
        return 0;
      },
      onSeek: (timestampMs: number) => {
        if (this.videoEl) {
          this.videoEl.currentTime = timestampMs / 1000;
        }
      },
      enableAmbient: true,
      enableSpringScroll: true,
      targetHeightRatio: 0.35,
    });

    this.renderer.play();
    if (this.currentDoc) {
      this.renderer.setDocument(this.currentDoc);
    }
    this.applyStylePreferences();
  }

  private applyStylePreferences(): void {
    if (!this.rootEl) return;
    this.rootEl.classList.toggle('blur-disabled', !this.config.enableBlur);
    this.rootEl.classList.toggle('adlibs-disabled', !this.config.enableAdLibs);
  }

  // Automatic multi-stage lyrics retrieval: Bru's Lyrics API -> Direct LRCLIB Client Fallback
  private async fetchAndRenderLyrics(
    videoId: string,
    title: string,
    artist: string,
    durationMs?: number
  ): Promise<void> {
    if (this.statusBadgeEl) {
      this.statusBadgeEl.textContent = 'Searching...';
      this.statusBadgeEl.removeAttribute('data-source');
    }

    // Stage 1: Attempt Bru's Lyrics API Worker (Production Cloudflare + Local Fallback)
    let fetchedTTML: string | null = null;
    let source: string = 'brus-lyrics-verified';

    const query = new URLSearchParams({
      trackId: videoId,
      title,
      artist,
      platform: 'ytm',
    });
    if (durationMs) query.set('duration', String(durationMs));

    const candidateEndpoints = [
      `${this.config.apiUrl.replace(/\/+$/, '')}/v1/lyrics?${query.toString()}`,
    ];
    if (!this.config.apiUrl.includes('127.0.0.1')) {
      candidateEndpoints.push(`http://127.0.0.1:8787/v1/lyrics?${query.toString()}`);
    }

    for (const endpoint of candidateEndpoints) {
      try {
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(2000) });
        if (response.ok) {
          source = response.headers.get('X-Lyrics-Source') || 'brus-lyrics-verified';
          fetchedTTML = await response.text();
          if (fetchedTTML) break;
        }
      } catch {
        // Continue to next endpoint
      }
    }

    // Stage 2: Direct Client-Side LRCLIB Fallback (Ensures zero "CONNECTION ERROR" locks)
    if (!fetchedTTML) {
      fetchedTTML = await this.fetchLrcLibDirect(title, artist, durationMs);
      if (fetchedTTML) {
        source = 'lrclib-fallback';
      }
    }

    // Render results
    if (fetchedTTML) {
      this.currentSource = source;
      if (this.statusBadgeEl) {
        if (source === 'brus-lyrics-verified') {
          this.statusBadgeEl.textContent = "Bru's Lyrics Verified";
          this.statusBadgeEl.setAttribute('data-source', 'brus-lyrics-verified');
        } else {
          this.statusBadgeEl.textContent = 'LRCLIB Fallback';
          this.statusBadgeEl.setAttribute('data-source', 'lrclib-fallback');
        }
      }
      const doc = parseTTML(fetchedTTML);
      this.currentDoc = doc;
      this.renderer?.setDocument(doc);
    } else {
      this.currentSource = 'not-found';
      if (this.statusBadgeEl) {
        this.statusBadgeEl.textContent = 'No Lyrics Available';
        this.statusBadgeEl.setAttribute('data-source', 'not-found');
      }
      this.currentDoc = {
        metadata: { title, artist, durationMs },
        lines: [],
      };
      this.renderer?.setDocument(this.currentDoc);
    }
  }

  // Direct client-side fetch from LRCLIB API with smart search query fallback
  private async fetchLrcLibDirect(title: string, artist: string, durationMs?: number): Promise<string | null> {
    try {
      // 1. Exact match attempt
      const getUrl = new URL('https://lrclib.net/api/get');
      getUrl.searchParams.set('track_name', title);
      getUrl.searchParams.set('artist_name', artist);
      if (durationMs) {
        getUrl.searchParams.set('duration', String(Math.round(durationMs / 1000)));
      }

      const getRes = await fetch(getUrl.toString(), { signal: AbortSignal.timeout(3500) });
      if (getRes.ok) {
        const data = await getRes.json();
        if (data.syncedLyrics) {
          const doc = lrcToTTMLDocument(data.syncedLyrics, {
            title,
            artist,
            durationMs,
          });
          return doc.rawXml || null;
        }
      }

      // 2. Fuzzy search query attempt
      const searchUrl = new URL('https://lrclib.net/api/search');
      searchUrl.searchParams.set('q', `${artist} ${title}`);

      const searchRes = await fetch(searchUrl.toString(), { signal: AbortSignal.timeout(3500) });
      if (searchRes.ok) {
        const results = await searchRes.json();
        if (Array.isArray(results) && results.length > 0) {
          const matched = results.find((r: any) => Boolean(r.syncedLyrics)) || results[0];
          if (matched && matched.syncedLyrics) {
            const doc = lrcToTTMLDocument(matched.syncedLyrics, {
              title,
              artist,
              durationMs,
            });
            return doc.rawXml || null;
          }
        }
      }
    } catch {
      // Network unreachable
    }

    return null;
  }
}

// Instantiate and start
const ytmExtension = new BrusYtmExtension();
ytmExtension.init();
