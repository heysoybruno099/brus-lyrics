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

/**
 * Parses JSON lyrics format
 */
export function parseJsonLyrics(content: string, totalDurationMs?: number): {
  metadata: Partial<TTMLMetadata>;
  lines: TTMLLine[];
  mode: SyncMode;
} {
  const data = JSON.parse(content);
  const metadata: Partial<TTMLMetadata> = {};

  if (data.metadata) {
    if (data.metadata.title) metadata.title = data.metadata.title;
    if (data.metadata.artist) metadata.artist = data.metadata.artist;
    if (data.metadata.album) metadata.album = data.metadata.album;
    if (data.metadata.durationMs) metadata.durationMs = Number(data.metadata.durationMs);
  } else {
    if (data.title) metadata.title = data.title;
    if (data.artist) metadata.artist = data.artist;
    if (data.album) metadata.album = data.album;
    if (data.durationMs) metadata.durationMs = Number(data.durationMs);
  }

  let rawLines: any[] = [];
  if (Array.isArray(data)) {
    rawLines = data;
  } else if (Array.isArray(data.lines)) {
    rawLines = data.lines;
  } else if (data.lyrics && Array.isArray(data.lyrics.lines)) {
    rawLines = data.lyrics.lines;
  }

  let hasSyllables = false;
  const lines: TTMLLine[] = [];

  const toMs = (val: any): number => {
    if (typeof val === 'number') {
      return val < 1000 ? Math.round(val * 1000) : Math.round(val);
    }
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        return parsed < 1000 && val.includes('.') ? Math.round(parsed * 1000) : Math.round(parsed);
      }
      return parseTimestampTTML(val);
    }
    return 0;
  };

  for (let i = 0; i < rawLines.length; i++) {
    const item = rawLines[i];
    if (!item) continue;

    const beginMs = toMs(item.begin ?? item.startTimeMs ?? item.time ?? item.start ?? 0);
    const nextItem = rawLines[i + 1];
    const nextBegin = nextItem ? toMs(nextItem.begin ?? nextItem.startTimeMs ?? nextItem.time ?? nextItem.start ?? 0) : 0;
    const endMs = toMs(item.end ?? item.endTimeMs ?? (nextBegin > beginMs ? nextBegin : beginMs + 3500));

    const lineText = item.text ?? item.words ?? item.content ?? '';
    const syllables: TTMLSyllable[] = [];

    const wordItems = item.words || item.syllables || item.tokens;
    if (Array.isArray(wordItems) && wordItems.length > 0) {
      hasSyllables = true;
      for (const w of wordItems) {
        const wBegin = toMs(w.begin ?? w.start ?? w.startTimeMs ?? beginMs);
        const wEnd = toMs(w.end ?? w.endTimeMs ?? (wBegin + 300));
        const wText = w.text ?? w.word ?? w.syllable ?? '';
        syllables.push({
          begin: wBegin,
          end: Math.max(wBegin + 50, wEnd),
          text: wText,
        });
      }
    } else {
      const words = String(lineText).trim().split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const dur = Math.max(100, Math.floor((endMs - beginMs) / words.length));
        for (let w = 0; w < words.length; w++) {
          const wb = beginMs + w * dur;
          const we = w === words.length - 1 ? endMs : wb + dur;
          syllables.push({
            begin: wb,
            end: we,
            text: w < words.length - 1 ? `${words[w]} ` : words[w]!,
          });
        }
      } else {
        syllables.push({
          begin: beginMs,
          end: endMs,
          text: String(lineText),
        });
      }
    }

    const agent: VocalAgent = item.agent === 'v2' ? 'v2' : 'v1';
    lines.push({
      id: item.id || `line_${i + 1}`,
      begin: beginMs,
      end: endMs,
      agent,
      text: String(lineText),
      syllables,
    });
  }

  return {
    metadata,
    lines,
    mode: hasSyllables ? 'syllable' : 'line',
  };
}

/**
 * Parses Apple Music / W3C TTML XML string
 */
