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
      // Line-level: split into words and distribute or create single-line syllable
      const words = cur.rawText.split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const wordDuration = Math.max(100, Math.floor((lineEnd - lineBegin) / words.length));
        for (let w = 0; w < words.length; w++) {
          const wBegin = lineBegin + w * wordDuration;
          const wEnd = w === words.length - 1 ? lineEnd : wBegin + wordDuration;
          syllables.push({
            begin: wBegin,
            end: wEnd,
            text: w < words.length - 1 ? `${words[w]} ` : words[w]!,
          });
        }
      } else {
        syllables.push({
          begin: lineBegin,
          end: lineEnd,
          text: cur.rawText,
        });
      }
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
 * Parses Apple Music / W3C TTML XML string
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
      const rawLines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const lines: TTMLLine[] = rawLines.map((lineStr, lineIdx) => {
        const words = lineStr.trim().split(/\s+/);
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
          text: lineStr.trim(),
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
