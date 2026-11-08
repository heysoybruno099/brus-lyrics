import {
  cleanTrackId,
  formatTimestampTTML,
  parseTimestampTTML,
  type TTMLDocument,
  type TTMLLine,
  type TTMLMetadata,
  type TTMLSyllable,
  type VocalAgent,
} from '@brus-lyrics/shared-types';

export type SyncMode = 'line' | 'syllable';

export interface ParseJsonLyricsResult {
  metadata: Partial<TTMLMetadata>;
  lines: TTMLLine[];
  mode: SyncMode;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeText(raw: any): string {
  if (raw === null || raw === undefined) return '';
  return String(raw).replace(/\u200b/g, '');
}

function toMs(val: any): number {
  if (typeof val === 'number') {
    return val < 1000 && !Number.isInteger(val) ? Math.round(val * 1000) : Math.round(val);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed) && !trimmed.includes(':')) {
      return parsed < 1000 && trimmed.includes('.') ? Math.round(parsed * 1000) : Math.round(parsed);
    }
    return parseTimestampTTML(trimmed);
  }
  return 0;
}

/**
 * Parses real-world lyrics JSON formats, including:
 * 1. lyrics.Content array with Lead.Syllables and Background vocals (Apple Music / Musixmatch / Syllable Studio format)
 * 2. draft.lines array with tokens and backgrounds
 * 3. Standard lines array with word/syllable/token objects
 *
 * Automatically sanitizes zero-width spaces (\u200b), normalizes timing bounds, and preserves background vocals.
 */
