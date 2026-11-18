import {
  formatTimestampTTML,
  type TTMLDocument,
  type TTMLLine,
  type TTMLMetadata,
} from '@brus-lyrics/shared-types';

export interface ParsedLrcInterval {
  beginMs: number;
  endMs: number;
  text: string;
}

export function parseLrcIntervals(lrc: string, totalDurationMs?: number): ParsedLrcInterval[] {
  if (!lrc || typeof lrc !== 'string') return [];

  const rawEntries: { timeMs: number; text: string }[] = [];
  const lines = lrc.split(/\r?\n/);
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    timeRegex.lastIndex = 0;
    const matches: { timeMs: number }[] = [];
    let match: RegExpExecArray | null;

    while ((match = timeRegex.exec(trimmed)) !== null) {
      const minutes = parseInt(match[1] || '0', 10);
      const seconds = parseInt(match[2] || '0', 10);
      const millisRaw = match[3] || '000';
      const millis = parseInt(millisRaw.padEnd(3, '0').slice(0, 3), 10);
      const timeMs = minutes * 60000 + seconds * 1000 + millis;
      matches.push({ timeMs });
    }

    if (matches.length > 0) {
      const text = trimmed.replace(timeRegex, '').trim();
      for (const m of matches) {
        rawEntries.push({ timeMs: m.timeMs, text });
      }
    }
  }

  rawEntries.sort((a, b) => a.timeMs - b.timeMs);

  const intervals: ParsedLrcInterval[] = [];
  for (let i = 0; i < rawEntries.length; i++) {
    const current = rawEntries[i]!;
    let endMs: number;

    if (i + 1 < rawEntries.length) {
      endMs = rawEntries[i + 1]!.timeMs;
    } else if (totalDurationMs && totalDurationMs > current.timeMs) {
      endMs = totalDurationMs;
    } else {
      endMs = current.timeMs + 4000;
    }

    if (endMs <= current.timeMs) {
      endMs = current.timeMs + 2000;
    }

    if (current.text.length > 0) {
      intervals.push({
        beginMs: current.timeMs,
        endMs,
        text: current.text,
      });
    }
  }

  return intervals;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseWordTimestamp(tag: string): number {
  const m = tag.match(/<(\d{2}):(\d{2})(?:\.(\d{2,3}))?>/);
  if (!m) return 0;
  const minutes = parseInt(m[1] || '0', 10);
  const seconds = parseInt(m[2] || '0', 10);
  const millisRaw = m[3] || '000';
  const millis = parseInt(millisRaw.padEnd(3, '0').slice(0, 3), 10);
  return minutes * 60000 + seconds * 1000 + millis;
}

export function lrcToTTML(lrc: string, metadata?: TTMLMetadata): string {
  const meta = metadata || {};
  const duration = meta.durationMs || 0;
  const intervals = parseLrcIntervals(lrc, duration);

  const effectiveDuration = duration > 0
    ? duration
    : intervals.length > 0
    ? intervals[intervals.length - 1]!.endMs
    : 0;

  const title = escapeXml(meta.title || 'Unknown Title');
  const artist = escapeXml(meta.artist || 'Unknown Artist');
  const album = meta.album ? `<itunes:album>${escapeXml(meta.album)}</itunes:album>\n    ` : '';
  const spotifyId = meta.spotifyId ? `<itunes:spotifyId>${escapeXml(meta.spotifyId)}</itunes:spotifyId>\n    ` : '';
  const ytmId = meta.ytmId ? `<itunes:youtubeId>${escapeXml(meta.ytmId)}</itunes:youtubeId>\n    ` : '';
  const isrc = meta.isrc ? `<itunes:isrc>${escapeXml(meta.isrc)}</itunes:isrc>\n    ` : '';
  const contributor = escapeXml(meta.contributor || 'Community');

  const linesXml = intervals
    .map((interval) => {
      const bStr = formatTimestampTTML(interval.beginMs);
      const eStr = formatTimestampTTML(interval.endMs);
      const rawText = interval.text;

      // Check if word-level syllable timestamps exist: <mm:ss.xx> word
      if (/<(\d{2}):(\d{2})(?:\.(\d{2,3}))?>/.test(rawText)) {
        const wordTagRegex = /<(\d{2}:\d{2}(?:\.\d{2,3})?)>\s*([^<]+)/g;
        const wordMatches: { begin: number; text: string }[] = [];
        let wordMatch: RegExpExecArray | null;

        while ((wordMatch = wordTagRegex.exec(rawText)) !== null) {
          if (wordMatch[1] && wordMatch[2]) {
            const timeTag = `<${wordMatch[1]}>`;
            wordMatches.push({
              begin: parseWordTimestamp(timeTag),
              text: wordMatch[2],
            });
          }
        }

        if (wordMatches.length > 0) {
          const spans = wordMatches.map((wm, wIdx) => {
            const nextWm = wordMatches[wIdx + 1];
            const wEnd = nextWm ? nextWm.begin : interval.endMs;
            const wbStr = formatTimestampTTML(wm.begin);
            const weStr = formatTimestampTTML(Math.max(wm.begin + 50, wEnd));
            let wText = wm.text;
            if (wIdx < wordMatches.length - 1 && !wText.endsWith(' ')) {
              wText += ' ';
            }
            return `        <span begin="${wbStr}" end="${weStr}">${escapeXml(wText)}</span>`;
          }).join('\n');
          return `      <p begin="${bStr}" end="${eStr}" ttm:agent="v1">\n${spans}\n      </p>`;
        }
      }

      const text = escapeXml(rawText.replace(/<[^>]+>/g, '').trim());
      return `      <p begin="${bStr}" end="${eStr}" ttm:agent="v1">\n        <span begin="${bStr}" end="${eStr}">${text}</span>\n      </p>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml"
    xmlns:ttm="http://www.w3.org/ns/ttml#metadata"
    xmlns:itunes="http://music.apple.com/lyric-ttml-extensions"
    xml:lang="en">
  <head>
    <metadata>
      <ttm:title>${title}</ttm:title>
      <ttm:agent>${artist}</ttm:agent>
      ${album}${spotifyId}${ytmId}${isrc}<itunes:duration>${formatTimestampTTML(effectiveDuration)}</itunes:duration>
      <itunes:contributor>${contributor}</itunes:contributor>
    </metadata>
  </head>
  <body dur="${formatTimestampTTML(effectiveDuration)}">
    <div>
${linesXml}
    </div>
  </body>
</tt>`.trim();
}

export function lrcToTTMLDocument(lrc: string, metadata?: TTMLMetadata): TTMLDocument {
  const meta: TTMLMetadata = { ...(metadata || {}) };
  const intervals = parseLrcIntervals(lrc, meta.durationMs);

  const lines: TTMLLine[] = intervals.map((interval, idx) => ({
    id: `line_${idx + 1}`,
    begin: interval.beginMs,
    end: interval.endMs,
    agent: 'v1',
    text: interval.text,
    syllables: [
      {
        begin: interval.beginMs,
        end: interval.endMs,
        text: interval.text,
      },
    ],
  }));

  if (!meta.durationMs && intervals.length > 0) {
    meta.durationMs = intervals[intervals.length - 1]!.endMs;
  }

  const rawXml = lrcToTTML(lrc, meta);

  return {
    metadata: meta,
    lines,
    rawXml,
  };
}
