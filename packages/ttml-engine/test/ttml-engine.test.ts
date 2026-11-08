import { test, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { parseTTML } from '../src/parser.js';
import { lrcToTTML, lrcToTTMLDocument, parseLrcIntervals } from '../src/lrc-converter.js';
import { validateTTML } from '../src/validator.js';
import { BrusLyricsRenderer } from '../src/renderer.js';

describe('TTML Engine - Parser', () => {
  const sampleTTML = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml"
    xmlns:ttm="http://www.w3.org/ns/ttml#metadata"
    xmlns:itunes="http://music.apple.com/lyric-ttml-extensions"
    xml:lang="es">
  <head>
    <metadata>
      <ttm:title>Ella Baila Sola</ttm:title>
      <ttm:agent>Eslabon Armado, Peso Pluma</ttm:agent>
      <itunes:album>Desvelado</itunes:album>
      <itunes:duration>00:02:45.000</itunes:duration>
      <itunes:spotifyId>3qhlB30KknSeipLHZaYeKc</itunes:spotifyId>
      <itunes:youtubeId>lZIA_sVvj5Y</itunes:youtubeId>
      <itunes:contributor>bru-verified</itunes:contributor>
    </metadata>
  </head>
  <body dur="00:02:45.000">
    <div>
      <p begin="00:00:15.500" end="00:00:18.200" ttm:agent="v1">
        <span begin="00:00:15.500" end="00:00:16.100">Compa </span>
        <span begin="00:00:16.100" end="00:00:16.900">que </span>
        <span begin="00:00:16.900" end="00:00:17.500">le </span>
        <span begin="00:00:17.500" end="00:00:18.200">parece</span>
      </p>
      <p begin="00:00:18.500" end="00:00:22.000" ttm:agent="v2">
        <span begin="00:00:18.500" end="00:00:19.200">esa </span>
        <span begin="00:00:19.200" end="00:00:20.100">morra</span>
        <span begin="00:00:20.500" end="00:00:22.000" ttm:role="x-bg">
          <span begin="00:00:20.500" end="00:00:21.200">(que </span>
          <span begin="00:00:21.200" end="00:00:22.000">baila)</span>
        </span>
      </p>
    </div>
  </body>
</tt>`;

  it('parses metadata elements correctly', () => {
    const doc = parseTTML(sampleTTML);
    assert.equal(doc.metadata.title, 'Ella Baila Sola');
    assert.equal(doc.metadata.artist, 'Eslabon Armado, Peso Pluma');
    assert.equal(doc.metadata.album, 'Desvelado');
    assert.equal(doc.metadata.durationMs, 165000);
    assert.equal(doc.metadata.spotifyId, '3qhlB30KknSeipLHZaYeKc');
    assert.equal(doc.metadata.ytmId, 'lZIA_sVvj5Y');
    assert.equal(doc.metadata.contributor, 'bru-verified');
  });

  it('extracts lines and agent assignments', () => {
    const doc = parseTTML(sampleTTML);
    assert.equal(doc.lines.length, 2);

    const line1 = doc.lines[0]!;
    assert.equal(line1.agent, 'v1');
    assert.equal(line1.begin, 15500);
    assert.equal(line1.end, 18200);
    assert.equal(line1.syllables.length, 4);
    assert.equal(line1.syllables[0]!.text, 'Compa ');

    const line2 = doc.lines[1]!;
    assert.equal(line2.agent, 'v2');
    assert.equal(line2.syllables.length, 2);
    assert.equal(line2.syllables[0]!.text, 'esa ');
  });

  it('extracts background vocal spans and attaches as sub-lines', () => {
    const doc = parseTTML(sampleTTML);
    const line2 = doc.lines[1]!;
    assert.ok(line2.backgroundVocals);
    assert.equal(line2.backgroundVocals.length, 1);

    const bgLine = line2.backgroundVocals[0]!;
    assert.equal(bgLine.role, 'x-bg');
    assert.equal(bgLine.begin, 20500);
    assert.equal(bgLine.end, 22000);
    assert.equal(bgLine.syllables.length, 2);
    assert.equal(bgLine.syllables[0]!.text, '(que ');
    assert.equal(bgLine.syllables[1]!.text, 'baila)');
  });
});

describe('TTML Engine - LRC Converter', () => {
  const sampleLrc = `
[00:10.00] First synced verse
[00:14.50] Second synced chorus
[00:20.00] Outro line
`;

  it('parses LRC timestamps into contiguous intervals', () => {
    const intervals = parseLrcIntervals(sampleLrc, 30000);
    assert.equal(intervals.length, 3);
    assert.equal(intervals[0]!.beginMs, 10000);
    assert.equal(intervals[0]!.endMs, 14500);
    assert.equal(intervals[0]!.text, 'First synced verse');

    assert.equal(intervals[1]!.beginMs, 14500);
    assert.equal(intervals[1]!.endMs, 20000);

    assert.equal(intervals[2]!.beginMs, 20000);
    assert.equal(intervals[2]!.endMs, 30000);
  });

  it('converts LRC to valid TTML XML', () => {
    const xml = lrcToTTML(sampleLrc, {
      title: 'Fix You',
      artist: 'Coldplay',
      durationMs: 35000,
    });

    assert.ok(xml.includes('<ttm:title>Fix You</ttm:title>'));
    assert.ok(xml.includes('<ttm:agent>Coldplay</ttm:agent>'));
    assert.ok(xml.includes('<p begin="00:00:10.000" end="00:00:14.500"'));

    const validation = validateTTML(xml);
    assert.equal(validation.valid, true);
  });

  it('converts LRC to TTMLDocument object directly', () => {
    const doc = lrcToTTMLDocument(sampleLrc, {
      title: 'Fix You',
      artist: 'Coldplay',
    });
    assert.equal(doc.metadata.title, 'Fix You');
    assert.equal(doc.lines.length, 3);
    assert.equal(doc.lines[0]!.agent, 'v1');
    assert.equal(doc.lines[0]!.text, 'First synced verse');
  });
});

describe('TTML Engine - Validator', () => {
  it('validates a compliant TTML document', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <head><metadata></metadata></head>
  <body><div><p begin="00:00:01.000" end="00:00:02.000"><span>Line</span></p></div></body>
</tt>`;
    const res = validateTTML(xml);
    assert.equal(res.valid, true);
    assert.equal(res.issues.length, 0);
  });

  it('detects missing root or namespaces', () => {
    const bad = `<bad-root><head></head><body></body></bad-root>`;
    const res = validateTTML(bad);
    assert.equal(res.valid, false);
    assert.ok(res.error?.includes('Missing root <tt>'));
  });

  it('detects unclosed tags', () => {
    const bad = `<?xml version="1.0"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <head></head>
  <body><div><p begin="00:00:01.000" end="00:00:02.000"><span>Unclosed</div></body>
</tt>`;
    const res = validateTTML(bad);
    assert.equal(res.valid, false);
    assert.ok(res.error?.includes('Mismatched closing tag') || res.error?.includes('Unclosed tags'));
  });

  it('detects inverted timestamps end < begin', () => {
    const bad = `<?xml version="1.0"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <head></head>
  <body><div><p begin="00:00:05.000" end="00:00:02.000"><span>Inverted</span></p></div></body>
</tt>`;
    const res = validateTTML(bad);
    assert.equal(res.valid, false);
    assert.ok(res.error?.includes('earlier than begin'));
  });
});

describe('TTML Engine - BrusLyricsRenderer', () => {
  it('instantiates safely in headless environment without crashing', () => {
    const dummyContainer = {} as HTMLElement;
    let seekTimestamp = -1;
    const renderer = new BrusLyricsRenderer(dummyContainer, {
      onSeek: (ts) => {
        seekTimestamp = ts;
      },
    });

    assert.ok(renderer);
    assert.equal(renderer.getCurrentTimeMs(), 0);

    renderer.setCurrentTimeMs(15000);
    assert.equal(renderer.getCurrentTimeMs(), 15000);

    renderer.destroy();
  });
});
