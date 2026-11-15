import {
  cleanYouTubeTitle,
  parseTimestampTTML,
  type TTMLDocument,
  type TTMLLine,
  type TTMLMetadata,
  type TTMLSyllable,
  type VocalAgent,
} from '@brus-lyrics/shared-types';

function extractTagValue(xml: string, tagName: string): string | undefined {
  const escaped = tagName.replace(':', '\\:');
  const regex = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i');
  const match = xml.match(regex);
  if (!match || match[1] === undefined) return undefined;
  const raw = match[1].trim();
  const clean = raw.replace(/<[^>]+>/g, '').trim();
  return clean.length > 0 ? clean : undefined;
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z0-9:_-]+)\s*=\s*(?:["']([^"']*)["']|([^\s>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrString)) !== null) {
    const key = match[1]!.toLowerCase();
    const val = match[2] !== undefined ? match[2] : match[3] ?? '';
    attrs[key] = val;
  }
  return attrs;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

function parseSyllableSpan(
  spanAttrs: Record<string, string>,
  innerText: string,
  trailing: string = ''
): TTMLSyllable {
  const beginStr = spanAttrs['begin'] || '0';
  const endStr = spanAttrs['end'] || beginStr;
  const role = spanAttrs['ttm:role'] || spanAttrs['role'];

  let cleanText = decodeXmlEntities(innerText.replace(/<[^>]+>/g, ''));
  if (trailing) {
    const normTrailing = trailing.replace(/\s+/g, ' ');
    if (!cleanText.endsWith(' ') && normTrailing.startsWith(' ')) {
      cleanText += normTrailing;
    } else if (!cleanText.endsWith(' ') && normTrailing.length > 0) {
      cleanText += normTrailing;
    }
  }

  return {
    begin: parseTimestampTTML(beginStr),
    end: parseTimestampTTML(endStr),
    text: cleanText,
    ...(role ? { role } : {}),
  };
}

interface SpanNode {
  attrs: Record<string, string>;
  innerContent: string;
  trailing: string;
}

function parseTopLevelSpans(content: string): SpanNode[] {
  const nodes: SpanNode[] = [];
  let cursor = 0;
  const spanStartRegex = /<(?:[a-zA-Z0-9_-]+:)?span\b/gi;
  const spanCloseRegex = /<\/(?:[a-zA-Z0-9_-]+:)?span>/gi;

  while (cursor < content.length) {
    spanStartRegex.lastIndex = cursor;
    const match = spanStartRegex.exec(content);
    if (!match) break;

    const spanStart = match.index;
    const matchLen = match[0].length;

    const tagClose = content.indexOf('>', spanStart + matchLen);
    if (tagClose === -1) break;

    const isSelfClosing = content[tagClose - 1] === '/';
    const attrStr = content.slice(spanStart + matchLen, isSelfClosing ? tagClose - 1 : tagClose);
    const attrs = parseAttributes(attrStr);

    if (isSelfClosing) {
      nodes.push({ attrs, innerContent: '', trailing: '' });
      cursor = tagClose + 1;
      continue;
    }

    let depth = 1;
    let searchPos = tagClose + 1;
    let endPos = -1;
    let closeTagLen = 7;

    while (searchPos < content.length) {
      spanStartRegex.lastIndex = searchPos;
      const nextOpenMatch = spanStartRegex.exec(content);
      spanCloseRegex.lastIndex = searchPos;
      const nextCloseMatch = spanCloseRegex.exec(content);

      if (!nextCloseMatch) break;

      if (nextOpenMatch && nextOpenMatch.index < nextCloseMatch.index) {
        depth++;
        searchPos = nextOpenMatch.index + nextOpenMatch[0].length;
      } else {
        depth--;
        if (depth === 0) {
          endPos = nextCloseMatch.index;
          closeTagLen = nextCloseMatch[0].length;
          break;
        }
        searchPos = nextCloseMatch.index + nextCloseMatch[0].length;
      }
    }

    if (endPos !== -1) {
      const innerContent = content.slice(tagClose + 1, endPos);
      const afterSpan = endPos + closeTagLen;
      spanStartRegex.lastIndex = afterSpan;
      const nextSpanMatch = spanStartRegex.exec(content);
      const nextSpan = nextSpanMatch ? nextSpanMatch.index : -1;
      const interSpan = nextSpan !== -1 ? content.slice(afterSpan, nextSpan) : '';
      const cleanInterSpan = interSpan.replace(/<[^>]+>/g, '');
      const trailing = cleanInterSpan.replace(/\s+/g, ' ');

      nodes.push({ attrs, innerContent, trailing });
      cursor = nextSpan !== -1 ? nextSpan : content.length;
    } else {
      cursor = tagClose + 1;
    }
  }

  return nodes;
}

