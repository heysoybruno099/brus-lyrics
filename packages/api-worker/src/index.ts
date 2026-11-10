import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { CatalogEntry, CatalogFile } from '@brus-lyrics/shared-types';
import type { Env } from './types.js';
import { lyricsRoute } from './routes/lyrics.js';
import { submitRoute } from './routes/submit.js';
import { catalogRoute } from './routes/catalog.js';
import { spotifyRoute } from './routes/spotify.js';
import { authRoute } from './routes/auth.js';
import { adminRoute } from './routes/admin.js';
import { youtubeRoute } from './routes/youtube.js';
import { embeddedTTMLMap } from './lib/embedded-lyrics.js';

// @ts-ignore
import rawCatalog from '../../../database/catalog.json';

const catalogFile = rawCatalog as unknown as CatalogFile;
const embeddedCatalogSongs: CatalogEntry[] = Array.isArray(rawCatalog)
  ? (rawCatalog as CatalogEntry[])
  : (catalogFile.songs || []);

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for client extensions and sync studio
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Admin-User',
      'X-Admin-Id',
      'X-Admin-Token',
      'x-admin-user',
      'x-admin-id',
      'x-admin-token',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposeHeaders: [
      'X-Lyrics-Source',
      'X-Song-Id',
      'X-Song-Title',
      'X-Song-Artist',
      'Content-Length',
    ],
    maxAge: 86400,
  })
);

// Inject embedded catalog and embedded TTML map if not already configured
app.use('*', async (c, next) => {
  if (!c.env) {
    (c as unknown as { env: Record<string, unknown> }).env = {};
  }
  if (!c.env.LOCAL_CATALOG) {
    c.env.LOCAL_CATALOG = embeddedCatalogSongs;
  }
  if (!c.env.LOCAL_TTML_MAP) {
    c.env.LOCAL_TTML_MAP = embeddedTTMLMap;
  }
  await next();
});

// Health and metadata endpoint
app.get('/', (c) => {
  return c.json({
    service: 'Lyrics API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      lyrics: 'GET /v1/lyrics?trackId={id}&title={title}&artist={artist}&duration={ms}&platform={platform}',
      submit: 'POST /v1/submit',
      catalog: 'GET /v1/catalog?page={page}&limit={limit}&search={query}',
    },
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Mount /v1 API routes
app.route('/v1', lyricsRoute);
app.route('/v1', submitRoute);
app.route('/v1', catalogRoute);
app.route('/v1', spotifyRoute);
app.route('/v1', authRoute);
app.route('/v1', adminRoute);
app.route('/v1', youtubeRoute);

// Also route unversioned routes for convenience
app.route('/', lyricsRoute);
app.route('/', submitRoute);
app.route('/', catalogRoute);
app.route('/', spotifyRoute);
app.route('/', authRoute);
app.route('/', adminRoute);
app.route('/', youtubeRoute);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      path: c.req.path,
      method: c.req.method,
    },
    404
  );
});

// Global error handler
app.onError((err, c) => {
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

export default app;
export { app };
