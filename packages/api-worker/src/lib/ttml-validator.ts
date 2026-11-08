import { parseTimestampTTML } from '@brus-lyrics/shared-types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateTTML(xml: string): ValidationResult {
  if (!xml || typeof xml !== 'string' || xml.trim().length === 0) {
    return { valid: false, error: 'TTML content is empty' };
  }

  const trimmed = xml.trim();

  const ttMatch = trimmed.match(/<tt\b([^>]*)>/i);
  if (!ttMatch) {
    return { valid: false, error: 'Missing root <tt> element' };
  }

  const rootAttrs = ttMatch[1] || '';
  if (!/xmlns=["'][^"']*ttml[^"']*["']/i.test(rootAttrs)) {
    return { valid: false, error: 'Missing TTML namespace declaration on root <tt> element' };
  }

  if (!/<head[\s>]/i.test(trimmed) || !/<\/head>/i.test(trimmed)) {
    return { valid: false, error: 'Missing required <head> section' };
  }

  if (!/<body[\s>]/i.test(trimmed) || !/<\/body>/i.test(trimmed)) {
    return { valid: false, error: 'Missing required <body> section' };
  }

  // Check negative durations in metadata tags
  const itunesDurMatch = trimmed.match(/<itunes:duration[^>]*>([\s\S]*?)<\/itunes:duration>/i);
  if (itunesDurMatch && itunesDurMatch[1]) {
    const durVal = itunesDurMatch[1].trim();
    const durMs = parseTimestampTTML(durVal);
    if (durMs < 0 || durVal.startsWith('-')) {
      return { valid: false, error: `Negative duration in <itunes:duration>: "${durVal}"` };
    }
  }

  const plainDurMatch = trimmed.match(/<duration[^>]*>([\s\S]*?)<\/duration>/i);
  if (plainDurMatch && plainDurMatch[1]) {
    const durVal = plainDurMatch[1].trim();
    const durMs = parseTimestampTTML(durVal);
    if (durMs < 0 || durVal.startsWith('-')) {
      return { valid: false, error: `Negative duration in <duration>: "${durVal}"` };
    }
  }

  // Strip XML prolog and comments before tag validation
  const cleanXml = trimmed
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const tagRegex = /<(\/)?([a-zA-Z0-9:_-]+)([^>]*?)(\/?)>/g;
  const tagStack: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(cleanXml)) !== null) {
    const isClosing = Boolean(match[1]);
    const tagName = match[2]?.toLowerCase();
    const attributes = match[3] || '';
    const isSelfClosing = Boolean(match[4]);

    if (!tagName) continue;

    if (isClosing) {
      if (tagStack.length === 0) {
        return { valid: false, error: `Unexpected closing tag </${tagName}> without matching opening tag` };
      }
      const top = tagStack.pop();
      if (top !== tagName) {
        return { valid: false, error: `Mismatched closing tag: expected </${top}> but found </${tagName}>` };
      }
    } else {
      // Validate begin / end / dur timing attributes if present
      const beginMatch = attributes.match(/\bbegin=["']([^"']+)["']/i);
      const endMatch = attributes.match(/\bend=["']([^"']+)["']/i);
      const durMatch = attributes.match(/\bdur=["']([^"']+)["']/i);

      let beginMs: number | undefined;
      let endMs: number | undefined;

      if (beginMatch) {
        const beginVal = beginMatch[1]?.trim() || '';
        if (!beginVal) {
          return { valid: false, error: `Invalid empty begin timestamp in element <${tagName}>` };
        }
        beginMs = parseTimestampTTML(beginVal);
        if (isNaN(beginMs) || beginMs < 0 || beginVal.startsWith('-')) {
          return { valid: false, error: `Negative or invalid begin timestamp in element <${tagName}>: "${beginVal}"` };
        }
      }

      if (endMatch) {
        const endVal = endMatch[1]?.trim() || '';
        if (!endVal) {
          return { valid: false, error: `Invalid empty end timestamp in element <${tagName}>` };
        }
        endMs = parseTimestampTTML(endVal);
        if (isNaN(endMs) || endMs < 0 || endVal.startsWith('-')) {
          return { valid: false, error: `Negative or invalid end timestamp in element <${tagName}>: "${endVal}"` };
        }
      }

      if (durMatch) {
        const durVal = durMatch[1]?.trim() || '';
        if (!durVal) {
          return { valid: false, error: `Invalid empty dur attribute in element <${tagName}>` };
        }
        const durMs = parseTimestampTTML(durVal);
        if (isNaN(durMs) || durMs < 0 || durVal.startsWith('-')) {
          return { valid: false, error: `Negative duration in element <${tagName}>: dur="${durVal}"` };
        }
      }

      if (beginMs !== undefined && endMs !== undefined && endMs < beginMs) {
        return {
          valid: false,
          error: `Timestamp end is earlier than begin in element <${tagName}>: begin="${beginMatch![1]}", end="${endMatch![1]}"`,
        };
      }

      if (!isSelfClosing) {
        tagStack.push(tagName);
      }
    }
  }

  if (tagStack.length > 0) {
    return { valid: false, error: `Unclosed tags remaining: ${tagStack.join(', ')}` };
  }

  return { valid: true };
}

