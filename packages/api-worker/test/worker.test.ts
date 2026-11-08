import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import { validateTTML } from '../src/lib/ttml-validator.js';
import { convertLrcToTTML, parseLrcTimestamps } from '../src/lib/lrc-to-ttml.js';
import { normalizeString, formatTimestampTTML, parseTimestampTTML } from '@brus-lyrics/shared-types';

describe('Shared Utilities', () => {
  it('normalizes song titles and artist names removing diacritics and noise', () => {
    assert.equal(normalizeString('Coldplay'), 'coldplay');
    assert.equal(normalizeString('Yellow (Official Audio)'), 'yellow');
    assert.equal(normalizeString('Entre Golpes y Besos - Remastered 2024'), 'entre golpes y besos');
    assert.equal(normalizeString('Ella Baila Sola (feat. Peso Pluma)'), 'ella baila sola');
    assert.equal(normalizeString('Canción con acentos'), 'cancion con acentos');
  });

  it('formats and parses TTML timestamps correctly', () => {
    assert.equal(formatTimestampTTML(0), '00:00:00.000');
    assert.equal(formatTimestampTTML(65432), '00:01:05.432');
    assert.equal(formatTimestampTTML(3661123), '01:01:01.123');

    assert.equal(parseTimestampTTML('00:00:00.000'), 0);
    assert.equal(parseTimestampTTML('00:01:05.432'), 65432);
    assert.equal(parseTimestampTTML('01:01:01.123'), 3661123);
    assert.equal(parseTimestampTTML('00:15.500'), 15500);
    assert.equal(parseTimestampTTML('12.5s'), 12500);
  });
});

