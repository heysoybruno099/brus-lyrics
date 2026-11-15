import type { TTMLLine, TTMLMetadata, TTMLSyllable, VocalAgent } from '@brus-lyrics/shared-types';
import { formatTimestampTTML, parseTimestampTTML } from '@brus-lyrics/shared-types';

export type LyricsFormat = 'ttml' | 'lrc' | 'json' | 'text';
export type SyncMode = 'line' | 'syllable';

export interface ParseLyricsResult {
  format: LyricsFormat;
  mode: SyncMode;
  metadata: Partial<TTMLMetadata>;
  lines: TTMLLine[];
}

/**
 * Detect the lyrics format from filename and text content
 */
export function detectLyricsFormat(content: string, filename?: string): LyricsFormat {
  if (filename) {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.ttml') || lower.endsWith('.xml')) return 'ttml';
    if (lower.endsWith('.lrc')) return 'lrc';
    if (lower.endsWith('.json')) return 'json';
  }

  const trimmed = content.trim();
  if (trimmed.startsWith('<') || trimmed.includes('<tt') || trimmed.includes('xmlns="http://www.w3.org/ns/ttml"')) {
    return 'ttml';
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // not valid JSON, check others
    }
  }

  const lrcMatch = /\[\d{2}:\d{2}(?:\.\d{2,3})?\]/;
  if (lrcMatch.test(trimmed)) {
    return 'lrc';
  }

  return 'text';
}

function parseLrcTimestamp(tag: string): number {
  const m = tag.match(/\[?<?(\d{2}):(\d{2})(?:\.(\d{2,3}))?>?\]?/);
  if (!m) return 0;
  const min = parseInt(m[1] || '0', 10);
  const sec = parseInt(m[2] || '0', 10);
  const msRaw = m[3] || '000';
  const ms = parseInt(msRaw.padEnd(3, '0').slice(0, 3), 10);
  return min * 60000 + sec * 1000 + ms;
}

/**
 * Parses LRC lyrics with support for both:
 * 1. Line-level LRC: [00:15.50] Compa que le parece esa morra
 * 2. Word-level / syllable LRC: [00:15.50] <00:15.50> Compa <00:16.10> que <00:16.90> le <00:17.50> parece
 */
export function parseLrcLyrics(content: string, totalDurationMs?: number): { lines: TTMLLine[]; mode: SyncMode } {
  const rawLines = content.split(/\r?\n/);
  const lineEntries: {
    timeMs: number;
    rawText: string;
  }[] = [];

  const lineTimestampRegex = /^\[(\d{2}:\d{2}(?:\.\d{2,3})?)\](.*)$/;
  let hasWordTimestamps = false;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for ID tags like [ti:Title], [ar:Artist], [al:Album]
    if (/^\[(ti|ar|al|by|length):/i.test(trimmed)) {
      continue;
    }

    const match = trimmed.match(lineTimestampRegex);
    if (match && match[1]) {
      const timeMs = parseLrcTimestamp(match[1]);
      const rawText = (match[2] || '').trim();
      lineEntries.push({ timeMs, rawText });
      if (/<(\d{2}:\d{2}(?:\.\d{2,3})?)>/.test(rawText)) {
        hasWordTimestamps = true;
      }
    }
  }

  lineEntries.sort((a, b) => a.timeMs - b.timeMs);

  const lines: TTMLLine[] = [];

  for (let i = 0; i < lineEntries.length; i++) {
    const cur = lineEntries[i]!;
    const next = lineEntries[i + 1];
    const lineBegin = cur.timeMs;
    const lineEnd = next ? next.timeMs : (totalDurationMs && totalDurationMs > lineBegin ? totalDurationMs : lineBegin + 3500);

    const syllables: TTMLSyllable[] = [];
    const wordTagRegex = /<(\d{2}:\d{2}(?:\.\d{2,3})?)>\s*([^<]+)/g;

    let wordMatch: RegExpExecArray | null;
    let textOnly = cur.rawText;

    if (hasWordTimestamps && /<(\d{2}:\d{2}(?:\.\d{2,3})?)>/.test(cur.rawText)) {
      const wordMatches: { begin: number; text: string }[] = [];
      while ((wordMatch = wordTagRegex.exec(cur.rawText)) !== null) {
        if (wordMatch[1] && wordMatch[2]) {
          wordMatches.push({
            begin: parseLrcTimestamp(wordMatch[1]),
            text: wordMatch[2],
          });
        }
      }

      for (let w = 0; w < wordMatches.length; w++) {
        const wm = wordMatches[w]!;
        const nextWm = wordMatches[w + 1];
        const wEnd = nextWm ? nextWm.begin : lineEnd;
        syllables.push({
          begin: wm.begin,
          end: Math.max(wm.begin + 50, wEnd),
          text: wm.text,
        });
      }
      textOnly = cur.rawText.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    } else {
      // One line per sync: preserve as a single line, do not synthesize fake word syncs
      syllables.push({
        begin: lineBegin,
        end: lineEnd,
        text: cur.rawText,
      });
      textOnly = cur.rawText;
    }

    lines.push({
      id: `line_${i + 1}`,
      begin: lineBegin,
      end: lineEnd,
      agent: 'v1',
      text: textOnly || '...',
      syllables,
    });
  }

  return {
    lines,
    mode: hasWordTimestamps ? 'syllable' : 'line',
  };
}