export function parseTTML(rawXml: string): TTMLDocument {
  if (!rawXml || typeof rawXml !== 'string') {
    return {
      metadata: {},
      lines: [],
      rawXml: '',
    };
  }

  const metadata: TTMLMetadata = {};

  const rawTitle =
    extractTagValue(rawXml, 'ttm:title') ||
    extractTagValue(rawXml, 'itunes:title') ||
    extractTagValue(rawXml, 'title');
  const rawArtist =
    extractTagValue(rawXml, 'ttm:agent') ||
    extractTagValue(rawXml, 'itunes:artist') ||
    extractTagValue(rawXml, 'artist');

  if (rawTitle) {
    const decodedTitle = decodeXmlEntities(rawTitle);
    const decodedArtist = rawArtist ? decodeXmlEntities(rawArtist) : undefined;
    const cleaned = cleanYouTubeTitle(decodedTitle, decodedArtist);
    metadata.title = cleaned.title;
    if (cleaned.artist) {
      metadata.artist = cleaned.artist;
    } else if (decodedArtist) {
      metadata.artist = decodedArtist;
    }
  } else if (rawArtist) {
    metadata.artist = decodeXmlEntities(rawArtist);
  }

  const album =
    extractTagValue(rawXml, 'ttm:album') ||
    extractTagValue(rawXml, 'itunes:album') ||
    extractTagValue(rawXml, 'album');
  if (album) metadata.album = decodeXmlEntities(album);

  const durationRaw =
    extractTagValue(rawXml, 'itunes:duration') ||
    extractTagValue(rawXml, 'duration');
  if (durationRaw) {
    const parsedDur = parseTimestampTTML(durationRaw);
    if (!isNaN(parsedDur) && parsedDur > 0) {
      metadata.durationMs = parsedDur;
    }
  }

  const spotifyId =
    extractTagValue(rawXml, 'itunes:spotifyId') ||
    extractTagValue(rawXml, 'spotifyId');
  if (spotifyId) metadata.spotifyId = spotifyId.trim();

  const ytmId =
    extractTagValue(rawXml, 'itunes:youtubeId') ||
    extractTagValue(rawXml, 'itunes:ytmId') ||
    extractTagValue(rawXml, 'youtubeId');
  if (ytmId) metadata.ytmId = ytmId.trim();

  const isrc =
    extractTagValue(rawXml, 'itunes:isrc') ||
    extractTagValue(rawXml, 'isrc');
  if (isrc) metadata.isrc = isrc.trim();

  const contributor =
    extractTagValue(rawXml, 'itunes:contributor') ||
    extractTagValue(rawXml, 'contributor');
  if (contributor) metadata.contributor = decodeXmlEntities(contributor);

  const platformTarget =
    extractTagValue(rawXml, 'itunes:platformTarget') ||
    extractTagValue(rawXml, 'platformTarget');
  if (platformTarget && (platformTarget === 'both' || platformTarget === 'spotify' || platformTarget === 'ytm')) {
    metadata.platformTarget = platformTarget as 'both' | 'spotify' | 'ytm';
  }

  const lines: TTMLLine[] = [];

  // Match all <p ...>...</p> tags (with optional namespace prefix e.g. tt:p)
  const pRegex = /<(?:[a-zA-Z0-9_-]+:)?p\b([^>]*)>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?p>/gi;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = pRegex.exec(rawXml)) !== null) {
    const pAttrsRaw = pMatch[1] || '';
    const pContent = pMatch[2] || '';
    const pAttrs = parseAttributes(pAttrsRaw);

    const lineBegin = parseTimestampTTML(pAttrs['begin'] || '0');
    const lineEnd = pAttrs['end'] ? parseTimestampTTML(pAttrs['end']) : lineBegin;

    const agentAttr = (pAttrs['ttm:agent'] || pAttrs['agent'] || 'v1').toLowerCase();
    const agent: VocalAgent = agentAttr === 'v2' ? 'v2' : 'v1';
    const lineRole = pAttrs['ttm:role'] || pAttrs['role'];

    const syllables: TTMLSyllable[] = [];
    const backgroundVocals: TTMLLine[] = [];

    const topSpans = parseTopLevelSpans(pContent);

    for (const span of topSpans) {
      const isBg = span.attrs['ttm:role'] === 'x-bg' || span.attrs['role'] === 'x-bg';

      if (isBg) {
        const childSpans = parseTopLevelSpans(span.innerContent);
        const bgSyllables: TTMLSyllable[] = [];

        if (childSpans.length > 0) {
          for (const child of childSpans) {
            const parsedSyl = parseSyllableSpan(child.attrs, child.innerContent, child.trailing);
            if (!parsedSyl.role) parsedSyl.role = 'x-bg';
            bgSyllables.push(parsedSyl);
          }
        }

        const bgBegin = span.attrs['begin']
          ? parseTimestampTTML(span.attrs['begin'])
          : (bgSyllables.length > 0 ? bgSyllables[0]!.begin : lineBegin);
        const bgEnd = span.attrs['end']
          ? parseTimestampTTML(span.attrs['end'])
          : (bgSyllables.length > 0 ? bgSyllables[bgSyllables.length - 1]!.end : lineEnd);

        if (bgSyllables.length === 0) {
          bgSyllables.push({
            begin: bgBegin,
            end: bgEnd,
            text: decodeXmlEntities(span.innerContent.replace(/<[^>]+>/g, '')),
            role: 'x-bg',
          });
        }

        const bgText = bgSyllables.map((s) => s.text).join('').trim();
        backgroundVocals.push({
          begin: bgBegin,
          end: bgEnd,
          agent,
          role: 'x-bg',
          text: bgText,
          syllables: bgSyllables,
        });
      } else {
        syllables.push(parseSyllableSpan(span.attrs, span.innerContent, span.trailing));
      }
    }

    if (topSpans.length === 0) {
      const plainText = decodeXmlEntities(pContent.replace(/<[^>]+>/g, '').trim());
      if (plainText.length > 0) {
        syllables.push({
          begin: lineBegin,
          end: lineEnd,
          text: plainText,
        });
      }
    }

    const fullLineText = syllables.map((s) => s.text).join('').trim() ||
      decodeXmlEntities(pContent.replace(/<[^>]+>/g, '').trim());

    let calculatedBegin = syllables.length > 0
      ? Math.min(lineBegin, syllables[0]!.begin)
      : lineBegin;
    let calculatedEnd = syllables.length > 0
      ? Math.max(lineEnd, syllables[syllables.length - 1]!.end)
      : lineEnd;

    for (const bg of backgroundVocals) {
      if (bg.begin < calculatedBegin) calculatedBegin = bg.begin;
      if (bg.end > calculatedEnd) calculatedEnd = bg.end;
    }

    lines.push({
      id: `line_${lines.length + 1}`,
      begin: calculatedBegin,
      end: calculatedEnd,
      agent,
      role: lineRole,
      text: fullLineText,
      syllables,
      ...(backgroundVocals.length > 0 ? { backgroundVocals } : {}),
    });
  }

  // If durationMs is not provided in metadata, compute from the last line
  if (!metadata.durationMs && lines.length > 0) {
    let maxMs = 0;
    for (const line of lines) {
      if (line.end > maxMs) maxMs = line.end;
      if (line.backgroundVocals) {
        for (const bg of line.backgroundVocals) {
          if (bg.end > maxMs) maxMs = bg.end;
        }
      }
    }
    metadata.durationMs = maxMs;
  }

  return {
    metadata,
    lines,
    rawXml,
  };
}
