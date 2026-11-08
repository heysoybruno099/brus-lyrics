import { parseTimestampTTML } from '@brus-lyrics/shared-types';

export interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  line?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  issues: ValidationIssue[];
}

export function validateTTML(xml: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!xml || typeof xml !== 'string' || xml.trim().length === 0) {
    return {
      valid: false,
      error: 'TTML content is empty',
      issues: [{ type: 'error', message: 'TTML content is empty' }],
    };
  }

  const trimmed = xml.trim();

  // Root <tt> check
  const ttMatch = trimmed.match(/<tt\b([^>]*)>/i);
  if (!ttMatch) {
    const msg = 'Missing root <tt> element';
    return {
      valid: false,
      error: msg,
      issues: [{ type: 'error', message: msg }],
    };
  }

  const rootAttrs = ttMatch[1] || '';
  if (!/xmlns=["'][^"']*ttml[^"']*["']/i.test(rootAttrs)) {
    const msg = 'Missing TTML namespace declaration on root <tt> element';
    return {
      valid: false,
      error: msg,
      issues: [{ type: 'error', message: msg }],
    };
  }

  // Head and body structure checks
  if (!/<head[\s>]/i.test(trimmed) || !/<\/head>/i.test(trimmed)) {
    const msg = 'Missing required <head> section';
    return {
      valid: false,
      error: msg,
      issues: [{ type: 'error', message: msg }],
    };
  }

  if (!/<body[\s>]/i.test(trimmed) || !/<\/body>/i.test(trimmed)) {
    const msg = 'Missing required <body> section';
    return {
      valid: false,
      error: msg,
      issues: [{ type: 'error', message: msg }],
    };
  }

  // Check negative durations in metadata tags
  const itunesDurMatch = trimmed.match(/<itunes:duration[^>]*>([\s\S]*?)<\/itunes:duration>/i);
  if (itunesDurMatch && itunesDurMatch[1]) {
    const durVal = itunesDurMatch[1].trim();
    const durMs = parseTimestampTTML(durVal);
    if (durMs < 0 || durVal.startsWith('-')) {
      const msg = `Negative duration in <itunes:duration>: "${durVal}"`;
      return {
        valid: false,
        error: msg,
        issues: [{ type: 'error', message: msg }],
      };
    }
  }

  const plainDurMatch = trimmed.match(/<duration[^>]*>([\s\S]*?)<\/duration>/i);
  if (plainDurMatch && plainDurMatch[1]) {
    const durVal = plainDurMatch[1].trim();
    const durMs = parseTimestampTTML(durVal);
    if (durMs < 0 || durVal.startsWith('-')) {
      const msg = `Negative duration in <duration>: "${durVal}"`;
      return {
        valid: false,
        error: msg,
        issues: [{ type: 'error', message: msg }],
      };
    }
  }

  // Strip XML prolog and comments before tag validation
  const cleanXml = trimmed
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const tagRegex = /<(\/)?([a-zA-Z0-9:_-]+)([^>]*?)(\/?)>/g;
  const tagStack: { tag: string; index: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(cleanXml)) !== null) {
    const isClosing = Boolean(match[1]);
    const tagName = match[2]?.toLowerCase();
    const attributes = match[3] || '';
    const isSelfClosing = Boolean(match[4]);

    if (!tagName) continue;

    if (isClosing) {
      if (tagStack.length === 0) {
        const msg = `Unexpected closing tag </${tagName}> without matching opening tag`;
        return {
          valid: false,
          error: msg,
          issues: [{ type: 'error', message: msg }],
        };
      }
      const top = tagStack.pop()!;
      if (top.tag !== tagName) {
        const msg = `Mismatched closing tag: expected </${top.tag}> but found </${tagName}>`;
        return {
          valid: false,
          error: msg,
          issues: [{ type: 'error', message: msg }],
        };
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
          const msg = `Invalid empty begin timestamp in element <${tagName}>`;
          return { valid: false, error: msg, issues: [{ type: 'error', message: msg }] };
        }
        beginMs = parseTimestampTTML(beginVal);
        if (isNaN(beginMs) || beginMs < 0 || beginVal.startsWith('-')) {
          const msg = `Negative or invalid begin timestamp in element <${tagName}>: "${beginVal}"`;
          return { valid: false, error: msg, issues: [{ type: 'error', message: msg }] };
        }
      }

      if (endMatch) {
        const endVal = endMatch[1]?.trim() || '';
        if (!endVal) {
          const msg = `Invalid empty end timestamp in element <${tagName}>`;
          return { valid: false, error: msg, issues: [{ type: 'error', message: msg }] };
        }
        endMs = parseTimestampTTML(endVal);
        if (isNaN(endMs) || endMs < 0 || endVal.startsWith('-')) {
          const msg = `Negative or invalid end timestamp in element <${tagName}>: "${endVal}"`;
          return { valid: false, error: msg, issues: [{ type: 'error', message: msg }] };
        }
      }

      if (durMatch) {
        const durVal = durMatch[1]?.trim() || '';
        if (!durVal) {
          const msg = `Invalid empty dur attribute in element <${tagName}>`;
          return { valid: false, error: msg, issues: [{ type: 'error', message: msg }] };
        }
        const durMs = parseTimestampTTML(durVal);
        if (isNaN(durMs) || durMs < 0 || durVal.startsWith('-')) {
          const msg = `Negative duration in element <${tagName}>: dur="${durVal}"`;
          return { valid: false, error: msg, issues: [{ type: 'error', message: msg }] };
        }
      }

      if (beginMs !== undefined && endMs !== undefined && endMs < beginMs) {
        const msg = `Timestamp end is earlier than begin in element <${tagName}>: begin="${beginMatch![1]}", end="${endMatch![1]}"`;
        return {
          valid: false,
          error: msg,
          issues: [{ type: 'error', message: msg }],
        };
      }

      if (!isSelfClosing) {
        tagStack.push({ tag: tagName, index: match.index });
      }
    }
  }

  if (tagStack.length > 0) {
    const unclosed = tagStack.map((t) => t.tag).join(', ');
    const msg = `Unclosed tags remaining: ${unclosed}`;
    return {
      valid: false,
      error: msg,
      issues: [{ type: 'error', message: msg }],
    };
  }

  return {
    valid: true,
    issues,
  };
}
