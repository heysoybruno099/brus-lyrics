import { Hono } from 'hono';
import type { Env } from '../types.js';
import { getPaginatedCatalog } from '../lib/db.js';

export const catalogRoute = new Hono<{ Bindings: Env }>();

catalogRoute.get('/catalog', async (c) => {
  const pageParam = c.req.query('page');
  const limitParam = c.req.query('limit') || c.req.query('pageSize');
  const searchParam = c.req.query('search') || c.req.query('q');

  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const pageSize = limitParam ? parseInt(limitParam, 10) : 20;

  if (isNaN(page) || page < 1) {
    return c.json({ error: 'Query parameter "page" must be a positive integer' }, 400);
  }

  if (isNaN(pageSize) || pageSize < 1) {
    return c.json({ error: 'Query parameter "limit" or "pageSize" must be a positive integer' }, 400);
  }

  const result = await getPaginatedCatalog(c.env, page, pageSize, searchParam);
  return c.json(result, 200);
});