import { parseJsonLyrics as parseEngineJsonLyrics, parseTTML } from '@brus-lyrics/ttml-engine';

/**
 * Parses JSON lyrics format using ttml-engine
 */
export function parseJsonLyrics(content: string, totalDurationMs?: number): {
  metadata: Partial<TTMLMetadata>;
  lines: TTMLLine[];
  mode: SyncMode;
} {
  return parseEngineJsonLyrics(content, totalDurationMs);
}

/**
 * Parses TTML XML string
 */
export function parseTtmlXml(content: string): {
  metadata: Partial<TTMLMetadata>;
  lines: TTMLLine[];
  mode: SyncMode;
} {
  const doc = parseTTML(content);
  const hasSyllables = doc.lines.some(
    (l) => (l.syllables && l.syllables.length > 0) || (l.backgroundVocals && l.backgroundVocals.length > 0)
  );

  return {
    metadata: doc.metadata,
    lines: doc.lines,
    mode: hasSyllables ? 'syllable' : 'line',
  };
}

/**
 * Universal multi-format entry point for TTML, LRC, and JSON lyrics
 */
export function parseMultiFormatLyrics(
  content: string,
  filename?: string,
  totalDurationMs?: number
): ParseLyricsResult {
  const format = detectLyricsFormat(content, filename);

  switch (format) {
    case 'ttml': {
      const res = parseTtmlXml(content);
      return {
        format: 'ttml',
        mode: res.mode,
        metadata: res.metadata,
        lines: res.lines,
      };
    }
    case 'lrc': {
      const res = parseLrcLyrics(content, totalDurationMs);
      return {
        format: 'lrc',
        mode: res.mode,
        metadata: {},
        lines: res.lines,
      };
    }
    case 'json': {
      const res = parseJsonLyrics(content, totalDurationMs);
      return {
        format: 'json',
        mode: res.mode,
        metadata: res.metadata,
        lines: res.lines,
      };
    }
    case 'text':
    default: {
      let rawLines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      const isSingleBlock = rawLines.length === 1;
      if (isSingleBlock && rawLines[0]!.length > 40) {
        // 1. Break by sentence punctuation (. ! ?)
        let split = rawLines[0]!
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        // 2. Fallback to clause boundaries (commas, semicolons, dashes, closing parens)
        if (split.length <= 1) {
          split = rawLines[0]!
            .split(/(?<=[,;])\s+(?=[A-Z\u00C0-\u017F0-9])|(?<=\))\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        }

        // 3. Fallback for unpunctuated single-block stream: chunk into lines of 6-8 words
        if (split.length <= 1) {
          const allWords = rawLines[0]!.split(/\s+/);
          if (allWords.length > 8) {
            split = [];
            const chunkSize = 7;
            for (let i = 0; i < allWords.length; i += chunkSize) {
              split.push(allWords.slice(i, i + chunkSize).join(' '));
            }
          }
        }

        if (split.length > 1) {
          rawLines = split;
        }
      }

      const lines: TTMLLine[] = rawLines.map((lineStr, lineIdx) => {
        // Check for simultaneous second version in parentheses: e.g. Lead (Background)
        let leadText = lineStr.trim();
        let bgVocals: TTMLLine[] | undefined;

        const parenMatch = leadText.match(/\(([^)]+)\)$/);
        if (parenMatch && parenMatch[1]) {
          const bgText = parenMatch[1].trim();
          leadText = leadText.replace(/\s*\([^)]+\)$/, '').trim();
          const bgWords = bgText.split(/\s+/).filter(Boolean);
          const bgSyllables: TTMLSyllable[] = bgWords.map((w, wIdx) => ({
            begin: 0,
            end: 0,
            text: wIdx < bgWords.length - 1 ? `${w} ` : w,
            role: 'x-bg',
          }));
          bgVocals = [
            {
              id: `line_${lineIdx + 1}_bg`,
              begin: 0,
              end: 0,
              agent: 'v2',
              role: 'x-bg',
              text: bgText,
              syllables: bgSyllables,
            },
          ];
        }

        const words = leadText.split(/\s+/).filter(Boolean);
        const syllables: TTMLSyllable[] = words.map((w, wIdx) => ({
          begin: 0,
          end: 0,
          text: wIdx < words.length - 1 ? `${w} ` : w,
        }));

        return {
          id: `line_${lineIdx + 1}`,
          begin: 0,
          end: 0,
          agent: 'v1',
          text: leadText,
          ...(bgVocals ? { backgroundVocals: bgVocals } : {}),
          syllables,
        };
      });

      return {
        format: 'text',
        mode: 'line',
        metadata: {},
        lines,
      };
    }
  }
}
