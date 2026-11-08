import type { TTMLDocument, TTMLLine } from '@brus-lyrics/shared-types';

export interface RendererOptions {
  getCurrentTimeMs?: () => number;
  onSeek?: (timestampMs: number) => void;
  enableAmbient?: boolean;
  enableSpringScroll?: boolean;
  targetHeightRatio?: number; // Defaults to 0.35 (35% container height)
}

interface SyllableDomRef {
  container: HTMLElement;
  fill: HTMLElement;
  begin: number;
  end: number;
}

interface LineDomRef {
  element: HTMLElement;
  line: TTMLLine;
  syllables: SyllableDomRef[];
  bgLines: {
    element: HTMLElement;
    syllables: SyllableDomRef[];
  }[];
}

export class BrusLyricsRenderer {
  private container: HTMLElement;
  private options: Required<RendererOptions>;
  private document: TTMLDocument | null = null;
  private lineRefs: LineDomRef[] = [];
  private ambientEl: HTMLElement | null = null;
  private viewportEl: HTMLElement | null = null;
  private trackEl: HTMLElement | null = null;

  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private internalCurrentTimeMs: number = 0;
  private currentScrollY: number = 0;
  private targetScrollY: number = 0;
  private activeLineIndex: number = -1;

  constructor(container: HTMLElement, options: RendererOptions = {}) {
    this.container = container;
    this.options = {
      getCurrentTimeMs: options.getCurrentTimeMs || (() => this.internalCurrentTimeMs),
      onSeek: options.onSeek || (() => {}),
      enableAmbient: options.enableAmbient ?? true,
      enableSpringScroll: options.enableSpringScroll ?? true,
      targetHeightRatio: options.targetHeightRatio ?? 0.35,
    };

    this.initDom();
  }

  private initDom(): void {
    if (typeof document === 'undefined') return;

    this.container.classList.add('brus-lyrics-container');
    this.container.innerHTML = '';

    if (this.options.enableAmbient) {
      this.ambientEl = document.createElement('div');
      this.ambientEl.className = 'brus-lyrics-ambient';
      this.container.appendChild(this.ambientEl);
    }

    this.viewportEl = document.createElement('div');
    this.viewportEl.className = 'brus-lyrics-viewport';

    this.trackEl = document.createElement('div');
    this.trackEl.className = 'brus-lyrics-track';

    this.viewportEl.appendChild(this.trackEl);
    this.container.appendChild(this.viewportEl);

    this.renderEmptyState();
  }

  private renderEmptyState(): void {
    if (!this.trackEl || typeof document === 'undefined') return;
    this.trackEl.innerHTML = `
      <div class="brus-empty-state">
        <span>No lyrics loaded</span>
      </div>
    `;
  }

  public setDocument(doc: TTMLDocument): void {
    this.document = doc;
    this.lineRefs = [];
    this.activeLineIndex = -1;
    this.currentScrollY = 0;
    this.targetScrollY = 0;

    if (!this.trackEl || typeof document === 'undefined') return;
    this.trackEl.innerHTML = '';

    if (!doc.lines || doc.lines.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Build DOM structure for each line
    for (let i = 0; i < doc.lines.length; i++) {
      const line = doc.lines[i]!;
      const lineEl = document.createElement('div');
      lineEl.className = 'brus-line is-unsung';
      lineEl.setAttribute('data-index', String(i));
      lineEl.setAttribute('data-agent', line.agent || 'v1');
      lineEl.setAttribute('data-begin', String(line.begin));
      lineEl.setAttribute('data-end', String(line.end));

      // Click to seek line
      lineEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.options.onSeek(line.begin);
      });

      const contentEl = document.createElement('div');
      contentEl.className = 'brus-line-content';

      const syllableRefs: SyllableDomRef[] = [];

      for (const syl of line.syllables) {
        const wordEl = document.createElement('span');
        wordEl.className = 'brus-word is-unsung';
        wordEl.setAttribute('data-begin', String(syl.begin));
        wordEl.setAttribute('data-end', String(syl.end));

        const fillEl = document.createElement('span');
        fillEl.className = 'brus-word-fill';
        fillEl.textContent = syl.text;

        wordEl.appendChild(fillEl);

        wordEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.options.onSeek(syl.begin);
        });

