export interface AudioPlayerListener {
  onTimeUpdate: (currentTimeMs: number, durationMs: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
  onEnded: () => void;
}

export class AudioPlayerEngine {
  private audioEl: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private synthInterval: number | null = null;
  private synthGain: GainNode | null = null;
  private isUsingSynth: boolean = false;
  private synthStartTimeMs: number = 0;
  private synthPausedAtMs: number = 0;
  private totalDurationMs: number = 180000;
  private isPlaying: boolean = false;
  private volume: number = 0.8;
  private playbackRate: number = 1.0;
  private listeners: Set<AudioPlayerListener> = new Set();
  private animFrameId: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioEl = new Audio();
      this.audioEl.crossOrigin = 'anonymous';

      this.audioEl.addEventListener('timeupdate', () => {
        if (!this.isUsingSynth && this.audioEl) {
          const cur = Math.round(this.audioEl.currentTime * 1000);
          const dur = Math.round((this.audioEl.duration || 0) * 1000) || this.totalDurationMs;
          this.notifyTimeUpdate(cur, dur);
        }
      });

      this.audioEl.addEventListener('ended', () => {
        this.isPlaying = false;
        this.notifyPlayStateChange(false);
        this.notifyEnded();
      });

      this.audioEl.addEventListener('error', () => {
        // Fall back to synthetic audio engine if audio stream is blocked or unavailable
        if (this.isPlaying) {
          this.fallbackToSynth(this.synthPausedAtMs || 0);
        }
      });
    }
  }

  public subscribe(listener: AudioPlayerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyTimeUpdate(curMs: number, durMs: number): void {
    for (const l of this.listeners) {
      l.onTimeUpdate(curMs, durMs);
    }
  }

  private notifyPlayStateChange(playing: boolean): void {
    for (const l of this.listeners) {
      l.onPlayStateChange(playing);
    }
  }

  private notifyEnded(): void {
    for (const l of this.listeners) {
      l.onEnded();
    }
  }

  public loadTrack(previewUrl: string | null | undefined, durationMs: number): void {
    this.stop();
    this.totalDurationMs = durationMs || 180000;
    this.synthPausedAtMs = 0;

    if (previewUrl && previewUrl.trim().length > 0 && this.audioEl) {
      this.isUsingSynth = false;
      this.audioEl.src = previewUrl;
      this.audioEl.load();
    } else {
      this.isUsingSynth = true;
    }
  }

  public async play(): Promise<void> {
    this.isPlaying = true;
    this.notifyPlayStateChange(true);

    if (!this.isUsingSynth && this.audioEl && this.audioEl.src) {
      try {
        this.audioEl.volume = this.volume;
        this.audioEl.playbackRate = this.playbackRate;
        await this.audioEl.play();
        return;
      } catch {
        // Fallback to synthesis
        this.fallbackToSynth(this.audioEl.currentTime * 1000);
      }
    } else {
      this.startSynth(this.synthPausedAtMs);
    }
  }

  public pause(): void {
    this.isPlaying = false;
    this.notifyPlayStateChange(false);

    if (!this.isUsingSynth && this.audioEl) {
      this.audioEl.pause();
    }

    if (this.isUsingSynth) {
      this.pauseSynth();
    }
  }

  public seek(targetMs: number): void {
    const clamped = Math.max(0, Math.min(targetMs, this.totalDurationMs));

    if (!this.isUsingSynth && this.audioEl && this.audioEl.src) {
      this.audioEl.currentTime = clamped / 1000;
    } else {
      this.synthPausedAtMs = clamped;
      if (this.isPlaying) {
        this.startSynth(clamped);
      } else {
        this.notifyTimeUpdate(clamped, this.totalDurationMs);
      }
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioEl) {
      this.audioEl.volume = this.volume;
    }
    if (this.synthGain && this.audioCtx) {
      this.synthGain.gain.setValueAtTime(this.volume * 0.15, this.audioCtx.currentTime);
    }
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    if (this.audioEl) {
      this.audioEl.playbackRate = rate;
    }
  }

  public stop(): void {
    this.pause();
    if (this.audioEl) {
      this.audioEl.src = '';
    }
    this.synthPausedAtMs = 0;
  }

  public getCurrentTimeMs(): number {
    if (!this.isUsingSynth && this.audioEl && !isNaN(this.audioEl.currentTime)) {
      return Math.round(this.audioEl.currentTime * 1000);
    }
    return Math.round(this.synthPausedAtMs);
  }

  public getDurationMs(): number {
    return this.totalDurationMs;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // Fallback high-fidelity Web Audio chord & clock generator
  private fallbackToSynth(startAtMs: number): void {
    this.isUsingSynth = true;
    if (this.audioEl) {
      this.audioEl.pause();
    }
    if (this.isPlaying) {
      this.startSynth(startAtMs);
    }
  }

  private startSynth(startAtMs: number): void {
    this.initAudioContext();
    this.synthStartTimeMs = performance.now() - (startAtMs / this.playbackRate);

    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);

    const updateClock = () => {
      if (!this.isPlaying || !this.isUsingSynth) return;

      const elapsed = (performance.now() - this.synthStartTimeMs) * this.playbackRate;
      this.synthPausedAtMs = elapsed;

      if (elapsed >= this.totalDurationMs) {
        this.pause();
        this.synthPausedAtMs = this.totalDurationMs;
        this.notifyTimeUpdate(this.totalDurationMs, this.totalDurationMs);
        this.notifyEnded();
        return;
      }

      this.notifyTimeUpdate(Math.round(elapsed), this.totalDurationMs);
      this.animFrameId = requestAnimationFrame(updateClock);
    };

    this.animFrameId = requestAnimationFrame(updateClock);
    this.playAmbientChord();
  }

  private pauseSynth(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.synthInterval !== null) {
      window.clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  private initAudioContext(): void {
    if (typeof window === 'undefined') return;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
        this.synthGain = this.audioCtx.createGain();
        this.synthGain.gain.setValueAtTime(this.volume * 0.08, this.audioCtx.currentTime);
        this.synthGain.connect(this.audioCtx.destination);
      }
    } else if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private playAmbientChord(): void {
    if (!this.audioCtx || !this.synthGain) return;

    try {
      // Pleasant harmonic frequencies (A minor / C major pentatonic base notes)
      const freqs = [220, 261.63, 329.63, 392.0];
      const now = this.audioCtx.currentTime;

      freqs.forEach((f, idx) => {
        if (!this.audioCtx || !this.synthGain) return;
        const osc = this.audioCtx.createOscillator();
        const noteGain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.exponentialRampToValueAtTime(0.04 / (idx + 1), now + 0.1);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(noteGain);
        noteGain.connect(this.synthGain);

        osc.start(now);
        osc.stop(now + 1.3);
      });
    } catch {
      // Ignore Web Audio errors if audio policy blocks
    }
  }
}
