import { Hono } from 'hono';
import type { Env } from '../types.js';

export const youtubeRoute = new Hono<{ Bindings: Env }>();

youtubeRoute.get('/youtube/search', async (c) => {
  const query = c.req.query('q') || c.req.query('query');
  if (!query || query.trim().length === 0) {
    return c.json({ error: 'Missing query parameter q' }, 400);
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      return c.json({ results: [], query }, 200);
    }

    const html = await res.text();
    const videoMatches = [...html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g)];
    const ids = Array.from(new Set(videoMatches.map((m) => m[1]))).slice(0, 5);

    const results = ids.map((id) => ({
      id,
      videoId: id,
      title: `${query}`,
      url: `https://music.youtube.com/watch?v=${id}`,
    }));

    return c.json({ results, query }, 200);
  } catch (err: any) {
    return c.json({ results: [], query, message: err?.message || 'Lookup failed' }, 200);
  }
});
