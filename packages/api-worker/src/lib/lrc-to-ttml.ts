import { formatTimestampTTML } from '@brus-lyrics/shared-types';

export interface LrcMetadata {
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
}

interface ParsedLrcLine {
  beginMs: number;
  endMs: number;
  text: string;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function parseLrcTimestamps(lrcText: string, totalDurationMs?: number): ParsedLrcLine[] {
  if (!lrcText) return [];

  const lines = lrcText.split(/\r?\n/);
  const parsed: { beginMs: number; text: string }[] = [];

  const timeRegex = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    timeRegex.lastIndex = 0;
    const matches = [...line.matchAll(timeRegex)];
    if (matches.length === 0) continue;

    const textOnly = line.replace(timeRegex, '').trim();

    for (const match of matches) {
      const hours = match[1] ? parseInt(match[1], 10) : 0;
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseInt(match[3] || '0', 10);
      const millisRaw = match[4] || '0';
      const millis = parseInt(millisRaw.padEnd(3, '0').slice(0, 3), 10);
      const beginMs = hours * 3600000 + minutes * 60000 + seconds * 1000 + millis;

      if (textOnly.length > 0) {
        parsed.push({ beginMs, text: textOnly });
      }
    }
  }

  // Sort ascending by time
  parsed.sort((a, b) => a.beginMs - b.beginMs);

  // Compute endMs for each line
  const result: ParsedLrcLine[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const current = parsed[i]!;
    let endMs: number;

    if (i + 1 < parsed.length) {
      const next = parsed[i + 1]!;
      if (next.beginMs > current.beginMs) {
        // End at next line begin or cap at current + 7000ms
        endMs = Math.min(next.beginMs, current.beginMs + 7000);
      } else {
        endMs = current.beginMs + 2000;
      }
    } else {
      if (totalDurationMs && totalDurationMs > current.beginMs) {
        endMs = Math.min(totalDurationMs, current.beginMs + 5000);
      } else {
        endMs = current.beginMs + 4000;
      }
    }

    if (endMs <= current.beginMs) {
      endMs = current.beginMs + 1000;
    }

    result.push({
      beginMs: current.beginMs,
      endMs,
      text: current.text,
    });
  }

  return result;
}

export function convertLrcToTTML(lrcText: string, metadata: LrcMetadata): string {
  const lines = parseLrcTimestamps(lrcText, metadata.durationMs);

  const titleEsc = escapeXml(metadata.title || 'Unknown Title');
  const artistEsc = escapeXml(metadata.artist || 'Unknown Artist');
  const durationXml = metadata.durationMs
    ? `\n      <itunes:duration>${metadata.durationMs}</itunes:duration>`
    : '';

  const paragraphsXml = lines
    .map((line) => {
      const beginStr = formatTimestampTTML(line.beginMs);
      const endStr = formatTimestampTTML(line.endMs);
      const textEsc = escapeXml(line.text);
      return `      <p begin="${beginStr}" end="${endStr}" ttm:agent="v1">\n        <span begin="${beginStr}" end="${endStr}">${textEsc}</span>\n      </p>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml"
    xmlns:ttm="http://www.w3.org/ns/ttml#metadata"
    xmlns:itunes="http://music.apple.com/lyric-ttml-extensions"
    xml:lang="en">
  <head>
    <metadata>
      <ttm:title>${titleEsc}</ttm:title>
      <ttm:agent type="person" xml:id="v1">${artistEsc}</ttm:agent>${durationXml}
      <itunes:contributor>lrclib-fallback</itunes:contributor>
    </metadata>
  </head>
  <body>
    <div>
${paragraphsXml}
    </div>
  </body>
</tt>
`;
}
