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
    assert.equal(body.service, 'Lyrics API');
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
    assert.ok(res.status === 200 || res.status === 502);
    if (res.status === 200) {
      const body = (await res.json()) as { access_token: string; token_type: string };
      assert.ok(body.access_token);
      assert.equal(body.token_type, 'Bearer');
    }
  });

  it('POST /v1/spotify/exchange: rejects request missing code or code_verifier with 400', async () => {
    const res = await app.request('/v1/spotify/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'authorization_code', code: 'test_code' }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'Missing code or code_verifier parameter');
  });

  it('POST /v1/spotify/exchange: rejects refresh_token grant missing token with 400', async () => {
    const res = await app.request('/v1/spotify/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'refresh_token' }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'Missing refresh_token parameter');
  });

  it('POST /v1/spotify/exchange: relays PKCE exchange request to Spotify and returns response', async () => {
    const res = await app.request('/v1/spotify/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: 'invalid_mock_code_for_testing',
        code_verifier: 'test_verifier_sample_1234567890123456789012345678901234567890',
        redirect_uri: 'https://brus-lyrics.pages.dev/callback',
      }),
    });
    assert.ok(res.status === 400 || res.status === 502);
    if (res.status === 400) {
      const body = (await res.json()) as { error: string };
      assert.equal(body.error, 'invalid_grant');
    }
  });

  it('GET /v1/auth/users/Bru returns verified creator profile with stats and songs', async () => {
    const res = await app.request('/v1/auth/users/Bru');
    assert.equal(res.status, 200);
    const body = (await res.json()) as { username: string; isVerified: boolean; role: string; id: string; stats: any; songs: any[] };
    assert.equal(body.username, 'Bru');
    assert.equal(body.isVerified, true);
    assert.equal(body.role, 'verified_creator');
    assert.ok(body.stats && typeof body.stats.lyricsAdded === 'number');
    assert.ok(Array.isArray(body.songs));
  });

  it('GET /v1/auth/users/heysoybruno099 returns admin profile with stats and songs', async () => {
    const res = await app.request('/v1/auth/users/heysoybruno099');
    assert.equal(res.status, 200);
    const body = (await res.json()) as { username: string; isVerified: boolean; role: string; stats: any; songs: any[] };
    assert.equal(body.username, 'heysoybruno099');
    assert.equal(body.isVerified, true);
    assert.equal(body.role, 'admin');
    assert.ok(body.stats && typeof body.stats.lyricsAdded === 'number');
    assert.ok(Array.isArray(body.songs));
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
    const getBody = (await getRes.json()) as { username: string; isVerified: boolean; role: string; stats: any; songs: any[] };
    assert.equal(getBody.username, 'TestContributor');
    assert.equal(getBody.isVerified, true);
    assert.ok(getBody.stats && typeof getBody.stats.lyricsAdded === 'number');
    assert.ok(Array.isArray(getBody.songs));
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

  it('POST /v1/admin/verify: approves and verifies lyrics for heysoybruno099 via query param', async () => {
    const res = await app.request('/v1/admin/verify?adminUser=heysoybruno099', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ songId: '4cOdK2wGLETKBW3PvgPWqT', verified: true }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; verified: boolean };
    assert.equal(body.success, true);
    assert.equal(body.verified, true);
  });

  it('POST /v1/admin/verify: approves community submission, promotes to catalog, and makes lyrics queryable', async () => {
    const validTtml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xml:lang="en">
  <head><metadata><ttm:title>Community Approval Test</ttm:title><ttm:agent type="person" xml:id="v1">Approval Artist</ttm:agent></metadata></head>
  <body><div><p begin="00:00:01.000" end="00:00:03.000" ttm:agent="v1"><span begin="00:00:01.000" end="00:00:03.000">Approved lyric line</span></p></div></body>
</tt>`;

    // 1. Submit community song
    const submitRes = await app.request('/v1/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: {
          spotifyId: 'spotify_comm_approve_77',
          title: 'Community Approval Test',
          artist: 'Approval Artist',
          durationMs: 140000,
        },
        ttmlRaw: validTtml,
        contributor: 'CommunityUser',
      }),
    });
    assert.equal(submitRes.status, 201);

    // 2. Approve via admin endpoint
    const verifyRes = await app.request('/v1/admin/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User': 'heysoybruno09',
      },
      body: JSON.stringify({ songId: 'spotify_comm_approve_77', verified: true }),
    });
    assert.equal(verifyRes.status, 200);

    // 3. Query lyrics by clean ID
    const queryRes1 = await app.request('/v1/lyrics?trackId=spotify_comm_approve_77&platform=spotify');
    assert.equal(queryRes1.status, 200);
    const ttml1 = await queryRes1.text();
    assert.ok(ttml1.includes('Approved lyric line'));

    // 4. Query lyrics by song_ prefixed ID
    const queryRes2 = await app.request('/v1/lyrics?trackId=song_spotify_comm_approve_77');
    assert.equal(queryRes2.status, 200);
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

  it('GET /v1/youtube/search: searches YouTube and returns video suggestions', async () => {
    const res = await app.request('/v1/youtube/search?q=Coldplay+Yellow');
    assert.equal(res.status, 200);
    const body = (await res.json()) as { results: Array<{ videoId: string; title: string }> };
    assert.ok(Array.isArray(body.results));
    if (body.results.length > 0) {
      assert.ok(body.results[0]?.videoId);
      assert.equal(body.results[0]?.videoId.length, 11);
    }
  });

  it('Platform targeting: filters out desynced lyrics based on platform query parameter', async () => {
    // 1. Submit a track targeted ONLY for YouTube Music (platformTarget = 'ytm')
    const ttmlYtmOnly = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-internal" xml:lang="en">
  <head>
    <metadata>
      <ttm:title>YTM Only Song</ttm:title>
      <ttm:agent type="person" xml:id="v1">Desynced Artist</ttm:agent>
      <itunes:platformTarget>ytm</itunes:platformTarget>
    </metadata>
  </head>
  <body><div><p begin="00:00:01.000" end="00:00:04.000" ttm:agent="v1"><span begin="00:00:01.000" end="00:00:04.000">YT edit</span></p></div></body>
</tt>`;

    const submitRes = await app.request('/v1/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: {
          spotifyId: 'spotify_desync_test_id',
          ytmId: 'ytm_desync_vid',
          title: 'YTM Only Song',
          artist: 'Desynced Artist',
          durationMs: 200000,
          platformTarget: 'ytm',
        },
        ttmlRaw: ttmlYtmOnly,
        platformTarget: 'ytm',
        contributor: 'heysoybruno09',
      }),
    });
    assert.equal(submitRes.status, 201);

    // Query with platform=spotify -> should NOT return the YTM-only lyrics
    const resSpotify = await app.request('/v1/lyrics?trackId=spotify_desync_test_id&platform=spotify');
    assert.notEqual(resSpotify.headers.get('X-Lyrics-Source'), 'brus-lyrics-verified');

    // Query with platform=ytm -> SHOULD return the YTM lyrics
    const resYtm = await app.request('/v1/lyrics?trackId=ytm_desync_vid&platform=ytm');
    assert.equal(resYtm.status, 200);
    assert.equal(resYtm.headers.get('X-Lyrics-Source'), 'brus-lyrics-verified');
  });

  it('POST /v1/submit: auto-approves immediately for heysoybruno09 with zero pending verification', async () => {
    const autoApproveTtml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xml:lang="en">
  <head><metadata><ttm:title>Auto Approve Song</ttm:title><ttm:agent type="person" xml:id="v1">Bruno Artist</ttm:agent></metadata></head>
  <body><div><p begin="00:00:01.000" end="00:00:03.000" ttm:agent="v1"><span begin="00:00:01.000" end="00:00:03.000">Auto verified text</span></p></div></body>
</tt>`;

    const res = await app.request('/v1/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Id': '1568826229006540882',
      },
      body: JSON.stringify({
        metadata: {
          spotifyId: 'spotify_auto_approve_test',
          title: 'Auto Approve Song',
          artist: 'Bruno Artist',
          durationMs: 180000,
        },
        ttmlRaw: autoApproveTtml,
        contributor: 'heysoybruno09',
      }),
    });
    assert.equal(res.status, 201);

    // Verify it is instantly in the catalog without manual approval
    const catalogRes = await app.request('/v1/catalog?q=Auto%20Approve%20Song');
    assert.equal(catalogRes.status, 200);
    const catalogBody = (await catalogRes.json()) as any;
    assert.ok(catalogBody.songs.length > 0);
    assert.equal(catalogBody.songs[0].spotify_id, 'spotify_auto_approve_test');
    assert.equal(catalogBody.songs[0].is_verified, 1);
    assert.equal(catalogBody.songs[0].contributor, 'heysoybruno09');

    // Verify lyrics can be immediately queried
    const lyricsRes = await app.request('/v1/lyrics?trackId=spotify_auto_approve_test');
    assert.equal(lyricsRes.status, 200);
    const lyricsText = await lyricsRes.text();
    assert.ok(lyricsText.includes('Auto verified text'));

    // Now delete it using Discord ID header
    const deleteRes = await app.request('/v1/songs/spotify_auto_approve_test', {
      method: 'DELETE',
      headers: {
        'X-Admin-Id': '1568826229006540882',
      },
    });
    assert.equal(deleteRes.status, 200);

    // Verify it is immediately gone from the catalog
    const catalogAfterDelete = await app.request('/v1/catalog?q=Auto%20Approve%20Song');
    const afterBody = (await catalogAfterDelete.json()) as any;
    const match = afterBody.songs.find((s: any) => s.spotify_id === 'spotify_auto_approve_test');
    assert.equal(match, undefined);
  });
});

