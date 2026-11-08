import {
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

  while (cursor < content.length) {
    const spanStart = content.indexOf('<span', cursor);
    if (spanStart === -1) break;

    const tagClose = content.indexOf('>', spanStart);
    if (tagClose === -1) break;

    const isSelfClosing = content[tagClose - 1] === '/';
    const attrStr = content.slice(spanStart + 5, isSelfClosing ? tagClose - 1 : tagClose);
    const attrs = parseAttributes(attrStr);

    if (isSelfClosing) {
      nodes.push({ attrs, innerContent: '', trailing: '' });
      cursor = tagClose + 1;
      continue;
    }

    let depth = 1;
    let searchPos = tagClose + 1;
    let endPos = -1;

    while (searchPos < content.length) {
      const nextOpen = content.indexOf('<span', searchPos);
      const nextClose = content.indexOf('</span>', searchPos);

      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        searchPos = nextOpen + 5;
      } else {
        depth--;
        if (depth === 0) {
          endPos = nextClose;
          break;
        }
        searchPos = nextClose + 7;
      }
    }

    if (endPos !== -1) {
      const innerContent = content.slice(tagClose + 1, endPos);
      const afterSpan = endPos + 7;
      const nextSpan = content.indexOf('<span', afterSpan);
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

  const title =
    extractTagValue(rawXml, 'ttm:title') ||
    extractTagValue(rawXml, 'itunes:title') ||
    extractTagValue(rawXml, 'title');
  if (title) metadata.title = decodeXmlEntities(title);

  const artist =
    extractTagValue(rawXml, 'ttm:agent') ||
    extractTagValue(rawXml, 'itunes:artist') ||
    extractTagValue(rawXml, 'artist');
  if (artist) metadata.artist = decodeXmlEntities(artist);

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

  const lines: TTMLLine[] = [];

  // Match all <p ...>...</p> tags
  const pRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = pRegex.exec(rawXml)) !== null) {
    const pAttrsRaw = pMatch[1] || '';
    const pContent = pMatch[2] || '';
    const pAttrs = parseAttributes(pAttrsRaw);

    const lineBegin = parseTimestampTTML(pAttrs['begin'] || '0');
    const lineEnd = parseTimestampTTML(pAttrs['end'] || String(lineBegin));

    const agentAttr = (pAttrs['ttm:agent'] || pAttrs['agent'] || 'v1').toLowerCase();
    const agent: VocalAgent = agentAttr === 'v2' ? 'v2' : 'v1';
    const lineRole = pAttrs['ttm:role'] || pAttrs['role'];

    const syllables: TTMLSyllable[] = [];
    const backgroundVocals: TTMLLine[] = [];

    const topSpans = parseTopLevelSpans(pContent);

    for (const span of topSpans) {
      const isBg = span.attrs['ttm:role'] === 'x-bg' || span.attrs['role'] === 'x-bg';

      if (isBg) {
        const bgBegin = parseTimestampTTML(span.attrs['begin'] || String(lineBegin));
        const bgEnd = parseTimestampTTML(span.attrs['end'] || String(lineEnd));
        const bgSyllables: TTMLSyllable[] = [];

        const childSpans = parseTopLevelSpans(span.innerContent);
        if (childSpans.length > 0) {
          for (const child of childSpans) {
            bgSyllables.push(parseSyllableSpan(child.attrs, child.innerContent, child.trailing));
          }
        } else {
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

    const calculatedBegin = syllables.length > 0
      ? Math.min(lineBegin, syllables[0]!.begin)
      : lineBegin;
    const calculatedEnd = syllables.length > 0
      ? Math.max(lineEnd, syllables[syllables.length - 1]!.end)
      : lineEnd;

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
