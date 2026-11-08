INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, updated_at)
VALUES (
  'song_0VjIjW4GlUZAMYd2vXMi3b',
  '0VjIjW4GlUZAMYd2vXMi3b',
  '4NRXx6U8ABQ',
  NULL,
  'Blinding Lights',
  'The Weeknd',
  'blinding lights',
  'the weeknd',
  200040,
  'database/ttml/0VjIjW4GlUZAMYd2vXMi3b.ttml',
  'Bru',
  '2026-11-07T23:50:04.872Z'
)
ON CONFLICT(id) DO UPDATE SET
  spotify_id=excluded.spotify_id,
  ytm_id=excluded.ytm_id,
  isrc=excluded.isrc,
  title=excluded.title,
  artist=excluded.artist,
  title_norm=excluded.title_norm,
  artist_norm=excluded.artist_norm,
  duration_ms=excluded.duration_ms,
  file_path=excluded.file_path,
  contributor=excluded.contributor,
  updated_at=excluded.updated_at;

INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, updated_at)
VALUES (
  'song_11mDIi9MNeOXoeSqiYQnWI',
  '11mDIi9MNeOXoeSqiYQnWI',
  '25tKbsTDRS8',
  NULL,
  'PANTI Y COLALE 2.0',
  'El Alfa',
  'panti y colale 2 0',
  'el alfa',
  279685,
  'database/ttml/11mDIi9MNeOXoeSqiYQnWI.ttml',
  'Bru',
  '2026-11-07T23:50:04.879Z'
)
ON CONFLICT(id) DO UPDATE SET
  spotify_id=excluded.spotify_id,
  ytm_id=excluded.ytm_id,
  isrc=excluded.isrc,
  title=excluded.title,
  artist=excluded.artist,
  title_norm=excluded.title_norm,
  artist_norm=excluded.artist_norm,
  duration_ms=excluded.duration_ms,
  file_path=excluded.file_path,
  contributor=excluded.contributor,
  updated_at=excluded.updated_at;

INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, updated_at)
VALUES (
  'song_1ipcb9qXpSHWhSUvdxJhsx',
  '1ipcb9qXpSHWhSUvdxJhsx',
  NULL,
  NULL,
  'Forever and Ever, Amen',
  'Randy Travis',
  'forever and ever amen',
  'randy travis',
  212640,
  'database/ttml/1ipcb9qXpSHWhSUvdxJhsx.ttml',
  'Bru',
  '2026-11-07T23:50:04.883Z'
)
ON CONFLICT(id) DO UPDATE SET
  spotify_id=excluded.spotify_id,
  ytm_id=excluded.ytm_id,
  isrc=excluded.isrc,
  title=excluded.title,
  artist=excluded.artist,
  title_norm=excluded.title_norm,
  artist_norm=excluded.artist_norm,
  duration_ms=excluded.duration_ms,
  file_path=excluded.file_path,
  contributor=excluded.contributor,
  updated_at=excluded.updated_at;

INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, updated_at)
VALUES (
  'song_2Jko3yQgktaKnFcmyLv3g7',
  '2Jko3yQgktaKnFcmyLv3g7',
  NULL,
  'GBAPA7700002',
  '1865 (96º In The Shade)',
  'Third World',
  '1865 96º in the shade',
  'third world',
  267826,
  'database/ttml/2Jko3yQgktaKnFcmyLv3g7.ttml',
  'Bru',
  '2026-11-07T23:50:04.885Z'
)
ON CONFLICT(id) DO UPDATE SET
  spotify_id=excluded.spotify_id,
  ytm_id=excluded.ytm_id,
  isrc=excluded.isrc,
  title=excluded.title,
  artist=excluded.artist,
  title_norm=excluded.title_norm,
  artist_norm=excluded.artist_norm,
  duration_ms=excluded.duration_ms,
  file_path=excluded.file_path,
  contributor=excluded.contributor,
  updated_at=excluded.updated_at;

INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, updated_at)
VALUES (
  'song_2XRqhe4lmCQVaUWawR5wRo',
  '2XRqhe4lmCQVaUWawR5wRo',
  NULL,
  NULL,
  'Rica y Apretadita',
  'El General, Anayka',
  'rica y apretadita',
  'el general anayka',
  261866,
  'database/ttml/2XRqhe4lmCQVaUWawR5wRo.ttml',
  'Bru',
  '2026-11-07T23:50:04.888Z'
)
ON CONFLICT(id) DO UPDATE SET
  spotify_id=excluded.spotify_id,
  ytm_id=excluded.ytm_id,
  isrc=excluded.isrc,
  title=excluded.title,
  artist=excluded.artist,
  title_norm=excluded.title_norm,
  artist_norm=excluded.artist_norm,
  duration_ms=excluded.duration_ms,
  file_path=excluded.file_path,
  contributor=excluded.contributor,
  updated_at=excluded.updated_at;

INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, updated_at)
VALUES (
  'song_36SJ7ZFx8J1f1RsewmUwMX',
  '36SJ7ZFx8J1f1RsewmUwMX',
  '9tQRhAuJHGE',
  NULL,
  'Magalenha',
  'Sérgio Mendes',
  'magalenha',
  'sergio mendes',
  216933,
  'database/ttml/36SJ7ZFx8J1f1RsewmUwMX.ttml',
  'Bru',
  '2026-11-07T23:50:04.891Z'
)
ON CONFLICT(id) DO UPDATE SET
  spotify_id=excluded.spotify_id,
  ytm_id=excluded.ytm_id,
  isrc=excluded.isrc,
  title=excluded.title,
  artist=excluded.artist,
  title_norm=excluded.title_norm,
  artist_norm=excluded.artist_norm,
  duration_ms=excluded.duration_ms,
  file_path=excluded.file_path,
  contributor=excluded.contributor,
  updated_at=excluded.updated_at;

INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, updated_at)
VALUES (
  'song_3h5T5JypYU7huFiVYhv1dr',
  '3h5T5JypYU7huFiVYhv1dr',
  NULL,
  NULL,
  'BbY WOW',
  'KAROL G',
  'bby wow',
  'karol g',
  225834,
  'database/ttml/3h5T5JypYU7huFiVYhv1dr.ttml',
  'Bru',
  '2026-11-07T23:50:04.894Z'
)
ON CONFLICT(id) DO UPDATE SET
  spotify_id=excluded.spotify_id,
  ytm_id=excluded.ytm_id,
  isrc=excluded.isrc,
  title=excluded.title,
  artist=excluded.artist,
  title_norm=excluded.title_norm,
  artist_norm=excluded.artist_norm,
  duration_ms=excluded.duration_ms,
  file_path=excluded.file_path,
  contributor=excluded.contributor,
  updated_at=excluded.updated_at;

INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, updated_at)
VALUES (
  'song_3KkXRkHbMCARz0aVfEt68P',
  '3KkXRkHbMCARz0aVfEt68P',
  'ApXoWvfEYVU',
  NULL,
  'Sunflower',
  'Post Malone, Swae Lee',
  'sunflower',
  'post malone swae lee',
  158040,
  'database/ttml/3KkXRkHbMCARz0aVfEt68P.ttml',
  'Bru',
  '2026-11-07T23:50:04.897Z'
)
ON CONFLICT(id) DO UPDATE SET
  spotify_id=excluded.spotify_id,
  ytm_id=excluded.ytm_id,
  isrc=excluded.isrc,
  title=excluded.title,
  artist=excluded.artist,
  title_norm=excluded.title_norm,
  artist_norm=excluded.artist_norm,
  duration_ms=excluded.duration_ms,
  file_path=excluded.file_path,
  contributor=excluded.contributor,
  updated_at=excluded.updated_at;

INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, updated_at)
VALUES (
  'song_4Dvkj6JhhA12EX05fT7y2e',
  '4Dvkj6JhhA12EX05fT7y2e',
  'H5v3kku4y6Q',
  NULL,
  'As It Was',
  'Harry Styles',
  'as it was',
  'harry styles',
  167303,
  'database/ttml/4Dvkj6JhhA12EX05fT7y2e.ttml',
  'Bru',
  '2026-11-07T23:50:04.899Z'
)
ON CONFLICT(id) DO UPDATE SET
  spotify_id=excluded.spotify_id,
  ytm_id=excluded.ytm_id,
  isrc=excluded.isrc,
  title=excluded.title,
  artist=excluded.artist,
  title_norm=excluded.title_norm,
  artist_norm=excluded.artist_norm,
  duration_ms=excluded.duration_ms,
  file_path=excluded.file_path,
  contributor=excluded.contributor,
  updated_at=excluded.updated_at;

INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, updated_at)
VALUES (
  'song_5tRNzcUvgWGtuOozOR7skP',
  '5tRNzcUvgWGtuOozOR7skP',
  NULL,
  'USA2P2477184',
  'El Paso del Gigante',
  'Grupo Soñador',
  'el paso del gigante',
  'grupo sonador',
  216950,
  'database/ttml/5tRNzcUvgWGtuOozOR7skP.ttml',
  'Bru',
  '2026-11-07T23:50:04.901Z'
)
ON CONFLICT(id) DO UPDATE SET
  spotify_id=excluded.spotify_id,
  ytm_id=excluded.ytm_id,
  isrc=excluded.isrc,
  title=excluded.title,
  artist=excluded.artist,
  title_norm=excluded.title_norm,
  artist_norm=excluded.artist_norm,
  duration_ms=excluded.duration_ms,
  file_path=excluded.file_path,
  contributor=excluded.contributor,
  updated_at=excluded.updated_at;

INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, updated_at)
VALUES (
  'song_7catwNsmz9tHX68C1SOfcj',
  '7catwNsmz9tHX68C1SOfcj',
  'O6b2KX0FOSo',
  NULL,
  'Me Quedo',
  'Daddy Yankee',
  'me quedo',
  'daddy yankee',
  72013,
  'database/ttml/7catwNsmz9tHX68C1SOfcj.ttml',
  'Bru',
  '2026-11-07T23:50:04.904Z'
)
ON CONFLICT(id) DO UPDATE SET
  spotify_id=excluded.spotify_id,
  ytm_id=excluded.ytm_id,
  isrc=excluded.isrc,
  title=excluded.title,
  artist=excluded.artist,
  title_norm=excluded.title_norm,
  artist_norm=excluded.artist_norm,
  duration_ms=excluded.duration_ms,
  file_path=excluded.file_path,
  contributor=excluded.contributor,
  updated_at=excluded.updated_at;

INSERT INTO songs (id, spotify_id, ytm_id, isrc, title, artist, title_norm, artist_norm, duration_ms, file_path, contributor, updated_at)
VALUES (
  'song_7qiZfU4dY1lWllzX7mPBI3',
  '7qiZfU4dY1lWllzX7mPBI3',
  'JGwWNGJdvx8',
  NULL,
  'Shape of You',
  'Ed Sheeran',
  'shape of you',
  'ed sheeran',
  233712,
  'database/ttml/7qiZfU4dY1lWllzX7mPBI3.ttml',
  'Bru',
  '2026-11-07T23:50:04.907Z'
)
ON CONFLICT(id) DO UPDATE SET
  spotify_id=excluded.spotify_id,
  ytm_id=excluded.ytm_id,
  isrc=excluded.isrc,
  title=excluded.title,
  artist=excluded.artist,
  title_norm=excluded.title_norm,
  artist_norm=excluded.artist_norm,
  duration_ms=excluded.duration_ms,
  file_path=excluded.file_path,
  contributor=excluded.contributor,
  updated_at=excluded.updated_at;