export function parseTtmlXml(content: string): {
  metadata: Partial<TTMLMetadata>;
  lines: TTMLLine[];
  mode: SyncMode;
} {
  const metadata: Partial<TTMLMetadata> = {};
  const lines: TTMLLine[] = [];
  let hasSyllables = false;

  // Extract Metadata using regex (works in browser and node)
  const titleMatch = content.match(/<ttm:title>([^<]+)<\/ttm:title>/);
  if (titleMatch && titleMatch[1]) metadata.title = titleMatch[1].trim();

  const artistMatch = content.match(/<ttm:agent[^>]*>([^<]+)<\/ttm:agent>/);
  if (artistMatch && artistMatch[1]) metadata.artist = artistMatch[1].trim();

  const albumMatch = content.match(/<itunes:album>([^<]+)<\/itunes:album>/);
  if (albumMatch && albumMatch[1]) metadata.album = albumMatch[1].trim();

  const durMatch = content.match(/<itunes:duration>([^<]+)<\/itunes:duration>/);
  if (durMatch && durMatch[1]) metadata.durationMs = parseTimestampTTML(durMatch[1]);

  const pRegex = /<p\s+([^>]*?)>([\s\S]*?)<\/p>/gi;
  let pMatch: RegExpExecArray | null;
  let lineIdx = 1;

  while ((pMatch = pRegex.exec(content)) !== null) {
    const attrs = pMatch[1] || '';
    const body = pMatch[2] || '';

    const beginMatch = attrs.match(/begin=["']([^"']+)["']/);
    const endMatch = attrs.match(/end=["']([^"']+)["']/);
    const agentMatch = attrs.match(/ttm:agent=["']([^"']+)["']/);

    const beginMs = beginMatch && beginMatch[1] ? parseTimestampTTML(beginMatch[1]) : 0;
    const endMs = endMatch && endMatch[1] ? parseTimestampTTML(endMatch[1]) : beginMs + 3500;
    const agent: VocalAgent = agentMatch && agentMatch[1] === 'v2' ? 'v2' : 'v1';

    const spanRegex = /<span\s+([^>]*?)>([\s\S]*?)<\/span>/gi;
    const syllables: TTMLSyllable[] = [];
    let spanMatch: RegExpExecArray | null;

    while ((spanMatch = spanRegex.exec(body)) !== null) {
      const sAttrs = spanMatch[1] || '';
      const sText = (spanMatch[2] || '').replace(/<[^>]+>/g, '');

      const sBeginMatch = sAttrs.match(/begin=["']([^"']+)["']/);
      const sEndMatch = sAttrs.match(/end=["']([^"']+)["']/);

      if (sBeginMatch && sBeginMatch[1]) {
        hasSyllables = true;
        const sBeginMs = parseTimestampTTML(sBeginMatch[1]);
        const sEndMs = sEndMatch && sEndMatch[1] ? parseTimestampTTML(sEndMatch[1]) : sBeginMs + 250;
        syllables.push({
          begin: sBeginMs,
          end: sEndMs,
          text: sText,
        });
      }
    }

    const cleanText = body.replace(/<[^>]+>/g, '').trim();

    if (syllables.length === 0) {
      // Line mode without inner spans
      const words = cleanText.split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const dur = Math.max(100, Math.floor((endMs - beginMs) / words.length));
        for (let w = 0; w < words.length; w++) {
          const wb = beginMs + w * dur;
          const we = w === words.length - 1 ? endMs : wb + dur;
          syllables.push({
            begin: wb,
            end: we,
            text: w < words.length - 1 ? `${words[w]} ` : words[w]!,
          });
        }
      } else {
        syllables.push({
          begin: beginMs,
          end: endMs,
          text: cleanText,
        });
      }
    }

    lines.push({
      id: `line_${lineIdx++}`,
      begin: beginMs,
      end: endMs,
      agent,
      text: cleanText,
      syllables,
    });
  }

  return {
    metadata,
    lines,
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
