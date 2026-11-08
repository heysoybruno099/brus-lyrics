import { getStoredSpotifyToken, refreshSpotifyToken } from './spotify-auth.js';

export interface SpotifyPlayerCallbacks {
  onTimeUpdate?: (positionMs: number, durationMs: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onTrackChange?: (track: any) => void;
  onReady?: (deviceId: string) => void;
  onError?: (message: string) => void;
}

export class SpotifyWebPlayer {
  private player: any = null;
  private deviceId: string | null = null;
  private isReady: boolean = false;
  private accessToken: string | null = null;
  private callbacks: SpotifyPlayerCallbacks = {};
  private currentVolume: number = 0.8;
  private pollInterval: any = null;
  private isPlaying: boolean = false;
  private currentPositionMs: number = 0;
  private currentDurationMs: number = 0;

  constructor(callbacks: SpotifyPlayerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: SpotifyPlayerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public async initialize(token: string): Promise<boolean> {
    this.accessToken = token;
    if (typeof window === 'undefined') return false;

    return new Promise((resolve) => {
      const setupPlayer = () => {
        if (!window.Spotify || !window.Spotify.Player) {
          this.callbacks.onError?.('Spotify Web Playback SDK script not available');
          resolve(false);
          return;
        }

        try {
          if (this.player) {
            this.player.disconnect();
          }

          const player = new window.Spotify.Player({
            name: 'Lyrics Syllable Web Player',
            getOAuthToken: async (cb: (token: string) => void) => {
              let currentToken = getStoredSpotifyToken() || this.accessToken;
              if (!currentToken) {
                currentToken = await refreshSpotifyToken();
              }
              if (currentToken) {
                this.accessToken = currentToken;
                cb(currentToken);
              }
            },
            volume: this.currentVolume,
          });

          player.addListener('ready', ({ device_id }: { device_id: string }) => {
            this.deviceId = device_id;
            this.isReady = true;
            this.callbacks.onReady?.(device_id);
            resolve(true);
          });

          player.addListener('not_ready', () => {
            this.isReady = false;
          });

          player.addListener('player_state_changed', (state: any) => {
            if (!state) {
              this.isPlaying = false;
              this.callbacks.onPlayStateChange?.(false);
              return;
            }

            this.isPlaying = !state.paused;
            this.currentPositionMs = state.position || 0;
            this.currentDurationMs = state.duration || 0;

            this.callbacks.onPlayStateChange?.(this.isPlaying);
            this.callbacks.onTimeUpdate?.(this.currentPositionMs, this.currentDurationMs);

            if (state.track_window?.current_track) {
              this.callbacks.onTrackChange?.(state.track_window.current_track);
            }
          });

          player.addListener('initialization_error', ({ message }: { message: string }) => {
            this.callbacks.onError?.(`Initialization error: ${message}`);
            resolve(false);
          });

          player.addListener('authentication_error', ({ message }: { message: string }) => {
            this.callbacks.onError?.(`Authentication error: ${message}`);
            resolve(false);
          });

          player.addListener('account_error', ({ message }: { message: string }) => {
            this.callbacks.onError?.(`Spotify Premium required: ${message}`);
            resolve(false);
          });

          player.connect();
          this.player = player;

          // Position polling during playback for smooth sub-millisecond synced lyrics
          if (this.pollInterval) clearInterval(this.pollInterval);
          this.pollInterval = setInterval(async () => {
            if (this.isPlaying && this.player) {
              try {
                const state = await this.player.getCurrentState();
                if (state) {
                  this.currentPositionMs = state.position;
                  this.callbacks.onTimeUpdate?.(state.position, state.duration);
                }
              } catch {
                // Ignore poll errors
              }
            }
          }, 150);
        } catch (err: any) {
          this.callbacks.onError?.(err.message);
          resolve(false);
        }
      };

      if (window.Spotify && window.Spotify.Player) {
        setupPlayer();
      } else {
        window.onSpotifyWebPlaybackSDKReady = () => {
          setupPlayer();
        };

        // Fallback timeout in case SDK script doesn't load
        setTimeout(() => {
          if (!this.isReady && !this.player) {
            resolve(false);
          }
        }, 5000);
      }
    });
  }

  public async playTrack(spotifyId: string, positionMs: number = 0): Promise<boolean> {
    const cleanId = spotifyId.replace(/^spotify:track:/i, '').replace(/^spotify_/i, '').trim();
    const token = getStoredSpotifyToken() || this.accessToken;

    if (!token) {
      this.callbacks.onError?.('Spotify access token is missing');
      return false;
    }

    try {
      const url = this.deviceId
        ? `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`
        : 'https://api.spotify.com/v1/me/player/play';

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [`spotify:track:${cleanId}`],
          position_ms: positionMs || 0,
        }),
      });

      if (res.ok || res.status === 204) {
        this.isPlaying = true;
        this.callbacks.onPlayStateChange?.(true);
        return true;
      } else if (res.status === 403) {
        this.callbacks.onError?.('Spotify Premium is required for full web playback.');
        return false;
      }
      return false;
    } catch (err: any) {
      this.callbacks.onError?.(`Failed to start Spotify playback: ${err.message}`);
      return false;
    }
  }

  public async resume(): Promise<void> {
    if (this.player) {
      try {
        await this.player.resume();
        this.isPlaying = true;
        this.callbacks.onPlayStateChange?.(true);
      } catch {
        // Fallback
      }
    }
  }

  public async pause(): Promise<void> {
    if (this.player) {
      try {
        await this.player.pause();
        this.isPlaying = false;
        this.callbacks.onPlayStateChange?.(false);
      } catch {
        // Fallback
      }
    }
  }

  public async togglePlay(): Promise<void> {
    if (this.player) {
      try {
        await this.player.togglePlay();
      } catch {
        // Fallback
      }
    }
  }

  public async seek(positionMs: number): Promise<void> {
    if (this.player) {
      try {
        await this.player.seek(positionMs);
        this.currentPositionMs = positionMs;
        this.callbacks.onTimeUpdate?.(positionMs, this.currentDurationMs);
      } catch {
        // Fallback
      }
    }
  }

  public async setVolume(volume: number): Promise<void> {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.player) {
      try {
        await this.player.setVolume(this.currentVolume);
      } catch {
        // Fallback
      }
    }
  }

  public disconnect(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.player) {
      try {
        this.player.disconnect();
      } catch {
        // Fallback
      }
      this.player = null;
      this.isReady = false;
      this.deviceId = null;
    }
  }

  public getIsReady(): boolean {
    return this.isReady;
  }

  public getDeviceId(): string | null {
    return this.deviceId;
  }
}