describe('TTML Validator', () => {
  it('validates compliant TTML XML successfully', () => {
    const validXml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xml:lang="en">
  <head>
    <metadata>
      <ttm:title>Test Title</ttm:title>
      <ttm:agent type="person" xml:id="v1">Test Artist</ttm:agent>
    </metadata>
  </head>
  <body>
    <div>
      <p begin="00:00:01.000" end="00:00:04.000" ttm:agent="v1">
        <span begin="00:00:01.000" end="00:00:02.000">Test </span>
        <span begin="00:00:02.000" end="00:00:04.000">Line</span>
      </p>
    </div>
  </body>
</tt>`;
    const res = validateTTML(validXml);
    assert.equal(res.valid, true);
  });

  it('detects missing root or namespaces', () => {
    const badXml = '<not-tt><head></head><body></body></not-tt>';
    const res = validateTTML(badXml);
    assert.equal(res.valid, false);
    assert.ok(res.error?.includes('Missing root <tt>'));
  });

  it('detects unclosed or mismatched tags', () => {
    const badXml = `<?xml version="1.0"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <head><metadata></metadata></head>
  <body>
    <div>
      <p begin="00:00:01.000" end="00:00:02.000">
    </div>
  </body>
</tt>`;
    const res = validateTTML(badXml);
    assert.equal(res.valid, false);
    assert.ok(res.error?.includes('Mismatched closing tag') || res.error?.includes('Unclosed tags'));
  });

  it('detects end timestamp earlier than begin', () => {
    const badXml = `<?xml version="1.0"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <head><metadata></metadata></head>
  <body>
    <div>
      <p begin="00:00:05.000" end="00:00:02.000">
        <span begin="00:00:05.000" end="00:00:02.000">Bad timing</span>
      </p>
    </div>
  </body>
</tt>`;
    const res = validateTTML(badXml);
    assert.equal(res.valid, false);
    assert.ok(res.error?.includes('earlier than begin'));
  });
});

describe('LRC to TTML Conversion', () => {
  it('parses synced LRC timestamps into sorted intervals', () => {
    const lrc = `
[00:10.50] First line
[00:15.20] Second line
[00:22.00] Third line
    `;
    const intervals = parseLrcTimestamps(lrc, 30000);
    assert.equal(intervals.length, 3);
    assert.equal(intervals[0]?.beginMs, 10500);
    assert.equal(intervals[0]?.endMs, 15200);
    assert.equal(intervals[0]?.text, 'First line');
    assert.equal(intervals[1]?.beginMs, 15200);
    assert.equal(intervals[1]?.endMs, 22000);
  });

  it('converts synced LRC into valid TTML XML structure', () => {
    const lrc = '[00:05.00] Hello world\n[00:08.50] Second phrase';
    const ttml = convertLrcToTTML(lrc, {
      title: 'Hello Song',
      artist: 'Singer',
      durationMs: 15000,
    });

    assert.ok(ttml.includes('<ttm:title>Hello Song</ttm:title>'));
    assert.ok(ttml.includes('<ttm:agent type="person" xml:id="v1">Singer</ttm:agent>'));
    assert.ok(ttml.includes('begin="00:00:05.000"'));
    assert.ok(ttml.includes('Hello world'));

    // Validate the generated TTML with the validator
    const valRes = validateTTML(ttml);
    assert.equal(valRes.valid, true, `Generated TTML should be valid: ${valRes.error}`);
  });
});

describe('Cloudflare Worker API Routes', () => {
  it('GET / returns service status and online confirmation', async () => {
    const res = await app.request('/');
    assert.equal(res.status, 200);
    const body = (await res.json()) as { service: string; status: string };
    assert.equal(body.service, "Bru's Lyrics API");
    assert.equal(body.status, 'online');
  });

  it('GET /health returns healthy status', async () => {
    const res = await app.request('/health');
    assert.equal(res.status, 200);
    const body = (await res.json()) as { status: string };
    assert.equal(body.status, 'healthy');
  });

  it('GET /v1/lyrics Step A: matches exact Spotify track ID', async () => {
    const res = await app.request('/v1/lyrics?trackId=4cOdK2wGLETKBW3PvgPWqT&platform=spotify');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('X-Lyrics-Source'), 'brus-lyrics-verified');
    assert.equal(res.headers.get('Content-Type'), 'application/ttml+xml; charset=utf-8');
    const ttml = await res.text();
    assert.ok(ttml.includes('<ttm:title>Yellow</ttm:title>'));
    assert.ok(ttml.includes('Coldplay'));
  });

  it('GET /v1/lyrics Step B: normalized matching on title + artist + duration', async () => {
    const res = await app.request(
      '/v1/lyrics?title=entre%20golpes%20y%20besos&artist=los%20dareyes%20de%20la%20sierra&duration=192000'
    );
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('X-Lyrics-Source'), 'brus-lyrics-verified');
    const ttml = await res.text();
    assert.ok(ttml.includes('Entre Golpes y Besos'));
  });

  it('GET /v1/lyrics Step B: tolerates duration within 2500ms difference', async () => {
    // 192000ms song queried with 193500ms (1500ms diff <= 2500ms)
    const res = await app.request(
      '/v1/lyrics?title=Entre%20Golpes%20y%20Besos%20(Remastered)&artist=Los%20Dareyes&duration=193500'
    );
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('X-Lyrics-Source'), 'brus-lyrics-verified');
  });

  it('GET /v1/lyrics returns 400 when missing both trackId and title/artist', async () => {
    const res = await app.request('/v1/lyrics');
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.ok(body.error);
  });

  it('GET /v1/lyrics Step C: fallback to LRCLIB when track not in verified catalog', async () => {
    // Coldplay - Fix You (not in verified catalog, available on LRCLIB)
    const res = await app.request('/v1/lyrics?title=Fix%20You&artist=Coldplay&duration=295000');
    // If LRCLIB is reachable, status will be 200 with fallback header; if network restricted, 404
    if (res.status === 200) {
      assert.equal(res.headers.get('X-Lyrics-Source'), 'lrclib-fallback');
      const ttml = await res.text();
      assert.ok(ttml.includes('<tt'));
      const val = validateTTML(ttml);
      assert.equal(val.valid, true);
    } else {
      assert.equal(res.status, 404);
    }
  });

  it('POST /v1/submit: rejects malformed XML', async () => {
    const payload = {
      metadata: {
        title: 'Broken Song',
        artist: 'Broken Artist',
        durationMs: 120000,
      },
      ttmlRaw: '<tt>missing-ns-and-body</tt>',
      contributor: 'Tester',
    };

    const res = await app.request('/v1/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'Invalid TTML XML structure');
  });

  it('POST /v1/submit: accepts valid TTML and stores/queues it', async () => {
    const validTtml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xml:lang="en">
  <head>
    <metadata>
      <ttm:title>Submitted Song</ttm:title>
      <ttm:agent type="person" xml:id="v1">Submitted Artist</ttm:agent>
    </metadata>
  </head>
  <body>
    <div>
      <p begin="00:00:01.000" end="00:00:03.000" ttm:agent="v1">
        <span begin="00:00:01.000" end="00:00:03.000">Line one</span>
      </p>
    </div>
  </body>
</tt>`;

    const payload = {
      metadata: {
        spotifyId: 'test_spotify_id_999',
        title: 'Submitted Song',
        artist: 'Submitted Artist',
        durationMs: 180000,
      },
      ttmlRaw: validTtml,
      contributor: 'Verified Tester',
    };

    const res = await app.request('/v1/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as { success: boolean; songId: string };
    assert.equal(body.success, true);
    assert.ok(body.songId.includes('test_spotify_id_999'));
  });

  it('GET /v1/catalog returns paginated verified catalog', async () => {
    const res = await app.request('/v1/catalog?page=1&limit=10');
    assert.equal(res.status, 200);
    const body = (await res.json()) as { songs: unknown[]; total: number; page: number; pageSize: number };
    assert.ok(Array.isArray(body.songs));
    assert.ok(body.total >= 2);
    assert.equal(body.page, 1);
    assert.equal(body.pageSize, 10);
  });

  it('GET /v1/catalog filters with search query', async () => {
    const res = await app.request('/v1/catalog?search=Yellow');
    assert.equal(res.status, 200);
    const body = (await res.json()) as { songs: Array<{ title: string }> };
    assert.ok(body.songs.length >= 1);
    assert.equal(body.songs[0]?.title, 'Yellow');
  });

  it('GET /v1/auth/config returns Discord and Spotify client IDs', async () => {
    const res = await app.request('/v1/auth/config');
    assert.equal(res.status, 200);
    const body = (await res.json()) as { discordClientId: string; spotifyClientId: string };
    assert.equal(body.discordClientId, '1568826229006540882');
    assert.equal(body.spotifyClientId, '9b91a4fd101942cfb3fafbfad89e5d70');
  });

  it('GET /v1/spotify/token acquires or caches Spotify client credentials token', async () => {
    const res = await app.request('/v1/spotify/token');
    assert.equal(res.status, 200);
    const body = (await res.json()) as { access_token: string; token_type: string };
    assert.ok(body.access_token);
    assert.equal(body.token_type, 'Bearer');
  });

  it('GET /v1/auth/users/Bru returns verified creator profile', async () => {
    const res = await app.request('/v1/auth/users/Bru');
    assert.equal(res.status, 200);
    const body = (await res.json()) as { username: string; isVerified: boolean; role: string; id: string };
    assert.equal(body.username, 'Bru');
    assert.equal(body.isVerified, true);
    assert.equal(body.role, 'verified_creator');
  });

  it('POST /v1/auth/users and GET /v1/auth/users/:username persists contributor with verification', async () => {
    const postRes = await app.request('/v1/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'TestContributor',
        role: 'contributor',
        isVerified: true,
      }),
    });
    assert.equal(postRes.status, 201);
    const postBody = (await postRes.json()) as { success: boolean; user: { username: string; isVerified: boolean } };
    assert.equal(postBody.success, true);
    assert.equal(postBody.user.username, 'TestContributor');
    assert.equal(postBody.user.isVerified, true);

    const getRes = await app.request('/v1/auth/users/TestContributor');
    assert.equal(getRes.status, 200);
    const getBody = (await getRes.json()) as { username: string; isVerified: boolean; role: string };
    assert.equal(getBody.username, 'TestContributor');
    assert.equal(getBody.isVerified, true);
  });

  it('DELETE /v1/songs/:id: rejects unauthorized non-admin access with 403', async () => {
    const res = await app.request('/v1/songs/song_yellow', {
      method: 'DELETE',
    });
    assert.equal(res.status, 403);
    const body = (await res.json()) as { error: string };
    assert.ok(body.error.includes('strictly reserved for heysoybruno09'));
  });

  it('DELETE /v1/songs/:id: permits deletion when X-Admin-User is heysoybruno09', async () => {
    // First, submit a test song to delete
    const validTtml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xml:lang="en">
  <head><metadata><ttm:title>To Delete</ttm:title><ttm:agent type="person" xml:id="v1">Artist</ttm:agent></metadata></head>
  <body><div><p begin="00:00:01.000" end="00:00:02.000" ttm:agent="v1"><span begin="00:00:01.000" end="00:00:02.000">Word</span></p></div></body>
</tt>`;

    const submitRes = await app.request('/v1/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: {
          spotifyId: 'test_delete_track_id',
          title: 'Song To Delete',
          artist: 'Delete Artist',
          durationMs: 120000,
        },
        ttmlRaw: validTtml,
        contributor: 'heysoybruno09',
      }),
    });
    assert.equal(submitRes.status, 201);

    // Now delete it as heysoybruno09
    const deleteRes = await app.request('/v1/songs/test_delete_track_id', {
      method: 'DELETE',
      headers: {
        'X-Admin-User': 'heysoybruno09',
      },
    });
    assert.equal(deleteRes.status, 200);
    const delBody = (await deleteRes.json()) as { success: boolean; deletedId: string };
    assert.equal(delBody.success, true);
    assert.equal(delBody.deletedId, 'test_delete_track_id');
  });

  it('POST /v1/admin/verify: rejects unauthorized non-admin access with 403', async () => {
    const res = await app.request('/v1/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId: 'song_yellow', verified: true }),
    });
    assert.equal(res.status, 403);
  });

  it('POST /v1/admin/verify: approves and verifies lyrics for heysoybruno09', async () => {
    const res = await app.request('/v1/admin/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User': 'heysoybruno09',
      },
      body: JSON.stringify({ songId: '4cOdK2wGLETKBW3PvgPWqT', verified: true }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; verified: boolean };
    assert.equal(body.success, true);
    assert.equal(body.verified, true);
  });

  it('GET /v1/admin/songs: returns complete catalog and submissions to heysoybruno09', async () => {
    const res = await app.request('/v1/admin/songs', {
      headers: {
        'X-Admin-User': 'heysoybruno09',
      },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; catalog: unknown[]; submissions: unknown[] };
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.catalog));
    assert.ok(Array.isArray(body.submissions));
  });
});
