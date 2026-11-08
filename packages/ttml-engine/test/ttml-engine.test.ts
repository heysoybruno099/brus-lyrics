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

describe('Multi-Format Lyrics Parser (TTML, LRC, JSON)', () => {
  it('detects lyrics format correctly from extension and content', async () => {
    const { detectLyricsFormat } = await import('../../sync-studio/src/lib/multi-format-lyrics.js');

    assert.equal(detectLyricsFormat('some text', 'song.ttml'), 'ttml');
    assert.equal(detectLyricsFormat('some text', 'song.xml'), 'ttml');
    assert.equal(detectLyricsFormat('some text', 'song.lrc'), 'lrc');
    assert.equal(detectLyricsFormat('some text', 'song.json'), 'json');

    assert.equal(detectLyricsFormat('<tt xmlns="http://www.w3.org/ns/ttml">...</tt>'), 'ttml');
    assert.equal(detectLyricsFormat('[00:12.30] Line text here'), 'lrc');
    assert.equal(detectLyricsFormat('{"lines": [{"begin": 10, "text": "Hello"}]}'), 'json');
    assert.equal(detectLyricsFormat('[{"time": 10, "text": "Hello"}]'), 'json');
  });

  it('parses standard line-by-line LRC (one line mode)', async () => {
    const { parseMultiFormatLyrics } = await import('../../sync-studio/src/lib/multi-format-lyrics.js');
    const lrc = `
[00:10.50] First verse line
[00:15.00] Second verse line
[00:20.00] Third chorus line
`;
    const res = parseMultiFormatLyrics(lrc, 'song.lrc', 30000);
    assert.equal(res.format, 'lrc');
    assert.equal(res.mode, 'line');
    assert.equal(res.lines.length, 3);
    assert.equal(res.lines[0]?.begin, 10500);
    assert.equal(res.lines[0]?.text, 'First verse line');
    assert.equal(res.lines[1]?.begin, 15000);
    assert.equal(res.lines[1]?.end, 20000);
  });

  it('parses word-by-word syllable LRC (<mm:ss.xx> tags)', async () => {
    const { parseMultiFormatLyrics } = await import('../../sync-studio/src/lib/multi-format-lyrics.js');
    const wordLrc = `
[00:15.50] <00:15.50> Compa <00:16.10> que <00:16.90> le <00:17.50> parece
[00:18.50] <00:18.50> La <00:19.20> que <00:20.00> anda <00:20.80> bailando <00:21.50> sola
`;
    const res = parseMultiFormatLyrics(wordLrc, 'song.lrc', 30000);
    assert.equal(res.format, 'lrc');
    assert.equal(res.mode, 'syllable');
    assert.equal(res.lines.length, 2);

    const line1 = res.lines[0]!;
    assert.equal(line1.begin, 15500);
    assert.equal(line1.syllables.length, 4);
    assert.equal(line1.syllables[0]?.begin, 15500);
    assert.equal(line1.syllables[0]?.end, 16100);
    assert.equal(line1.syllables[0]?.text.trim(), 'Compa');
  });

  it('parses JSON format lyrics with lines and word objects', async () => {
    const { parseMultiFormatLyrics } = await import('../../sync-studio/src/lib/multi-format-lyrics.js');
    const json = JSON.stringify({
      metadata: {
        title: 'JSON Song',
        artist: 'JSON Artist',
        durationMs: 120000,
      },
      lines: [
        {
          begin: 9.84,
          end: 11.68,
          text: 'Hello world',
          words: [
            { word: 'Hello ', begin: 9.84, end: 10.5 },
            { word: 'world', begin: 10.5, end: 11.68 },
          ],
        },
      ],
    });

    const res = parseMultiFormatLyrics(json, 'song.json');
    assert.equal(res.format, 'json');
    assert.equal(res.mode, 'syllable');
    assert.equal(res.metadata.title, 'JSON Song');
    assert.equal(res.lines.length, 1);
    assert.equal(res.lines[0]?.begin, 9840);
    assert.equal(res.lines[0]?.end, 11680);
    assert.equal(res.lines[0]?.syllables.length, 2);
  });

  it('parses TTML XML format into synchronized matrix lines', async () => {
    const { parseMultiFormatLyrics } = await import('../../sync-studio/src/lib/multi-format-lyrics.js');
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-extensions">
  <head>
    <metadata>
      <ttm:title>TTML Track</ttm:title>
      <ttm:agent>TTML Singer</ttm:agent>
    </metadata>
  </head>
  <body>
    <div>
      <p begin="00:00:05.000" end="00:00:08.000">
        <span begin="00:00:05.000" end="00:00:06.500">Live </span>
        <span begin="00:00:06.500" end="00:00:08.000">Lyrics</span>
      </p>
    </div>
  </body>
</tt>`;

    const res = parseMultiFormatLyrics(xml, 'song.ttml');
    assert.equal(res.format, 'ttml');
    assert.equal(res.mode, 'syllable');
    assert.equal(res.metadata.title, 'TTML Track');
    assert.equal(res.metadata.artist, 'TTML Singer');
    assert.equal(res.lines.length, 1);
    assert.equal(res.lines[0]?.begin, 5000);
    assert.equal(res.lines[0]?.end, 8000);
    assert.equal(res.lines[0]?.syllables.length, 2);
  });
});

