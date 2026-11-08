export interface YouTubePlayerCallbacks {
  onTimeUpdate?: (currentMs: number, durationMs: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  onReady?: () => void;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: {
      Player: new (elementId: string | HTMLElement, options: any) => any;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
  }
}

export class YouTubePlayer {
  private player: any = null;
  private isReady: boolean = false;
  private currentVideoId: string | null = null;
  private isPlaying: boolean = false;
  private pollInterval: any = null;
  private callbacks: YouTubePlayerCallbacks = {};
  private currentVolume: number = 0.8;
  private pendingVideoId: string | null = null;
  private pendingAutoPlay: boolean = false;

  constructor(callbacks: YouTubePlayerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: YouTubePlayerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public initialize(elementId: string = 'yt-player-mount'): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false);

    return new Promise((resolve) => {
      const setup = () => {
        if (!window.YT || !window.YT.Player) {
          resolve(false);
          return;
        }

        const el = document.getElementById(elementId);
        if (!el) {
          resolve(false);
          return;
        }

        try {
          this.player = new window.YT.Player(elementId, {
            height: '180',
            width: '240',
            videoId: '',
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
            },
            events: {
              onReady: () => {
                this.isReady = true;
                this.callbacks.onReady?.();
                if (this.pendingVideoId) {
                  this.loadVideo(this.pendingVideoId, this.pendingAutoPlay);
                  this.pendingVideoId = null;
                }
                resolve(true);
              },
              onStateChange: (event: any) => {
                const state = event.data;
                const YTState = window.YT?.PlayerState;
                if (!YTState) return;

                if (state === YTState.PLAYING) {
                  this.isPlaying = true;
                  this.callbacks.onPlayStateChange?.(true);
                  this.startPolling();
                } else if (state === YTState.PAUSED) {
                  this.isPlaying = false;
                  this.callbacks.onPlayStateChange?.(false);
                  this.stopPolling();
                } else if (state === YTState.ENDED) {
                  this.isPlaying = false;
                  this.callbacks.onPlayStateChange?.(false);
                  this.stopPolling();
                  this.callbacks.onEnded?.();
                }
              },
              onError: (err: any) => {
                this.callbacks.onError?.(err);
                resolve(false);
              },
            },
          });
        } catch (e) {
          resolve(false);
        }
      };

      if (window.YT && window.YT.Player) {
        setup();
      } else {
        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (prevReady) prevReady();
          setup();
        };

        // Fallback check
        setTimeout(() => {
          if (!this.isReady && window.YT && window.YT.Player) {
            setup();
          } else if (!this.isReady) {
            resolve(false);
          }
        }, 4000);
      }
    });
  }

  private startPolling(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      if (this.player && this.isPlaying && typeof this.player.getCurrentTime === 'function') {
        try {
          const curSec = this.player.getCurrentTime();
          const durSec = typeof this.player.getDuration === 'function' ? this.player.getDuration() : 0;
          if (typeof curSec === 'number') {
            const curMs = Math.round(curSec * 1000);
            const durMs = Math.round((durSec || 0) * 1000);
            this.callbacks.onTimeUpdate?.(curMs, durMs);
          }
        } catch {
          // Ignore
        }
      }
    }, 100);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  public loadVideo(videoId: string, autoPlay: boolean = true): void {
    const cleanId = videoId.replace(/^ytm_/i, '').trim();
    this.currentVideoId = cleanId;

    if (!this.isReady || !this.player || typeof this.player.loadVideoById !== 'function') {
      this.pendingVideoId = cleanId;
      this.pendingAutoPlay = autoPlay;
      return;
    }

    try {
      this.player.setVolume(Math.round(this.currentVolume * 100));
      if (autoPlay) {
        this.player.loadVideoById(cleanId);
        this.isPlaying = true;
        this.callbacks.onPlayStateChange?.(true);
      } else {
        this.player.cueVideoById(cleanId);
        this.isPlaying = false;
        this.callbacks.onPlayStateChange?.(false);
      }
    } catch {
      // Fallback
    }
  }

  public play(): void {
    if (this.player && typeof this.player.playVideo === 'function') {
      try {
        this.player.playVideo();
        this.isPlaying = true;
        this.callbacks.onPlayStateChange?.(true);
      } catch {
        // Fallback
      }
    }
  }

  public pause(): void {
    if (this.player && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo();
        this.isPlaying = false;
        this.callbacks.onPlayStateChange?.(false);
      } catch {
        // Fallback
      }
    }
  }

  public seek(positionMs: number): void {
    if (this.player && typeof this.player.seekTo === 'function') {
      try {
        const sec = positionMs / 1000;
        this.player.seekTo(sec, true);
        if (typeof this.player.getDuration === 'function') {
          const durSec = this.player.getDuration() || 0;
          this.callbacks.onTimeUpdate?.(positionMs, Math.round(durSec * 1000));
        }
      } catch {
        // Fallback
      }
    }
  }

  public setVolume(vol: number): void {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    if (this.player && typeof this.player.setVolume === 'function') {
      try {
        this.player.setVolume(Math.round(this.currentVolume * 100));
      } catch {
        // Fallback
      }
    }
  }

  public stop(): void {
    this.stopPolling();
    this.isPlaying = false;
    if (this.player && typeof this.player.stopVideo === 'function') {
      try {
        this.player.stopVideo();
      } catch {
        // Fallback
      }
    }
  }

  public destroy(): void {
    this.stopPolling();
    if (this.player && typeof this.player.destroy === 'function') {
      try {
        this.player.destroy();
      } catch {
        // Fallback
      }
      this.player = null;
      this.isReady = false;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentVideoId(): string | null {
    return this.currentVideoId;
  }
}
