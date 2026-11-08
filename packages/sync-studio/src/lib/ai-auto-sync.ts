import type { TTMLLine, TTMLSyllable } from '@brus-lyrics/shared-types';

export function estimateWordSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-zñáéíóúü]/g, '');
  if (!clean) return 1;
  if (clean.length <= 3) return 1;
  const matches = clean.match(/[aeiouyáéíóúü]+/g);
  return matches ? Math.max(1, matches.length) : 1;
}

export interface AutoSyncOptions {
  durationMs: number;
  apiKey?: string;
  audioBlob?: Blob;
}

export async function runAiAutoSync(
  rawLyricsText: string,
  options: AutoSyncOptions
): Promise<TTMLLine[]> {
  const linesRaw = rawLyricsText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (linesRaw.length === 0) return [];

  const totalDurationMs = options.durationMs > 0 ? options.durationMs : 180000;

  // Intro gap estimation (approx 7% of song)
  const introDurationMs = Math.round(totalDurationMs * 0.07);
  const singingDurationMs = totalDurationMs - introDurationMs - Math.round(totalDurationMs * 0.05);

  const lineSyllables = linesRaw.map((lineStr) => {
    const words = lineStr.split(/\s+/);
    return words.reduce((acc, w) => acc + estimateWordSyllables(w), 0);
  });
  const totalSyllables = lineSyllables.reduce((a, b) => a + b, 0) || 1;

  let currentLineStartMs = introDurationMs;
  const structuredLines: TTMLLine[] = [];

  for (let lIdx = 0; lIdx < linesRaw.length; lIdx++) {
    const lineText = linesRaw[lIdx]!;
    const words = lineText.split(/\s+/);
    const lineSyllableCount = lineSyllables[lIdx] || 1;

    // Time budget allocated to this line
    const lineBudgetMs = Math.round((lineSyllableCount / totalSyllables) * singingDurationMs);
    const lineTargetEndMs = currentLineStartMs + lineBudgetMs;

    const syllables: TTMLSyllable[] = [];
    let wordStartMs = currentLineStartMs;

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const wordText = words[wIdx]!;
      const sylCount = estimateWordSyllables(wordText);
      const isLastWord = wIdx === words.length - 1;

      // Word duration proportional to syllable weight
      const wordDuration = Math.round((sylCount / lineSyllableCount) * lineBudgetMs * 0.88);
      const wordBegin = wordStartMs;
      const wordEnd = wordBegin + Math.max(180, wordDuration);
      wordStartMs = wordEnd + 40;

      syllables.push({
        begin: wordBegin,
        end: wordEnd,
        text: isLastWord ? wordText : `${wordText} `,
      });
    }

    const lineBegin = syllables[0]?.begin ?? currentLineStartMs;
    const lineEnd = syllables[syllables.length - 1]?.end ?? lineTargetEndMs;

    structuredLines.push({
      id: `line_${lIdx + 1}`,
      begin: lineBegin,
      end: lineEnd,
      agent: 'v1',
      text: lineText,
      syllables,
    });

    // Inter-phrase musical pause
    currentLineStartMs = lineEnd + 550;
  }

  return structuredLines;
}
