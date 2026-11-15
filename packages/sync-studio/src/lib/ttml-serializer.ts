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
  const platformTarget = metadata.platformTarget ? `\n      <itunes:platformTarget>${escapeXml(metadata.platformTarget)}</itunes:platformTarget>` : '';
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

      let spansXml = leadSyllables
        .map((syl) => {
          const sbStr = formatTimestampTTML(syl.begin);
          const seStr = formatTimestampTTML(syl.end);
          return `        <span begin="${sbStr}" end="${seStr}">${escapeXml(syl.text)}</span>`;
        })
        .join('\n');

      if (!spansXml && line.text) {
        spansXml = `        <span begin="${bStr}" end="${eStr}">${escapeXml(line.text)}</span>`;
      }

      let bgXml = '';
      if (line.backgroundVocals && line.backgroundVocals.length > 0) {
        for (const bg of line.backgroundVocals) {
          const bgBegin = formatTimestampTTML(bg.begin);
          const bgEnd = formatTimestampTTML(bg.end);
          const childSpans =
            bg.syllables && bg.syllables.length > 0
              ? bg.syllables
                  .map((syl) => {
                    const sbStr = formatTimestampTTML(syl.begin);
                    const seStr = formatTimestampTTML(syl.end);
                    return `          <span begin="${sbStr}" end="${seStr}">${escapeXml(syl.text)}</span>`;
                  })
                  .join('\n')
              : `          <span begin="${bgBegin}" end="${bgEnd}">${escapeXml(bg.text)}</span>`;
          bgXml += `\n        <span begin="${bgBegin}" end="${bgEnd}" ttm:role="x-bg">\n${childSpans}\n        </span>`;
        }
      } else if (bgSyllables.length > 0) {
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
      <ttm:agent>${artist}</ttm:agent>${album}${spotifyId}${ytmId}${isrc}${platformTarget}
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

function formatLrcTag(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `[${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}]`;
}

function formatWordTag(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `<${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}>`;
}

export function serializeLinesToLRC(metadata: TTMLMetadata, lines: TTMLLine[]): string {
  const headers = [
    `[ti:${metadata.title || 'Untitled'}]`,
    `[ar:${metadata.artist || 'Unknown Artist'}]`,
    metadata.album ? `[al:${metadata.album}]` : null,
    metadata.contributor ? `[by:${metadata.contributor}]` : null,
    `[re:Lyrics Syllable Sync]`,
  ].filter(Boolean).join('\n');

  const body = lines.map((line) => {
    const lineTag = formatLrcTag(line.begin);
    if (line.syllables && line.syllables.length > 0) {
      const words = line.syllables
        .map((s) => `${formatWordTag(s.begin)}${s.text}`)
        .join('');
      return `${lineTag} ${words}`;
    }
    return `${lineTag} ${line.text}`;
  }).join('\n');

  return `${headers}\n\n${body}\n`;
}

export function serializeLinesToJSON(metadata: TTMLMetadata, lines: TTMLLine[]): string {
  const trackId = metadata.spotifyId || 'local_track';
  const trackUri = metadata.spotifyId ? `spotify:track:${metadata.spotifyId}` : `local:track:${trackId}`;
  const now = Date.now();
  const dur = metadata.durationMs || (lines.length > 0 ? lines[lines.length - 1]!.end : 0);
  const isSyllable = lines.some((l) => l.syllables && l.syllables.length > 1);
  const mode = isSyllable ? 'word' : 'line';
  const lyricsType = isSyllable ? 'Syllable' : 'Line';

  const startTime = lines.length > 0 ? lines[0]!.begin : 0;
  const endTime = lines.length > 0 ? lines[lines.length - 1]!.end : dur;

  // Build lyrics.Content array conforming to Syllable Studio format with Lead and Background
  const content = lines.map((line) => {
    const leadSyllables = (line.syllables && line.syllables.length > 0
      ? line.syllables
      : [{ begin: line.begin, end: line.end, text: line.text }]
    ).map((s) => ({
      Text: s.text.trim(),
      IsPartOfWord: false,
      StartTime: s.begin,
      EndTime: s.end,
    }));

    const bgVocals =
      line.backgroundVocals && line.backgroundVocals.length > 0
        ? line.backgroundVocals.map((bg) => ({
            StartTime: bg.begin,
            EndTime: bg.end,
            Syllables: (bg.syllables && bg.syllables.length > 0
              ? bg.syllables
              : [{ begin: bg.begin, end: bg.end, text: bg.text }]
            ).map((s) => ({
              Text: s.text.trim(),
              IsPartOfWord: false,
              StartTime: s.begin,
              EndTime: s.end,
            })),
          }))
        : undefined;

    return {
      Type: 'Vocal',
      OppositeAligned: false,
      IsRTL: false,
      Lead: {
        StartTime: line.begin,
        EndTime: line.end,
        Syllables: leadSyllables,
      },
      ...(bgVocals ? { Background: bgVocals } : {}),
    };
  });

  // Build draft.lines array with tokens and subtext backgrounds
  const draftLines = lines.map((line) => {
    const tokens = (line.syllables && line.syllables.length > 0
      ? line.syllables
      : [{ begin: line.begin, end: line.end, text: line.text }]
    ).map((s) => ({
      text: s.text.trim(),
      start: s.begin,
      ...(s.end > s.begin ? { end: s.end } : {}),
    }));

    const bgText =
      line.backgroundVocals && line.backgroundVocals.length > 0
        ? line.backgroundVocals.map((bg) => bg.text.trim()).join(' ')
        : '';

    const fullText = bgText ? `${line.text.trim()} (${bgText})` : line.text.trim();

    const backgrounds =
      line.backgroundVocals && line.backgroundVocals.length > 0
        ? line.backgroundVocals.map((bg) => ({
            text: bg.text.trim(),
            tokens: (bg.syllables && bg.syllables.length > 0
              ? bg.syllables
              : [{ begin: bg.begin, end: bg.end, text: bg.text }]
            ).map((s) => ({
              text: s.text.trim(),
              start: s.begin,
              ...(s.end > s.begin ? { end: s.end } : {}),
            })),
            start: bg.begin,
            end: bg.end,
          }))
        : undefined;

    return {
      kind: 'lyric',
      text: fullText,
      tokens,
      ...(backgrounds ? { backgrounds } : {}),
      start: line.begin,
      end: line.end,
    };
  });

  const payload: Record<string, any> = {
    version: 1,
    trackId,
    trackUri,
    title: metadata.title || '',
    artist: metadata.artist || '',
    durationMs: dur,
    mode,
    updatedAt: now,
    lyrics: {
      Id: trackId,
      Type: lyricsType,
      SongWriters: [],
      Content: content,
      StartTime: startTime,
      EndTime: endTime,
      Provider: 'local',
    },
    draft: {
      trackId,
      trackUri,
      title: metadata.title || '',
      artist: metadata.artist || '',
      durationMs: dur,
      mode,
      lines: draftLines,
      endMs: endTime,
      updatedAt: now,
    },
    // Top-level metadata and lines retained for backward compatibility
    metadata: {
      title: metadata.title || '',
      artist: metadata.artist || '',
      album: metadata.album || null,
      durationMs: dur,
      spotifyId: metadata.spotifyId || null,
      ytmId: metadata.ytmId || null,
      contributor: metadata.contributor || 'Community',
    },
    lines: lines.map((l) => ({
      id: l.id,
      begin: l.begin,
      end: l.end,
      text: l.text,
      agent: l.agent || 'v1',
      role: l.role || 'lead',
      ...(l.backgroundVocals ? { backgroundVocals: l.backgroundVocals } : {}),
      syllables: l.syllables || [],
    })),
  };

  return JSON.stringify(payload, null, 2);
}