export function parseJsonLyrics(
  content: string | Record<string, any>,
  totalDurationMs?: number
): ParseJsonLyricsResult {
  const data: Record<string, any> =
    typeof content === 'string' ? JSON.parse(content) : content;

  const metadata: Partial<TTMLMetadata> = {};

  // Extract Metadata from header / nested objects
  const rawMeta = data.metadata || data;
  if (rawMeta.title) metadata.title = sanitizeText(rawMeta.title).trim();
  if (rawMeta.artist) metadata.artist = sanitizeText(rawMeta.artist).trim();
  if (rawMeta.album) metadata.album = sanitizeText(rawMeta.album).trim();
  if (rawMeta.durationMs) metadata.durationMs = toMs(rawMeta.durationMs);

  const rawTrackId = data.trackId || data.trackUri || rawMeta.spotifyId || rawMeta.spotify_id;
  if (rawTrackId) {
    metadata.spotifyId = cleanTrackId(String(rawTrackId));
  }

  const rawYtmId = data.ytmId || data.youtubeId || rawMeta.ytm_id || rawMeta.youtube_id;
  if (rawYtmId) {
    metadata.ytmId = cleanTrackId(String(rawYtmId));
  }

  if (rawMeta.contributor) {
    metadata.contributor = sanitizeText(rawMeta.contributor).trim();
  }

  if (data.platformTarget || rawMeta.platformTarget) {
    metadata.platformTarget = data.platformTarget || rawMeta.platformTarget;
  }

  const lines: TTMLLine[] = [];
  let hasSyllables = false;

  // Structure 1: data.lyrics.Content (Type: "Vocal", Lead: { StartTime, EndTime, Syllables }, Background?: [...])
  if (
    data.lyrics &&
    Array.isArray(data.lyrics.Content) &&
    data.lyrics.Content.length > 0
  ) {
    for (let i = 0; i < data.lyrics.Content.length; i++) {
      const item = data.lyrics.Content[i];
      if (!item || !item.Lead) continue;

      const lead = item.Lead;
      const beginMs = toMs(lead.StartTime);
      const endMs = toMs(lead.EndTime);
      const syllables: TTMLSyllable[] = [];

      const rawSyllables = lead.Syllables || [];
      if (Array.isArray(rawSyllables) && rawSyllables.length > 0) {
        hasSyllables = true;
        for (let s = 0; s < rawSyllables.length; s++) {
          const syl = rawSyllables[s];
          const sylBegin = toMs(syl.StartTime);
          const sylEnd = toMs(syl.EndTime);
          let sylText = sanitizeText(syl.Text);

          // If syllable is the end of a word, ensure a trailing space so word boundaries are preserved
          if (syl.IsPartOfWord === false) {
            sylText = sylText.trimEnd() + ' ';
          }

          syllables.push({
            begin: sylBegin,
            end: Math.max(sylBegin + 50, sylEnd),
            text: sylText,
          });
        }
      }

      // Extract Background vocals if present in item.Background
      const bgLines: TTMLLine[] = [];
      const rawBackground = item.Background || item.background || item.backgrounds;
      if (Array.isArray(rawBackground) && rawBackground.length > 0) {
        for (let b = 0; b < rawBackground.length; b++) {
          const bgItem = rawBackground[b];
          if (!bgItem) continue;
          const bgBegin = toMs(bgItem.StartTime ?? bgItem.start ?? beginMs);
          const bgEnd = toMs(bgItem.EndTime ?? bgItem.end ?? endMs);
          const bgSyllables: TTMLSyllable[] = [];
          const bgRawSyllables = bgItem.Syllables || bgItem.syllables || bgItem.tokens || [];

          for (let bs = 0; bs < bgRawSyllables.length; bs++) {
            const syl = bgRawSyllables[bs];
            const sylBegin = toMs(syl.StartTime ?? syl.start ?? bgBegin);
            const sylEnd = toMs(
              syl.EndTime ??
                syl.end ??
                (bgRawSyllables[bs + 1]
                  ? toMs(bgRawSyllables[bs + 1].StartTime ?? bgRawSyllables[bs + 1].start)
                  : bgEnd)
            );
            let sylText = sanitizeText(syl.Text ?? syl.text);
            if (syl.IsPartOfWord === false || (bs < bgRawSyllables.length - 1 && !sylText.endsWith(' '))) {
              sylText = sylText.trimEnd() + ' ';
            }
            bgSyllables.push({
              begin: sylBegin,
              end: Math.max(sylBegin + 50, sylEnd),
              text: sylText,
              role: 'x-bg',
            });
          }

          const bgText =
            bgSyllables.map((s) => s.text).join('').trim() ||
            sanitizeText(bgItem.text || '').trim();

          bgLines.push({
            id: `line_${i + 1}_bg_${b + 1}`,
            begin: bgBegin,
            end: bgEnd,
            agent: 'v1',
            role: 'x-bg',
            text: bgText,
            syllables: bgSyllables,
          });
        }
      }

      const lineText =
        syllables.map((s) => s.text).join('').trim() ||
        sanitizeText(lead.Text || lead.text || '').trim();

      const agent: VocalAgent = item.OppositeAligned ? 'v2' : 'v1';

      lines.push({
        id: `line_${i + 1}`,
        begin: beginMs,
        end: endMs,
        agent,
        text: lineText,
        syllables:
          syllables.length > 0
            ? syllables
            : [
                {
                  begin: beginMs,
                  end: endMs,
                  text: lineText,
                },
              ],
        ...(bgLines.length > 0 ? { backgroundVocals: bgLines } : {}),
      });
    }
  }
  // Structure 2: data.draft.lines (Array of { text, start, end, tokens: [ { text, start } ], backgrounds?: [...] })
  else if (
    data.draft &&
    Array.isArray(data.draft.lines) &&
    data.draft.lines.length > 0
  ) {
    for (let i = 0; i < data.draft.lines.length; i++) {
      const item = data.draft.lines[i];
      if (!item) continue;

      const beginMs = toMs(item.start);
      const endMs = toMs(item.end);
      const syllables: TTMLSyllable[] = [];

      const tokens = item.tokens || [];
      if (Array.isArray(tokens) && tokens.length > 0) {
        hasSyllables = true;
        for (let t = 0; t < tokens.length; t++) {
          const tok = tokens[t];
          const nextTok = tokens[t + 1];
          const tokBegin = toMs(tok.start);
          const tokEnd = nextTok ? toMs(nextTok.start) : endMs;
          let tokText = sanitizeText(tok.text);

          if (t < tokens.length - 1) {
            tokText = tokText.trimEnd() + ' ';
          }

          syllables.push({
            begin: tokBegin,
            end: Math.max(tokBegin + 50, tokEnd),
            text: tokText,
          });
        }
      }

      // Extract Background vocals in draft.lines (item.backgrounds)
      const bgLines: TTMLLine[] = [];
      const rawBackground = item.backgrounds || item.Background;
      if (Array.isArray(rawBackground) && rawBackground.length > 0) {
        for (let b = 0; b < rawBackground.length; b++) {
          const bgItem = rawBackground[b];
          if (!bgItem) continue;
          const bgBegin = toMs(bgItem.start ?? bgItem.StartTime ?? beginMs);
          const bgEnd = toMs(bgItem.end ?? bgItem.EndTime ?? endMs);
          const bgSyllables: TTMLSyllable[] = [];
          const bgTokens = bgItem.tokens || bgItem.Syllables || [];

          for (let t = 0; t < bgTokens.length; t++) {
            const tok = bgTokens[t];
            const nextTok = bgTokens[t + 1];
            const tokBegin = toMs(tok.start ?? tok.StartTime ?? bgBegin);
            const tokEnd = nextTok ? toMs(nextTok.start ?? nextTok.StartTime) : bgEnd;
            let tokText = sanitizeText(tok.text ?? tok.Text);
            if (t < bgTokens.length - 1) tokText = tokText.trimEnd() + ' ';
            bgSyllables.push({
              begin: tokBegin,
              end: Math.max(tokBegin + 50, tokEnd),
              text: tokText,
              role: 'x-bg',
            });
          }

          const bgText =
            sanitizeText(bgItem.text).trim() ||
            bgSyllables.map((s) => s.text).join('').trim();

          bgLines.push({
            id: `line_${i + 1}_bg_${b + 1}`,
            begin: bgBegin,
            end: bgEnd,
            agent: 'v1',
            role: 'x-bg',
            text: bgText,
            syllables: bgSyllables,
          });
        }
      }

      const lineText =
        sanitizeText(item.text).trim() ||
        syllables.map((s) => s.text).join('').trim();

      lines.push({
        id: `line_${i + 1}`,
        begin: beginMs,
        end: endMs,
        agent: 'v1',
        text: lineText,
        syllables:
          syllables.length > 0
            ? syllables
            : [
                {
                  begin: beginMs,
                  end: endMs,
                  text: lineText,
                },
              ],
        ...(bgLines.length > 0 ? { backgroundVocals: bgLines } : {}),
      });
    }
  }
  // Structure 3: Standard raw lines (Array or data.lines)
  else {
    const rawLines: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data.lines)
      ? data.lines
      : [];

    for (let i = 0; i < rawLines.length; i++) {
      const item = rawLines[i];
      if (!item) continue;

      const beginMs = toMs(item.begin ?? item.startTimeMs ?? item.time ?? item.start ?? 0);
      const nextItem = rawLines[i + 1];
      const nextBegin = nextItem
        ? toMs(nextItem.begin ?? nextItem.startTimeMs ?? nextItem.time ?? nextItem.start ?? 0)
        : 0;
      const endMs = toMs(item.end ?? item.endTimeMs ?? (nextBegin > beginMs ? nextBegin : beginMs + 3500));

      const lineText = sanitizeText(item.text ?? item.words ?? item.content ?? '').trim();
      const syllables: TTMLSyllable[] = [];

      const wordItems = item.words || item.syllables || item.tokens;
      if (Array.isArray(wordItems) && wordItems.length > 0) {
        hasSyllables = true;
        for (let w = 0; w < wordItems.length; w++) {
          const word = wordItems[w];
          const nextWord = wordItems[w + 1];
          const wBegin = toMs(word.begin ?? word.start ?? word.startTimeMs ?? beginMs);
          const wEnd = toMs(word.end ?? word.endTimeMs ?? (nextWord ? toMs(nextWord.begin ?? nextWord.start) : endMs));
          let wText = sanitizeText(word.text ?? word.word ?? word.syllable ?? '');

          if (w < wordItems.length - 1 && !wText.endsWith(' ')) {
            wText += ' ';
          }

          syllables.push({
            begin: wBegin,
            end: Math.max(wBegin + 50, wEnd),
            text: wText,
          });
        }
      } else {
        const words = lineText.split(/\s+/).filter(Boolean);
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
            text: lineText,
          });
        }
      }

      const agent: VocalAgent = item.agent === 'v2' ? 'v2' : 'v1';
      lines.push({
        id: item.id || `line_${i + 1}`,
        begin: beginMs,
        end: endMs,
        agent,
        text: lineText,
        syllables,
      });
    }
  }

  if (!metadata.durationMs) {
    if (totalDurationMs && totalDurationMs > 0) {
      metadata.durationMs = totalDurationMs;
    } else if (lines.length > 0) {
      metadata.durationMs = lines[lines.length - 1]!.end;
    }
  }

  return {
    metadata,
    lines,
    mode: hasSyllables ? 'syllable' : 'line',
  };
}

