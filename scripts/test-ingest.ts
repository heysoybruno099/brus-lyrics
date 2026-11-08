import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestInbox } from './ingest-inbox.ts';
import type { CatalogFile } from '@brus-lyrics/shared-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Scripts: ingest-inbox automation', () => {
  const testBaseDir = path.join(__dirname, '__test_workspace__');
  const testInboxDir = path.join(testBaseDir, 'inbox');
  const testTtmlDir = path.join(testBaseDir, 'ttml');
  const testCatalogPath = path.join(testBaseDir, 'catalog.json');
  const testSqlPath = path.join(testBaseDir, 'latest_inserts.sql');

  before(() => {
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testInboxDir, { recursive: true });
    fs.mkdirSync(testTtmlDir, { recursive: true });
  });

  after(() => {
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }
  });

  it('handles empty inbox gracefully without errors', () => {
    const result = ingestInbox({
      inboxDir: testInboxDir,
      ttmlDir: testTtmlDir,
      catalogPath: testCatalogPath,
      sqlOutputPath: testSqlPath,
    });

    assert.equal(result.processedCount, 0);
    assert.equal(result.files.length, 0);
  });

  it('ingests a new .ttml file, updates catalog.json, and generates SQL insert', () => {
    const sampleTtml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-extensions">
  <head>
    <metadata>
      <ttm:title>Test Inbox Song</ttm:title>
      <ttm:agent type="person" xml:id="v1">Test Inbox Artist</ttm:agent>
      <itunes:spotifyId>spotify_inbox_123</itunes:spotifyId>
      <itunes:youtubeId>ytm_inbox_456</itunes:youtubeId>
      <itunes:isrc>USABC1234567</itunes:isrc>
      <itunes:duration>185000</itunes:duration>
      <itunes:contributor>AutomatedTester</itunes:contributor>
    </metadata>
  </head>
  <body>
    <div>
      <p begin="00:00:05.000" end="00:00:10.000" ttm:agent="v1">
        <span begin="00:00:05.000" end="00:00:10.000">Inbox testing line</span>
      </p>
    </div>
  </body>
</tt>`;

    const inboxFile = path.join(testInboxDir, 'new_song.ttml');
    fs.writeFileSync(inboxFile, sampleTtml, 'utf-8');

    const result = ingestInbox({
      inboxDir: testInboxDir,
      ttmlDir: testTtmlDir,
      catalogPath: testCatalogPath,
      sqlOutputPath: testSqlPath,
    });

    assert.equal(result.processedCount, 1);
    assert.equal(fs.existsSync(inboxFile), false, 'Source file should be moved from inbox');

    const expectedDest = path.join(testTtmlDir, 'spotify_inbox_123.ttml');
    assert.equal(fs.existsSync(expectedDest), true, 'File should exist in ttml directory');

    // Verify catalog.json
    assert.equal(fs.existsSync(testCatalogPath), true);
    const catalogData = JSON.parse(fs.readFileSync(testCatalogPath, 'utf-8')) as CatalogFile;
    assert.equal(catalogData.songs.length, 1);
    const entry = catalogData.songs[0];
    assert.equal(entry?.title, 'Test Inbox Song');
    assert.equal(entry?.artist, 'Test Inbox Artist');
    assert.equal(entry?.spotify_id, 'spotify_inbox_123');
    assert.equal(entry?.ytm_id, 'ytm_inbox_456');
    assert.equal(entry?.duration_ms, 185000);
    assert.equal(entry?.title_norm, 'test inbox song');
    assert.equal(entry?.artist_norm, 'test inbox artist');

    // Verify SQL output
    assert.equal(fs.existsSync(testSqlPath), true);
    const sqlContent = fs.readFileSync(testSqlPath, 'utf-8');
    assert.ok(sqlContent.includes('INSERT INTO songs'));
    assert.ok(sqlContent.includes('spotify_inbox_123'));
    assert.ok(sqlContent.includes('ON CONFLICT(id) DO UPDATE'));
  });

  it('calculates duration from max line timestamp if itunes:duration is missing', () => {
    const noDurationTtml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-extensions">
  <head>
    <metadata>
      <ttm:title>Calculated Duration Song</ttm:title>
      <ttm:agent type="person" xml:id="v1">Solo Singer</ttm:agent>
      <itunes:spotifyId>calc_dur_777</itunes:spotifyId>
    </metadata>
  </head>
  <body>
    <div>
      <p begin="00:00:01.000" end="00:01:45.500" ttm:agent="v1">
        <span begin="00:00:01.000" end="00:01:45.500">Long song</span>
      </p>
    </div>
  </body>
</tt>`;

    fs.writeFileSync(path.join(testInboxDir, 'calc_song.ttml'), noDurationTtml, 'utf-8');

    ingestInbox({
      inboxDir: testInboxDir,
      ttmlDir: testTtmlDir,
      catalogPath: testCatalogPath,
      sqlOutputPath: testSqlPath,
    });

    const catalogData = JSON.parse(fs.readFileSync(testCatalogPath, 'utf-8')) as CatalogFile;
    const entry = catalogData.songs.find((s) => s.spotify_id === 'calc_dur_777');
    assert.ok(entry);
    // 01:45.500 = 60000 + 45000 + 500 = 105500 ms
    assert.equal(entry?.duration_ms, 105500);
  });

  it('updates existing entry when same song is ingested again without duplicating', () => {
    const updatedTtml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-extensions">
  <head>
    <metadata>
      <ttm:title>Test Inbox Song (Updated Edition)</ttm:title>
      <ttm:agent type="person" xml:id="v1">Test Inbox Artist</ttm:agent>
      <itunes:spotifyId>spotify_inbox_123</itunes:spotifyId>
      <itunes:duration>190000</itunes:duration>
      <itunes:contributor>SecondReviewer</itunes:contributor>
    </metadata>
  </head>
  <body>
    <div>
      <p begin="00:00:05.000" end="00:00:10.000" ttm:agent="v1">
        <span>Updated</span>
      </p>
    </div>
  </body>
</tt>`;

    fs.writeFileSync(path.join(testInboxDir, 'update_existing.ttml'), updatedTtml, 'utf-8');

    ingestInbox({
      inboxDir: testInboxDir,
      ttmlDir: testTtmlDir,
      catalogPath: testCatalogPath,
      sqlOutputPath: testSqlPath,
    });

    const catalogData = JSON.parse(fs.readFileSync(testCatalogPath, 'utf-8')) as CatalogFile;
    const matches = catalogData.songs.filter((s) => s.spotify_id === 'spotify_inbox_123');
    assert.equal(matches.length, 1, 'Should update existing entry rather than duplicate');
    assert.equal(matches[0]?.title, 'Test Inbox Song (Updated Edition)');
    assert.equal(matches[0]?.duration_ms, 190000);
    assert.equal(matches[0]?.contributor, 'SecondReviewer');
  });
});
