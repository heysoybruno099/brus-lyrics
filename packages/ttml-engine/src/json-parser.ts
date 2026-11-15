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
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    if (!Number.isInteger(val)) {
      return val < 1000 ? Math.round(val * 1000) : Math.round(val);
    }
    return val;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    const normalized = trimmed.includes(':') ? trimmed.replace(',', '.') : trimmed;
    const parsed = parseFloat(normalized.replace(',', '.'));
    if (!isNaN(parsed) && !normalized.includes(':')) {
      return !Number.isInteger(parsed) && parsed < 1000 ? Math.round(parsed * 1000) : Math.round(parsed);
    }
    return parseTimestampTTML(normalized);
  }
  return 0;
}

/**
 * Parses real-world lyrics JSON formats, including:
 * 1. lyrics.Content array with Lead.Syllables and Background vocals (Syllable Studio format)
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

  // Resolve vocal content array across diverse tool exports
  const vocalContent =
    (data.lyrics && Array.isArray(data.lyrics.Content) && data.lyrics.Content) ||
    (data.lyrics && Array.isArray(data.lyrics.content) && data.lyrics.content) ||
    (Array.isArray(data.Content) && data.Content) ||
    (Array.isArray(data.content) && data.content) ||
    (Array.isArray(data.lyrics) && (data.lyrics[0]?.Lead || data.lyrics[0]?.lead) && data.lyrics);

  // Structure 1: Content array (Type: "Vocal", Lead: { StartTime, EndTime, Syllables }, Background?: [...])
  if (vocalContent && vocalContent.length > 0) {
    for (let i = 0; i < vocalContent.length; i++) {
      const item = vocalContent[i];
      if (!item) continue;
      const lead = item.Lead || item.lead;
      if (!lead) continue;

      const beginMs = toMs(lead.StartTime ?? lead.startTime ?? lead.start);
      const endMs = toMs(lead.EndTime ?? lead.endTime ?? lead.end);
      const syllables: TTMLSyllable[] = [];

      const rawSyllables =
        (Array.isArray(lead.Syllables) && lead.Syllables) ||
        (Array.isArray(lead.syllables) && lead.syllables) ||
        (Array.isArray(lead.tokens) && lead.tokens) ||
        (Array.isArray(lead.Tokens) && lead.Tokens) ||
        (Array.isArray(lead.words) && lead.words) ||
        (Array.isArray(lead.Words) && lead.Words) ||
        [];
      if (Array.isArray(rawSyllables) && rawSyllables.length > 0) {
        hasSyllables = true;
        for (let s = 0; s < rawSyllables.length; s++) {
          const syl = rawSyllables[s];
          const sylBegin = toMs(syl.StartTime ?? syl.startTime ?? syl.start ?? syl.time ?? beginMs);
          const sylEnd = toMs(
            syl.EndTime ??
              syl.endTime ??
              syl.end ??
              (rawSyllables[s + 1]
                ? toMs(rawSyllables[s + 1].StartTime ?? rawSyllables[s + 1].startTime ?? rawSyllables[s + 1].start)
                : endMs)
          );
          let sylText = sanitizeText(syl.Text ?? syl.text ?? syl.word ?? syl.Word);

          // If syllable is the end of a word, ensure a trailing space so word boundaries are preserved
          if (syl.IsPartOfWord === false || syl.isPartOfWord === false) {
            sylText = sylText.trimEnd() + ' ';
          } else if (
            syl.IsPartOfWord !== true &&
            syl.isPartOfWord !== true &&
            s < rawSyllables.length - 1 &&
            !sylText.endsWith(' ')
          ) {
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
      const rawSub1 = item.subtext ?? item.subText ?? item.sub_text ?? item.translation ?? lead.subtext ?? lead.subText;
      if (rawSub1 && typeof rawSub1 === 'string' && rawSub1.trim()) {
        const subClean = sanitizeText(rawSub1).trim();
        bgLines.push({
          id: `line_${i + 1}_sub`,
          begin: beginMs,
          end: endMs,
          agent: 'v1',
          role: 'x-bg',
          text: subClean,
          syllables: [{ begin: beginMs, end: endMs, text: subClean, role: 'x-bg' }],
        });
      }
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
    (Array.isArray(data.draft.lines) || Array.isArray(data.draft.Lines)) &&
    ((data.draft.lines && data.draft.lines.length > 0) || (data.draft.Lines && data.draft.Lines.length > 0))
  ) {
    const draftLines = data.draft.lines || data.draft.Lines;
    for (let i = 0; i < draftLines.length; i++) {
      const item = draftLines[i];
      if (!item) continue;

      const beginMs = toMs(item.start ?? item.StartTime ?? item.startTime ?? item.begin ?? 0);
      const endMs = toMs(item.end ?? item.EndTime ?? item.endTime ?? item.endMs ?? beginMs + 3500);
      const syllables: TTMLSyllable[] = [];

      const tokens =
        (Array.isArray(item.tokens) && item.tokens) ||
        (Array.isArray(item.Tokens) && item.Tokens) ||
        (Array.isArray(item.syllables) && item.syllables) ||
        (Array.isArray(item.Syllables) && item.Syllables) ||
        (Array.isArray(item.words) && item.words) ||
        (Array.isArray(item.Words) && item.Words) ||
        [];
      if (Array.isArray(tokens) && tokens.length > 0) {
        hasSyllables = true;
        for (let t = 0; t < tokens.length; t++) {
          const tok = tokens[t];
          const nextTok = tokens[t + 1];
          const tokBegin = toMs(tok.start ?? tok.StartTime ?? tok.startTime ?? tok.begin ?? beginMs);
          const tokEnd =
            tok.end !== undefined && tok.end !== null
              ? toMs(tok.end)
              : tok.EndTime !== undefined && tok.EndTime !== null
              ? toMs(tok.EndTime)
              : tok.endTime !== undefined && tok.endTime !== null
              ? toMs(tok.endTime)
              : nextTok
              ? toMs(nextTok.start ?? nextTok.StartTime ?? nextTok.startTime ?? nextTok.begin)
              : endMs;
          let tokText = sanitizeText(tok.text ?? tok.Text ?? tok.word ?? tok.Word);

          if (tok.isPartOfWord === false || tok.IsPartOfWord === false) {
            tokText = tokText.trimEnd() + ' ';
          } else if (t < tokens.length - 1 && !tokText.endsWith(' ')) {
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
      const rawSub2 = item.subtext ?? item.subText ?? item.sub_text ?? item.translation;
      if (rawSub2 && typeof rawSub2 === 'string' && rawSub2.trim()) {
        const subClean = sanitizeText(rawSub2).trim();
        bgLines.push({
          id: `line_${i + 1}_sub`,
          begin: beginMs,
          end: endMs,
          agent: 'v1',
          role: 'x-bg',
          text: subClean,
          syllables: [{ begin: beginMs, end: endMs, text: subClean, role: 'x-bg' }],
        });
      }
      const rawBackground = item.backgrounds || item.Background || item.Backgrounds;
      if (Array.isArray(rawBackground) && rawBackground.length > 0) {
        for (let b = 0; b < rawBackground.length; b++) {
          const bgItem = rawBackground[b];
          if (!bgItem) continue;
          const bgBegin = toMs(bgItem.start ?? bgItem.StartTime ?? bgItem.startTime ?? beginMs);
          const bgEnd = toMs(bgItem.end ?? bgItem.EndTime ?? bgItem.endTime ?? endMs);
          const bgSyllables: TTMLSyllable[] = [];
          const bgTokens = bgItem.tokens || bgItem.Tokens || bgItem.Syllables || bgItem.syllables || [];

          for (let t = 0; t < bgTokens.length; t++) {
            const tok = bgTokens[t];
            const nextTok = bgTokens[t + 1];
            const tokBegin = toMs(tok.start ?? tok.StartTime ?? tok.startTime ?? bgBegin);
            const tokEnd =
              (tok.end !== undefined && tok.end !== null) || (tok.EndTime !== undefined && tok.EndTime !== null)
                ? toMs(tok.end ?? tok.EndTime ?? tok.endTime)
                : nextTok
                ? toMs(nextTok.start ?? nextTok.StartTime ?? nextTok.startTime)
                : bgEnd;
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
      : Array.isArray(data.Lines)
      ? data.Lines
      : Array.isArray(data.lyrics?.lines)
      ? data.lyrics.lines
      : Array.isArray(data.lyrics?.Lines)
      ? data.lyrics.Lines
      : Array.isArray(data.lyrics)
      ? data.lyrics
      : [];

    for (let i = 0; i < rawLines.length; i++) {
      const item = rawLines[i];
      if (!item) continue;

      const beginMs = toMs(item.begin ?? item.startTimeMs ?? item.startTime ?? item.StartTime ?? item.time ?? item.start ?? 0);
      const nextItem = rawLines[i + 1];
      const nextBegin = nextItem
        ? toMs(nextItem.begin ?? nextItem.startTimeMs ?? nextItem.startTime ?? nextItem.StartTime ?? nextItem.time ?? nextItem.start ?? 0)
        : 0;
      const endMs = toMs(item.end ?? item.endTimeMs ?? item.endTime ?? item.EndTime ?? (nextBegin > beginMs ? nextBegin : beginMs + 3500));

      const lineText = sanitizeText(item.text ?? item.Text ?? item.words ?? item.content ?? '').trim();
      const syllables: TTMLSyllable[] = [];

      const wordItems =
        (Array.isArray(item.syllables) && item.syllables) ||
        (Array.isArray(item.Syllables) && item.Syllables) ||
        (Array.isArray(item.tokens) && item.tokens) ||
        (Array.isArray(item.Tokens) && item.Tokens) ||
        (Array.isArray(item.words) && item.words) ||
        (Array.isArray(item.Words) && item.Words) ||
        [];
      if (Array.isArray(wordItems) && wordItems.length > 0) {
        hasSyllables = true;
        for (let w = 0; w < wordItems.length; w++) {
          const word = wordItems[w];
          const nextWord = wordItems[w + 1];
          const wBegin = toMs(word.begin ?? word.start ?? word.StartTime ?? word.startTime ?? word.startTimeMs ?? word.time ?? beginMs);
          const wEnd = toMs(
            word.end ??
              word.endTimeMs ??
              word.endTime ??
              word.EndTime ??
              (nextWord ? toMs(nextWord.begin ?? nextWord.start ?? nextWord.StartTime ?? nextWord.startTime ?? nextWord.startTimeMs ?? nextWord.time) : endMs)
          );
          let wText = sanitizeText(word.text ?? word.Text ?? word.word ?? word.Word ?? word.syllable ?? word.content ?? '');

          if (word.isPartOfWord === false || word.IsPartOfWord === false) {
            wText = wText.trimEnd() + ' ';
          } else if (w < wordItems.length - 1 && !wText.endsWith(' ')) {
            wText += ' ';
          }

          syllables.push({
            begin: wBegin,
            end: Math.max(wBegin + 50, wEnd),
            text: wText,
          });
        }
      } else {
        // Line-level sync: preserve as one line, do not synthesize fake word syncs
        syllables.push({
          begin: beginMs,
          end: endMs,
          text: lineText,
        });
      }

      // Extract subtext / background vocals in Structure 3
      const bgLines: TTMLLine[] = [];
      const rawSub = item.subtext ?? item.subText ?? item.sub_text ?? item.translation;
      if (rawSub && typeof rawSub === 'string' && rawSub.trim()) {
        const subClean = sanitizeText(rawSub).trim();
        bgLines.push({
          id: `line_${i + 1}_sub`,
          begin: beginMs,
          end: endMs,
          agent: 'v1',
          role: 'x-bg',
          text: subClean,
          syllables: [
            {
              begin: beginMs,
              end: endMs,
              text: subClean,
              role: 'x-bg',
            },
          ],
        });
      }

      const rawBg = item.backgroundVocals || item.background || item.backgrounds;
      if (Array.isArray(rawBg) && rawBg.length > 0) {
        for (let b = 0; b < rawBg.length; b++) {
          const bgItem = rawBg[b];
          if (!bgItem) continue;
          const bgBegin = toMs(bgItem.begin ?? bgItem.start ?? beginMs);
          const bgEnd = toMs(bgItem.end ?? bgItem.endTimeMs ?? endMs);
          const bgText = sanitizeText(bgItem.text ?? bgItem.words ?? '').trim();
          const bgSyllables: TTMLSyllable[] = [];
          const bgTokens = bgItem.syllables || bgItem.words || bgItem.tokens || [];
          if (Array.isArray(bgTokens) && bgTokens.length > 0) {
            for (let t = 0; t < bgTokens.length; t++) {
              const tok = bgTokens[t];
              const tBegin = toMs(tok.begin ?? tok.start ?? bgBegin);
              const tEnd = toMs(tok.end ?? tok.endTimeMs ?? bgEnd);
              let tText = sanitizeText(tok.text ?? tok.word ?? '');
              if (t < bgTokens.length - 1 && !tText.endsWith(' ')) tText += ' ';
              bgSyllables.push({
                begin: tBegin,
                end: Math.max(tBegin + 50, tEnd),
                text: tText,
                role: 'x-bg',
              });
            }
          } else if (bgText) {
            bgSyllables.push({
              begin: bgBegin,
              end: bgEnd,
              text: bgText,
              role: 'x-bg',
            });
          }
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

      const agent: VocalAgent = item.agent === 'v2' ? 'v2' : 'v1';
      lines.push({
        id: item.id || `line_${i + 1}`,
        begin: beginMs,
        end: endMs,
        agent,
        text: lineText,
        syllables,
        ...(bgLines.length > 0 ? { backgroundVocals: bgLines } : {}),
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
 * Converts a parsed JSON payload or JSON string to standard TTML XML
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
          const bgSpans =
            bg.syllables && bg.syllables.length > 0
              ? bg.syllables
                  .map((s) => {
                    const sbStr = formatTimestampTTML(s.begin);
                    const seStr = formatTimestampTTML(s.end);
                    return `          <span begin="${sbStr}" end="${seStr}">${escapeXml(s.text)}</span>`;
                  })
                  .join('\n')
              : `          <span begin="${bgBegin}" end="${bgEnd}">${escapeXml(bg.text)}</span>`;
          bgXml += `\n        <span begin="${bgBegin}" end="${bgEnd}" ttm:role="x-bg">\n${bgSpans}\n        </span>`;
        }
      }

      return `      <p begin="${lineBegin}" end="${lineEnd}"${agentAttr}>\n${spansXml}${bgXml}\n      </p>`;
    })
    .join('\n');

  const lang = escapeXml(meta.language || 'en');

  return `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml"
    xmlns:ttm="http://www.w3.org/ns/ttml#metadata"
    xmlns:itunes="http://music.apple.com/lyric-ttml-extensions"
    xml:lang="${lang}">
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
