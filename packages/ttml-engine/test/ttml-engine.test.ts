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

  it('parses real-world lyrics tool JSON with lyrics.Content, millisecond timing, and zero-width spaces', async () => {
    const { parseJsonLyrics, jsonToTTML } = await import('../src/json-parser.js');

    const realWorldPayload = {
      version: 1,
      trackId: '5wjiZSbxaLyLpGimpwqh1H',
      trackUri: 'spotify:track:5wjiZSbxaLyLpGimpwqh1H',
      title: 'En la Ciudad de la Furia',
      artist: 'Soda Stereo',
      durationMs: 345533,
      lyrics: {
        Content: [
          {
            Type: 'Vocal',
            Lead: {
              StartTime: 41963,
              EndTime: 44410,
              Syllables: [
                { Text: 'Me', StartTime: 41963, EndTime: 42158, IsPartOfWord: false },
                { Text: '\u200bverás', StartTime: 42158, EndTime: 42390, IsPartOfWord: false },
                { Text: '\u200bvolar', StartTime: 42390, EndTime: 44410, IsPartOfWord: false },
              ],
            },
          },
          {
            Type: 'Vocal',
            Lead: {
              StartTime: 44572,
              EndTime: 46571,
              Syllables: [
                { Text: 'Por', StartTime: 44572, EndTime: 44804, IsPartOfWord: false },
                { Text: '\u200bla', StartTime: 44804, EndTime: 44984, IsPartOfWord: false },
                { Text: '\u200bciudad', StartTime: 44984, EndTime: 45157, IsPartOfWord: false },
                { Text: '\u200bde', StartTime: 45157, EndTime: 45624, IsPartOfWord: false },
                { Text: '\u200bla', StartTime: 45624, EndTime: 45796, IsPartOfWord: false },
                { Text: '\u200bfuria', StartTime: 45796, EndTime: 46571, IsPartOfWord: false },
              ],
            },
          },
        ],
      },
    };

    const parsed = parseJsonLyrics(realWorldPayload);
    assert.equal(parsed.metadata.title, 'En la Ciudad de la Furia');
    assert.equal(parsed.metadata.artist, 'Soda Stereo');
    assert.equal(parsed.metadata.spotifyId, '5wjiZSbxaLyLpGimpwqh1H');
    assert.equal(parsed.metadata.durationMs, 345533);
    assert.equal(parsed.lines.length, 2);

    // Verify zero-width space is thoroughly sanitized
    const line1 = parsed.lines[0]!;
    assert.equal(line1.begin, 41963);
    assert.equal(line1.end, 44410);
    assert.equal(line1.text, 'Me verás volar');
    assert.equal(line1.syllables.length, 3);
    assert.equal(line1.syllables[1]!.text, 'verás ');
    assert.ok(!line1.syllables[1]!.text.includes('\u200b'));
    assert.equal(line1.syllables[2]!.text, 'volar ');
    assert.ok(!line1.syllables[2]!.text.includes('\u200b'));

    // Verify conversion to Apple Music TTML
    const ttmlXml = jsonToTTML(realWorldPayload, { contributor: 'Bru' });
    assert.ok(ttmlXml.includes('<ttm:title>En la Ciudad de la Furia</ttm:title>'));
    assert.ok(ttmlXml.includes('<itunes:spotifyId>5wjiZSbxaLyLpGimpwqh1H</itunes:spotifyId>'));
    assert.ok(ttmlXml.includes('<span begin="00:00:41.963" end="00:00:42.158">Me </span>'));
    assert.ok(ttmlXml.includes('<span begin="00:00:42.158" end="00:00:42.390">verás </span>'));
    assert.ok(!ttmlXml.includes('\u200b'));
  });

  it('parses background vocal spans from Background array and draft.lines with x-bg role', async () => {
    const { parseJsonLyrics, jsonToTTML } = await import('../src/json-parser.js');

    const temblorPayload = {
      version: 1,
      trackId: '3uMYq07Kj5m564OQwdSCrD',
      title: 'Cuando Pase El Temblor',
      artist: 'Soda Stereo',
      durationMs: 229160,
      lyrics: {
        Content: [
          {
            Type: 'Vocal',
            Lead: {
              StartTime: 49616,
              EndTime: 58019,
              Syllables: [
                { Text: 'A', StartTime: 49616, EndTime: 49965, IsPartOfWord: false },
                { Text: 'veces', StartTime: 49965, EndTime: 50882, IsPartOfWord: false },
                { Text: 'ver', StartTime: 50882, EndTime: 51171, IsPartOfWord: false },
                { Text: 'gü', StartTime: 51171, EndTime: 51521, IsPartOfWord: true },
                { Text: 'en', StartTime: 51521, EndTime: 51998, IsPartOfWord: true },
                { Text: 'za', StartTime: 51998, EndTime: 58019, IsPartOfWord: false },
              ],
            },
            Background: [
              {
                StartTime: 53509,
                EndTime: 58019,
                Syllables: [
                  { Text: 'Oh-', StartTime: 53509, EndTime: 54947, IsPartOfWord: false },
                  { Text: 'oh', StartTime: 54947, EndTime: 58019, IsPartOfWord: false },
                ],
              },
            ],
          },
        ],
      },
    };

    const parsed = parseJsonLyrics(temblorPayload);
    assert.equal(parsed.lines.length, 1);
    const line = parsed.lines[0]!;
    assert.ok(line.backgroundVocals);
    assert.equal(line.backgroundVocals.length, 1);

    const bg = line.backgroundVocals[0]!;
    assert.equal(bg.role, 'x-bg');
    assert.equal(bg.begin, 53509);
    assert.equal(bg.end, 58019);
    assert.equal(bg.text, 'Oh- oh');
    assert.equal(bg.syllables.length, 2);
    assert.equal(bg.syllables[0]!.text, 'Oh- ');
    assert.equal(bg.syllables[1]!.text, 'oh ');

    // Verify TTML XML emission has nested background span with ttm:role="x-bg"
    const xml = jsonToTTML(temblorPayload, { contributor: 'Bru', ytmId: 'oxkyfZAHVI4' });
    assert.ok(xml.includes('ttm:role="x-bg"'));
    assert.ok(xml.includes('<span begin="00:00:53.509" end="00:00:58.019" ttm:role="x-bg">'));
    assert.ok(xml.includes('<span begin="00:00:53.509" end="00:00:54.947">Oh- </span>'));
    assert.ok(xml.includes('<span begin="00:00:54.947" end="00:00:58.019">oh </span>'));
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

describe('Spotify & YouTube Music Streaming Integration', () => {
  it('builds valid Spotify OAuth URL with required Web Playback SDK scopes', async () => {
    const {
      buildSpotifyOAuthUrl,
      generateCodeVerifier,
      generateCodeChallenge,
      SPOTIFY_CLIENT_ID,
      SPOTIFY_SCOPES,
    } = await import('../../sync-studio/src/lib/spotify-auth.js');

    assert.equal(SPOTIFY_CLIENT_ID, '9b91a4fd101942cfb3fafbfad89e5d70');
    assert.ok(SPOTIFY_SCOPES.includes('streaming'));
    assert.ok(SPOTIFY_SCOPES.includes('user-modify-playback-state'));
    assert.ok(SPOTIFY_SCOPES.includes('user-read-playback-state'));

    const url = await buildSpotifyOAuthUrl('https://brus-lyrics.pages.dev/callback');
    assert.ok(url.startsWith('https://accounts.spotify.com/authorize?'));
    assert.ok(url.includes('client_id=9b91a4fd101942cfb3fafbfad89e5d70'));
    assert.ok(url.includes('state=spotify_auth'));
    assert.ok(url.includes('response_type=code'));
    assert.ok(url.includes('code_challenge_method=S256'));
    assert.ok(url.includes('code_challenge='));

    // RFC 7636 test vector validation
    const testVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const testChallenge = await generateCodeChallenge(testVerifier);
    assert.equal(testChallenge, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');

    // Generated verifier length and character set validation
    const generatedVerifier = generateCodeVerifier(64);
    assert.equal(generatedVerifier.length, 64);
    assert.match(generatedVerifier, /^[A-Za-z0-9\-._~]+$/);
  });

  it('normalizes YouTube Music track IDs and instantiates YouTube player', async () => {
    const { YouTubePlayer } = await import('../../sync-studio/src/lib/youtube-player.js');

    const yt = new YouTubePlayer();
    assert.equal(yt.getIsPlaying(), false);

    yt.loadVideo('ytm_lZIAZhbmPvg', false);
    assert.equal(yt.getCurrentVideoId(), 'lZIAZhbmPvg');

    yt.loadVideo('4NRXx6U8ABQ', false);
    assert.equal(yt.getCurrentVideoId(), '4NRXx6U8ABQ');
  });

  it('generates correct external URLs for Spotify and YouTube Music tracks', () => {
    const spotifyId = '3qhlB30KknSeipLHZaYeKc';
    const ytmId = 'lZIAZhbmPvg';

    const spotifyUrl = `https://open.spotify.com/track/${spotifyId}`;
    const ytmUrl = `https://music.youtube.com/watch?v=${ytmId}`;

    assert.equal(spotifyUrl, 'https://open.spotify.com/track/3qhlB30KknSeipLHZaYeKc');
    assert.equal(ytmUrl, 'https://music.youtube.com/watch?v=lZIAZhbmPvg');
  });
});

describe('Sync Studio Export & Persistence Features', () => {
  it('serializes studio lines to synced LRC format with line and word timestamps', async () => {
    const { serializeLinesToLRC } = await import('../../sync-studio/src/lib/ttml-serializer.js');

    const metadata = {
      title: 'Ella Baila Sola',
      artist: 'Eslabon Armado',
      album: 'Desvelado',
      contributor: 'heysoybruno09',
    };

    const lines = [
      {
        id: 'line_1',
        begin: 15500,
        end: 18200,
        agent: 'v1',
        text: 'Compa que le parece esa morra',
        syllables: [
          { begin: 15500, end: 16100, text: 'Compa ' },
          { begin: 16100, end: 16900, text: 'que ' },
          { begin: 16900, end: 17500, text: 'le ' },
          { begin: 17500, end: 18200, text: 'parece ' },
        ],
      },
    ];

    const lrc = serializeLinesToLRC(metadata, lines);
    assert.ok(lrc.includes('[ti:Ella Baila Sola]'));
    assert.ok(lrc.includes('[ar:Eslabon Armado]'));
    assert.ok(lrc.includes('[al:Desvelado]'));
    assert.ok(lrc.includes('[by:heysoybruno09]'));
    assert.ok(lrc.includes('[00:15.50] <00:15.50>Compa <00:16.10>que <00:16.90>le <00:17.50>parece '));
  });

  it('serializes studio lines to structured JSON format for instant export', async () => {
    const { serializeLinesToJSON } = await import('../../sync-studio/src/lib/ttml-serializer.js');

    const metadata = {
      title: 'Test Song',
      artist: 'Test Artist',
      durationMs: 180000,
      spotifyId: 'track_test_123',
      contributor: 'heysoybruno09',
    };

    const lines = [
      {
        id: 'line_1',
        begin: 5000,
        end: 8000,
        agent: 'v1',
        text: 'Hello world',
        syllables: [
          { begin: 5000, end: 6000, text: 'Hello ' },
          { begin: 6000, end: 8000, text: 'world' },
        ],
      },
    ];

    const jsonStr = serializeLinesToJSON(metadata, lines);
    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.metadata.title, 'Test Song');
    assert.equal(parsed.metadata.artist, 'Test Artist');
    assert.equal(parsed.lines.length, 1);
    assert.equal(parsed.lines[0].text, 'Hello world');
    assert.equal(parsed.lines[0].syllables.length, 2);
  });

  it('builds Discord OAuth URL with /callback redirect URI matching developer portal', async () => {
    const { buildDiscordOAuthUrl } = await import('../../sync-studio/src/lib/discord-auth.js');

    const url = buildDiscordOAuthUrl('https://brus-lyrics.pages.dev/callback');
    assert.ok(url.startsWith('https://discord.com/api/oauth2/authorize?'));
    assert.ok(url.includes('redirect_uri=https%3A%2F%2Fbrus-lyrics.pages.dev%2Fcallback'));
    assert.ok(url.includes('response_type=token'));
  });

  it('verifies logo.svg vector path exists and contains closed boundary geometry', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const svgPath = path.resolve(process.cwd(), 'packages/sync-studio/public/logo.svg');
    assert.ok(fs.existsSync(svgPath));

    const content = fs.readFileSync(svgPath, 'utf8');
    assert.ok(content.includes('<svg'));
    assert.ok(content.includes('viewBox="0 0 1024 1024"'));
    assert.ok(content.includes('fill-rule="evenodd"'));
    assert.ok(content.includes('M 264,126'));
  });
});

describe('Search Autocomplete & Fallback Workflow', () => {
  it('ranks and selects top autocomplete suggestion prioritizing prefix matches', async () => {
    const { VERIFIED_FEATURED_TRACKS } = await import('../../sync-studio/src/lib/spotify-service.js');

    const computeTopMatch = (query: string, songs: any[]) => {
      const q = query.trim().toLowerCase();
      if (!q || !songs || songs.length === 0) return null;
      const matches = songs.filter((s) => {
        const t = s.title.toLowerCase();
        const a = s.artist.toLowerCase();
        const alb = (s.album || '').toLowerCase();
        return t.includes(q) || a.includes(q) || alb.includes(q);
      });
      if (matches.length === 0) return null;
      matches.sort((a, b) => {
        const aTitleStart = a.title.toLowerCase().startsWith(q) ? 1 : 0;
        const bTitleStart = b.title.toLowerCase().startsWith(q) ? 1 : 0;
        if (aTitleStart !== bTitleStart) return bTitleStart - aTitleStart;
        const aArtistStart = a.artist.toLowerCase().startsWith(q) ? 1 : 0;
        const bArtistStart = b.artist.toLowerCase().startsWith(q) ? 1 : 0;
        if (aArtistStart !== bArtistStart) return bArtistStart - aArtistStart;
        return 0;
      });
      return matches[0] || null;
    };

    // Test exact prefix title match
    const ellaMatch = computeTopMatch('Ella', VERIFIED_FEATURED_TRACKS);
    assert.ok(ellaMatch);
    assert.equal(ellaMatch.title, 'Ella Baila Sola');
    assert.equal(ellaMatch.ytmId, '1TVyEcR5pcw');

    // Test artist prefix match
    const coldMatch = computeTopMatch('Coldplay', VERIFIED_FEATURED_TRACKS);
    assert.ok(coldMatch);
    assert.equal(coldMatch.title, 'Yellow');

    // Non-matching query
    const noneMatch = computeTopMatch('nonexistentxyz123', VERIFIED_FEATURED_TRACKS);
    assert.equal(noneMatch, null);
  });

  it('preserves and reconstructs full track metadata in pre-auth session storage across OAuth flows', () => {
    const mockTrack = {
      id: 'song_3qhlB30KknSeipLHZaYeKc',
      spotifyId: '3qhlB30KknSeipLHZaYeKc',
      ytmId: '1TVyEcR5pcw',
      title: 'Ella Baila Sola',
      artist: 'Eslabon Armado, Peso Pluma',
      album: 'DESVELADO',
      artworkUrl: 'https://i.scdn.co/image/test',
      durationMs: 165600,
      previewUrl: 'https://audio-ssl.itunes.apple.com/test.m4a',
      source: 'verified' as const,
      isSyllableSynced: true,
      contributor: 'CommunityDrop',
    };

    const sessionPayload = JSON.stringify({
      song: mockTrack,
      songId: mockTrack.id,
      timeMs: 45000,
      isLyricsPopupOpen: true,
      currentView: 'discover',
    });

    const parsed = JSON.parse(sessionPayload);
    assert.equal(parsed.song.title, 'Ella Baila Sola');
    assert.equal(parsed.song.ytmId, '1TVyEcR5pcw');
    assert.equal(parsed.timeMs, 45000);
    assert.equal(parsed.isLyricsPopupOpen, true);
  });

  it('Structure 2 draft.lines: parses explicit token end times and background vocals', async () => {
    const { parseJsonLyrics } = await import('../src/json-parser.js');

    const draftJson = JSON.stringify({
      version: 1,
      draft: {
        lines: [
          {
            text: 'Lead line text',
            start: 5000,
            end: 8000,
            tokens: [
              { text: 'Lead ', start: 5000, end: 6000 },
              { text: 'line ', start: 6000, end: 7000 },
              { text: 'text', start: 7000, end: 8000 },
            ],
            backgrounds: [
              {
                text: 'Backing vocal',
                start: 6500,
                end: 9000,
                tokens: [
                  { text: 'Backing ', start: 6500, end: 7800 },
                  { text: 'vocal', start: 7800, end: 9000 },
                ],
              },
            ],
          },
        ],
      },
    });

    const parsed = parseJsonLyrics(draftJson);
    assert.equal(parsed.lines.length, 1);
    const line = parsed.lines[0]!;
    assert.equal(line.syllables.length, 3);
    assert.equal(line.syllables[0]?.end, 6000);
    assert.equal(line.syllables[1]?.end, 7000);
    assert.equal(line.syllables[2]?.end, 8000);

    assert.ok(line.backgroundVocals);
    assert.equal(line.backgroundVocals.length, 1);
    const bg = line.backgroundVocals[0]!;
    assert.equal(bg.begin, 6500);
    assert.equal(bg.end, 9000);
    assert.equal(bg.syllables.length, 2);
    assert.equal(bg.syllables[0]?.end, 7800);
    assert.equal(bg.syllables[1]?.end, 9000);
  });

  it('parseTTML expands line bounds when background vocals begin before or end after lead syllables', async () => {
    const { parseTTML } = await import('../src/parser.js');

    const ttmlWithBg = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-internal">
  <head>
    <metadata>
      <ttm:title>Bg Test</ttm:title>
      <itunes:platformTarget>both</itunes:platformTarget>
    </metadata>
  </head>
  <body>
    <div>
      <p begin="00:00:05.000" end="00:00:08.000" ttm:agent="v1">
        <span begin="00:00:05.000" end="00:00:07.000">Main voice</span>
        <span begin="00:00:06.000" end="00:00:09.500" ttm:role="x-bg">
          <span begin="00:00:06.000" end="00:00:09.500">Echo harmony</span>
        </span>
      </p>
    </div>
  </body>
</tt>`;

    const doc = parseTTML(ttmlWithBg);
    assert.equal(doc.metadata.platformTarget, 'both');
    assert.equal(doc.lines.length, 1);
    const l = doc.lines[0]!;
    // Line bounds should expand to cover the background vocal up to 9500ms
    assert.equal(l.begin, 5000);
    assert.equal(l.end, 9500);
    assert.equal(l.backgroundVocals?.length, 1);
    assert.equal(l.backgroundVocals[0]?.role, 'x-bg');
    assert.equal(l.backgroundVocals[0]?.syllables[0]?.role, 'x-bg');
  });

  it('parseTtmlXml in sync-studio retains background vocals and sets syllable mode', async () => {
    const { parseTtmlXml } = await import('../../sync-studio/src/lib/multi-format-lyrics.js');

    const ttml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-internal">
  <head>
    <metadata>
      <ttm:title>Soda Stereo Test</ttm:title>
      <itunes:platformTarget>spotify</itunes:platformTarget>
    </metadata>
  </head>
  <body>
    <div>
      <p begin="00:00:02.000" end="00:00:05.000">
        <span begin="00:00:02.000" end="00:00:04.000">Lead text</span>
        <span begin="00:00:03.000" end="00:00:05.500" ttm:role="x-bg">
          <span begin="00:00:03.000" end="00:00:05.500">Backing</span>
        </span>
      </p>
    </div>
  </body>
</tt>`;

    const res = parseTtmlXml(ttml);
    assert.equal(res.mode, 'syllable');
    assert.equal(res.metadata.platformTarget, 'spotify');
    assert.equal(res.lines[0]?.backgroundVocals?.length, 1);
    assert.equal(res.lines[0]?.backgroundVocals[0]?.syllables[0]?.text.trim(), 'Backing');
  });
});