        contentEl.appendChild(wordEl);
        syllableRefs.push({
          container: wordEl,
          fill: fillEl,
          begin: syl.begin,
          end: syl.end,
        });
      }

      lineEl.appendChild(contentEl);

      // Render secondary background vocals if present
      const bgRefs: { element: HTMLElement; syllables: SyllableDomRef[] }[] = [];
      if (line.backgroundVocals && line.backgroundVocals.length > 0) {
        const bgContainer = document.createElement('div');
        bgContainer.className = 'brus-bg-vocals';

        for (const bgLine of line.backgroundVocals) {
          const bgLineEl = document.createElement('div');
          bgLineEl.className = 'brus-bg-line';

          const bgSyllableRefs: SyllableDomRef[] = [];
          for (const bgSyl of bgLine.syllables) {
            const bgWordEl = document.createElement('span');
            bgWordEl.className = 'brus-word is-unsung';

            const bgFillEl = document.createElement('span');
            bgFillEl.className = 'brus-word-fill';
            bgFillEl.textContent = bgSyl.text;

            bgWordEl.appendChild(bgFillEl);

            bgWordEl.addEventListener('click', (e) => {
              e.stopPropagation();
              this.options.onSeek(bgSyl.begin);
            });

            bgLineEl.appendChild(bgWordEl);
            bgSyllableRefs.push({
              container: bgWordEl,
              fill: bgFillEl,
              begin: bgSyl.begin,
              end: bgSyl.end,
            });
          }

          bgContainer.appendChild(bgLineEl);
          bgRefs.push({
            element: bgLineEl,
            syllables: bgSyllableRefs,
          });
        }

        lineEl.appendChild(bgContainer);
      }

      this.trackEl.appendChild(lineEl);
      this.lineRefs.push({
        element: lineEl,
        line,
        syllables: syllableRefs,
        bgLines: bgRefs,
      });
    }

    // Prominently render contributor attribution at bottom of lyrics
    const contributor = doc.metadata?.contributor || 'Community';
    const attributionEl = document.createElement('div');
    attributionEl.className = 'brus-lyrics-attribution';
    attributionEl.innerHTML = `
      <div class="brus-attribution-card">
        <span class="brus-attribution-text">Synced by @${contributor.replace(/[&<>"']/g, '')}</span>
        <span class="brus-verified-badge" title="Verified Creator">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
          </svg>
          <span>VERIFIED</span>
        </span>
      </div>
    `;
    this.trackEl.appendChild(attributionEl);

    this.update();
  }

  public setThemeAmbient(color1: string, color2: string): void {
    if (this.container) {
      this.container.style.setProperty('--theme-ambient-1', color1);
      this.container.style.setProperty('--theme-ambient-2', color2);
    }
  }

  public setCurrentTimeMs(timeMs: number): void {
    this.internalCurrentTimeMs = timeMs;
    this.update();
  }

  public getCurrentTimeMs(): number {
    return this.options.getCurrentTimeMs();
  }

  public getActiveLineIndex(): number {
    return this.activeLineIndex;
  }

  public seek(timeMs: number): void {
    this.internalCurrentTimeMs = timeMs;
    this.update();
  }

  public play(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  public pause(): void {
    this.isRunning = false;
    if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    this.update();
    if (typeof requestAnimationFrame !== 'undefined') {
      this.animFrameId = requestAnimationFrame(this.loop);
    }
  };

  public update(): void {
    if (!this.document || this.lineRefs.length === 0) return;

    const currentTime = this.options.getCurrentTimeMs();

    // Find active line index
    let activeIdx = -1;
    for (let i = 0; i < this.lineRefs.length; i++) {
      const line = this.lineRefs[i]!.line;
      if (currentTime >= line.begin && currentTime <= line.end) {
        activeIdx = i;
        break;
      }
      if (currentTime < line.begin) {
        activeIdx = Math.max(0, i - 1);
        break;
      }
    }

    if (activeIdx === -1 && currentTime >= this.lineRefs[this.lineRefs.length - 1]!.line.end) {
      activeIdx = this.lineRefs.length - 1;
    }

    this.activeLineIndex = activeIdx;

    // Update lines classes and word progress
    for (let i = 0; i < this.lineRefs.length; i++) {
      const lineRef = this.lineRefs[i]!;
      const line = lineRef.line;
      const el = lineRef.element;

      const isCurrent = i === activeIdx;
      const isPast = currentTime > line.end;
      const isFuture = currentTime < line.begin;
      const distance = Math.abs(i - activeIdx);

      el.classList.toggle('is-active', isCurrent);
      el.classList.toggle('is-past', isPast);
      el.classList.toggle('is-unsung', isFuture);
      el.classList.toggle('is-inactive', !isCurrent && distance === 1);
      el.classList.toggle('is-distant', !isCurrent && distance > 1);

      // Syllable fill calculation
      for (const sylRef of lineRef.syllables) {
        this.updateSyllableProgress(sylRef, currentTime);
      }

      // Background vocal syllables
      for (const bgRef of lineRef.bgLines) {
        for (const bgSyl of bgRef.syllables) {
          this.updateSyllableProgress(bgSyl, currentTime);
        }
      }
    }

    // Centering & Spring Scroll Physics
    if (this.viewportEl && this.trackEl && activeIdx >= 0) {
      const activeLineEl = this.lineRefs[activeIdx]?.element;
      if (activeLineEl) {
        const viewportHeight = this.viewportEl.clientHeight || 500;
        const targetOffset = viewportHeight * this.options.targetHeightRatio;
        const lineOffsetTop = activeLineEl.offsetTop;

        this.targetScrollY = lineOffsetTop - targetOffset;
        if (this.targetScrollY < 0) this.targetScrollY = 0;

        if (this.options.enableSpringScroll) {
          // Smooth spring interpolation
          const delta = this.targetScrollY - this.currentScrollY;
          this.currentScrollY += delta * 0.14;
        } else {
          this.currentScrollY = this.targetScrollY;
        }

        this.trackEl.style.transform = `translate3d(0, ${-Math.round(this.currentScrollY)}px, 0)`;
      }
    }
  }

  private updateSyllableProgress(sylRef: SyllableDomRef, currentTime: number): void {
    const { container, fill, begin, end } = sylRef;

    if (currentTime < begin) {
      container.classList.remove('is-singing', 'is-sung');
      container.classList.add('is-unsung');
      fill.style.setProperty('--word-progress', '0');
    } else if (currentTime >= end) {
      container.classList.remove('is-singing', 'is-unsung');
      container.classList.add('is-sung');
      fill.style.setProperty('--word-progress', '1');
    } else {
      container.classList.remove('is-unsung', 'is-sung');
      container.classList.add('is-singing');
      const duration = end - begin;
      const progress = duration > 0 ? (currentTime - begin) / duration : 1;
      const clamped = Math.max(0, Math.min(1, progress));
      fill.style.setProperty('--word-progress', clamped.toFixed(3));
    }
  }

  public destroy(): void {
    this.pause();
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.lineRefs = [];
    this.document = null;
  }
}
