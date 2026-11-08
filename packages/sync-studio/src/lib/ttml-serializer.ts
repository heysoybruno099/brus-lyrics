import {
  formatTimestampTTML,
  type TTMLDocument,
  type TTMLLine,
  type TTMLMetadata,
  type TTMLSyllable,
} from '@brus-lyrics/shared-types';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function serializeStudioToTTML(
  metadata: TTMLMetadata,
  lines: TTMLLine[]
): string {
  const duration = metadata.durationMs || (lines.length > 0 ? lines[lines.length - 1]!.end : 0);
  const durStr = formatTimestampTTML(duration);

  const title = escapeXml(metadata.title || 'Untitled');
  const artist = escapeXml(metadata.artist || 'Unknown Artist');
  const album = metadata.album ? `\n      <itunes:album>${escapeXml(metadata.album)}</itunes:album>` : '';
  const spotifyId = metadata.spotifyId ? `\n      <itunes:spotifyId>${escapeXml(metadata.spotifyId)}</itunes:spotifyId>` : '';
  const ytmId = metadata.ytmId ? `\n      <itunes:youtubeId>${escapeXml(metadata.ytmId)}</itunes:youtubeId>` : '';
  const isrc = metadata.isrc ? `\n      <itunes:isrc>${escapeXml(metadata.isrc)}</itunes:isrc>` : '';
  const contributor = escapeXml(metadata.contributor || 'community');

  const linesXml = lines
    .map((line) => {
      const bStr = formatTimestampTTML(line.begin);
      const eStr = formatTimestampTTML(line.end);
      const agent = line.agent || 'v1';

      // Separate lead syllables and x-bg syllables if mixed
      const leadSyllables: TTMLSyllable[] = [];
      const bgSyllables: TTMLSyllable[] = [];

      for (const syl of line.syllables) {
        if (syl.role === 'x-bg') {
          bgSyllables.push(syl);
        } else {
          leadSyllables.push(syl);
        }
      }

      const spansXml = leadSyllables
        .map((syl) => {
          const sbStr = formatTimestampTTML(syl.begin);
          const seStr = formatTimestampTTML(syl.end);
          return `        <span begin="${sbStr}" end="${seStr}">${escapeXml(syl.text)}</span>`;
        })
        .join('\n');

      let bgXml = '';
      if (bgSyllables.length > 0) {
        const bgBegin = formatTimestampTTML(bgSyllables[0]!.begin);
        const bgEnd = formatTimestampTTML(bgSyllables[bgSyllables.length - 1]!.end);
        const childSpans = bgSyllables
          .map((syl) => {
            const sbStr = formatTimestampTTML(syl.begin);
            const seStr = formatTimestampTTML(syl.end);
            return `          <span begin="${sbStr}" end="${seStr}">${escapeXml(syl.text)}</span>`;
          })
          .join('\n');

        bgXml = `\n        <span begin="${bgBegin}" end="${bgEnd}" ttm:role="x-bg">\n${childSpans}\n        </span>`;
      }

      return `      <p begin="${bStr}" end="${eStr}" ttm:agent="${agent}">\n${spansXml}${bgXml}\n      </p>`;
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
      <ttm:agent>${artist}</ttm:agent>${album}${spotifyId}${ytmId}${isrc}
      <itunes:duration>${durStr}</itunes:duration>
      <itunes:contributor>${contributor}</itunes:contributor>
    </metadata>
  </head>
  <body dur="${durStr}">
    <div>
${linesXml}
    </div>
  </body>
</tt>`.trim();
}

export function linesToTTMLDocument(
  metadata: TTMLMetadata,
  lines: TTMLLine[]
): TTMLDocument {
  const rawXml = serializeStudioToTTML(metadata, lines);
  return {
    metadata,
    lines,
    rawXml,
  };
}