/**
 * Converts a parsed JSON payload or JSON string to standard Apple Music TTML XML
 */
export function jsonToTTML(
  content: string | Record<string, any>,
  overrides?: {
    contributor?: string;
    ytmId?: string;
    spotifyId?: string;
    platformTarget?: 'both' | 'spotify' | 'ytm';
  }
): string {
  const parsed = parseJsonLyrics(content);
  const meta: TTMLMetadata = {
    ...parsed.metadata,
    ...(overrides || {}),
  };

  const title = escapeXml(meta.title || 'Unknown Title');
  const artist = escapeXml(meta.artist || 'Unknown Artist');
  const durationMs = meta.durationMs || (parsed.lines.length > 0 ? parsed.lines[parsed.lines.length - 1]!.end : 0);
  const durStr = formatTimestampTTML(durationMs);

  const albumTag = meta.album ? `\n      <itunes:album>${escapeXml(meta.album)}</itunes:album>` : '';
  const spotifyTag = meta.spotifyId ? `\n      <itunes:spotifyId>${escapeXml(meta.spotifyId)}</itunes:spotifyId>` : '';
  const ytmTag = meta.ytmId ? `\n      <itunes:youtubeId>${escapeXml(meta.ytmId)}</itunes:youtubeId>` : '';
  const isrcTag = meta.isrc ? `\n      <itunes:isrc>${escapeXml(meta.isrc)}</itunes:isrc>` : '';
  const platformTargetTag = meta.platformTarget ? `\n      <itunes:platformTarget>${escapeXml(meta.platformTarget)}</itunes:platformTarget>` : '';
  const contributorTag = `\n      <itunes:contributor>${escapeXml(meta.contributor || 'Community')}</itunes:contributor>`;

  const linesXml = parsed.lines
    .map((line) => {
      const lineBegin = formatTimestampTTML(line.begin);
      const lineEnd = formatTimestampTTML(line.end);
      const agentAttr = line.agent ? ` ttm:agent="${line.agent}"` : '';

      const spansXml = (line.syllables || [])
        .map((s) => {
          const sBegin = formatTimestampTTML(s.begin);
          const sEnd = formatTimestampTTML(s.end);
          return `        <span begin="${sBegin}" end="${sEnd}">${escapeXml(s.text)}</span>`;
        })
        .join('\n');

      let bgXml = '';
      if (line.backgroundVocals && line.backgroundVocals.length > 0) {
        for (const bg of line.backgroundVocals) {
          const bgBegin = formatTimestampTTML(bg.begin);
          const bgEnd = formatTimestampTTML(bg.end);
          const bgSpans = bg.syllables
            .map((s) => {
              const sbStr = formatTimestampTTML(s.begin);
              const seStr = formatTimestampTTML(s.end);
              return `          <span begin="${sbStr}" end="${seStr}">${escapeXml(s.text)}</span>`;
            })
            .join('\n');
          bgXml += `\n        <span begin="${bgBegin}" end="${bgEnd}" ttm:role="x-bg">\n${bgSpans}\n        </span>`;
        }
      }

      return `      <p begin="${lineBegin}" end="${lineEnd}"${agentAttr}>\n${spansXml}${bgXml}\n      </p>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml"
    xmlns:ttm="http://www.w3.org/ns/ttml#metadata"
    xmlns:itunes="http://music.apple.com/lyric-ttml-extensions"
    xml:lang="es">
  <head>
    <metadata>
      <ttm:title>${title}</ttm:title>
      <ttm:agent>${artist}</ttm:agent>${albumTag}${spotifyTag}${ytmTag}${isrcTag}${platformTargetTag}
      <itunes:duration>${durStr}</itunes:duration>${contributorTag}
    </metadata>
  </head>
  <body dur="${durStr}">
    <div>
${linesXml}
    </div>
  </body>
</tt>`.trim();
}

/**
 * Converts a parsed JSON payload or string directly into a TTMLDocument
 */
export function jsonToTTMLDocument(
  content: string | Record<string, any>,
  overrides?: {
    contributor?: string;
    ytmId?: string;
    spotifyId?: string;
    platformTarget?: 'both' | 'spotify' | 'ytm';
  }
): TTMLDocument {
  const parsed = parseJsonLyrics(content);
  const metadata: TTMLMetadata = {
    ...parsed.metadata,
    ...(overrides || {}),
  };

  const rawXml = jsonToTTML(content, overrides);

  return {
    metadata,
    lines: parsed.lines,
    rawXml,
  };
}
