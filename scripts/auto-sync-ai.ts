import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TTMLLine, TTMLSyllable } from '@brus-lyrics/shared-types';
import { serializeStudioToTTML } from '../packages/sync-studio/src/lib/ttml-serializer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export interface AlignmentWord {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface AlignmentResult {
  lines: TTMLLine[];
  ttmlXml: string;
}

// Estimate syllable count of an English/Spanish word for cadence weighting
export function estimateSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-zñáéíóúü]/g, '');
  if (!clean) return 1;
  if (clean.length <= 3) return 1;
  const matches = clean.match(/[aeiouyáéíóúü]+/g);
  return matches ? Math.max(1, matches.length) : 1;
}

// Perform forced alignment using Whisper API if API key exists, or phonetic rhythm alignment
export async function alignLyricsWithAudio(
  audioFilePath: string,
  lyricsText: string,
  options: {
    apiKey?: string;
    durationMs?: number;
    title?: string;
    artist?: string;
  } = {}
): Promise<AlignmentResult> {
  const linesRaw = lyricsText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const totalDurationMs = options.durationMs || 180000;

  let whisperWords: AlignmentWord[] = [];
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;

  if (apiKey && fs.existsSync(audioFilePath)) {
    try {
      console.log('[AI Auto-Sync] Querying Whisper API for word-level timestamps...');
      const fileBuffer = fs.readFileSync(audioFilePath);
      const blob = new Blob([fileBuffer]);
      const formData = new FormData();
      formData.append('file', blob, path.basename(audioFilePath));
      formData.append('model', process.env.GROQ_API_KEY ? 'whisper-large-v3' : 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'word');

      const endpoint = process.env.GROQ_API_KEY
        ? 'https://api.groq.com/openai/v1/audio/transcriptions'
        : 'https://api.openai.com/v1/audio/transcriptions';

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (resp.ok) {
        const json: any = await resp.json();
        if (json.words && Array.isArray(json.words)) {
          whisperWords = json.words.map((w: any) => ({
            word: w.word,
            start: w.start,
            end: w.end,
          }));
          console.log(`[AI Auto-Sync] Successfully aligned ${whisperWords.length} words via Whisper API.`);
        }
      }
    } catch (err: any) {
      console.warn('[AI Auto-Sync] Remote Whisper call failed, using cadence alignment engine:', err.message);
    }
  }

  // Generate TTMLLines
  const structuredLines: TTMLLine[] = [];
  let currentWordIdx = 0;

  // Lead-in intro estimation (typically 8-15% of track before vocals start)
  const introDurationMs = Math.round(totalDurationMs * 0.08);
  const singingDurationMs = totalDurationMs - introDurationMs - Math.round(totalDurationMs * 0.05);

  // Compute total syllables across all lines to distribute time proportionately
  const lineSyllableCounts = linesRaw.map((lineStr) => {
    const words = lineStr.trim().split(/\s+/);
    return words.reduce((acc, w) => acc + estimateSyllables(w), 0);
  });
  const totalSyllables = lineSyllableCounts.reduce((a, b) => a + b, 0) || 1;

  let currentLineStartMs = introDurationMs;

  for (let lIdx = 0; lIdx < linesRaw.length; lIdx++) {
    const lineText = linesRaw[lIdx]!.trim();
    const words = lineText.split(/\s+/);
    const lineSyllables = lineSyllableCounts[lIdx] || 1;

    // Time budget for this line
    const lineTimeBudgetMs = Math.round((lineSyllables / totalSyllables) * singingDurationMs);
    const lineEndMs = currentLineStartMs + lineTimeBudgetMs;

    const syllables: TTMLSyllable[] = [];
    let wordStartMs = currentLineStartMs;

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const wordText = words[wIdx]!;
      const sylCount = estimateSyllables(wordText);
      const isLastWordInLine = wIdx === words.length - 1;

      let wordBegin: number;
      let wordEnd: number;

      // If we have Whisper word timestamps available, match them
      if (currentWordIdx < whisperWords.length) {
        const matched = whisperWords[currentWordIdx]!;
        wordBegin = Math.round(matched.start * 1000);
        wordEnd = Math.round(matched.end * 1000);
        currentWordIdx++;
      } else {
        // High-precision cadence interpolation
        const wordDuration = Math.round((sylCount / lineSyllables) * lineTimeBudgetMs * 0.88);
        wordBegin = wordStartMs;
        wordEnd = wordBegin + Math.max(160, wordDuration);
        wordStartMs = wordEnd + 40; // subtle inter-word gap
      }

      syllables.push({
        begin: wordBegin,
        end: wordEnd,
        text: isLastWordInLine ? wordText : `${wordText} `,
      });
    }

    const calculatedBegin = syllables[0]?.begin ?? currentLineStartMs;
    const calculatedEnd = syllables[syllables.length - 1]?.end ?? lineEndMs;

    structuredLines.push({
      id: `line_${lIdx + 1}`,
      begin: calculatedBegin,
      end: calculatedEnd,
      agent: 'v1',
      text: lineText,
      syllables,
    });

    // Inter-line pause
    currentLineStartMs = calculatedEnd + 600;
  }

  const metadata = {
    title: options.title || 'Untitled',
    artist: options.artist || 'Unknown Artist',
    durationMs: totalDurationMs,
  };

  const ttmlXml = serializeStudioToTTML(metadata, structuredLines);

  return {
    lines: structuredLines,
    ttmlXml,
  };
}

// CLI usage support
if (process.argv[1] && process.argv[1].endsWith('auto-sync-ai.ts')) {
  const args = process.argv.slice(2);
  const audioArg = args[0] || 'database/sample.mp3';
  const lyricsArg = args[1] || 'Compa que le parece esa morra\nLa que anda bailando sola';

  alignLyricsWithAudio(audioArg, lyricsArg, { title: 'Auto-Sync Song', artist: 'Auto Artist' })
    .then((result) => {
      console.log(`[AI Auto-Sync] Generated ${result.lines.length} aligned lines:`);
      for (const line of result.lines) {
        console.log(`[${line.begin} -> ${line.end}] ${line.text}`);
      }
    })
    .catch((err) => {
      console.error('[AI Auto-Sync] Error:', err);
      process.exit(1);
    });
}
