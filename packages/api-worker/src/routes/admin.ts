import { Hono } from 'hono';
import type { Env } from '../types.js';
import { deleteSong, verifySong, getAllAdminSongs } from '../lib/db.js';

export const adminRoute = new Hono<{ Bindings: Env }>();

export function checkAdminAccess(c: any): boolean {
  const adminHeader = c.req.header('X-Admin-User');
  const adminIdHeader = c.req.header('X-Admin-Id');
  const authHeader = c.req.header('Authorization');
  const queryUser = c.req.query('adminUser') || c.req.query('admin_user');
  const queryId = c.req.query('adminId') || c.req.query('admin_id');

  const normalize = (val?: string | null) => (val || '').trim().toLowerCase().replace(/^@/, '');
  const adminUsers = ['heysoybruno09', 'heysoybruno099', 'bru', '1568826229006540882'];
  const adminIds = ['1568826229006540882'];

  const normHeader = normalize(adminHeader);
  const normId = normalize(adminIdHeader);
  const normQuery = normalize(queryUser);
  const normQueryId = normalize(queryId);
  const normAuth = authHeader ? authHeader.toLowerCase() : '';

  if (adminUsers.includes(normHeader)) return true;
  if (adminIds.includes(normId) || adminUsers.includes(normId)) return true;
  if (adminUsers.includes(normQuery)) return true;
  if (adminIds.includes(normQueryId) || adminUsers.includes(normQueryId)) return true;
  if (adminUsers.some((u) => normAuth.includes(u))) return true;

  return false;
}

// DELETE /v1/songs/:id - 1-click delete song or lyrics if a mistake was made
adminRoute.delete('/songs/:id', async (c) => {
  if (!checkAdminAccess(c)) {
    return c.json(
      {
        error: 'Forbidden: Admin access strictly reserved for heysoybruno09',
      },
      403
    );
  }

  const songId = c.req.param('id');
  if (!songId || songId.trim().length === 0) {
    return c.json({ error: 'Song ID is required' }, 400);
  }

  await deleteSong(c.env, songId);

  return c.json({
    success: true,
    message: `Song ${songId} deleted successfully from catalog and submissions`,
    deletedId: songId,
  });
});

// POST /v1/admin/verify - Verify or approve lyrics in the catalog
adminRoute.post('/admin/verify', async (c) => {
  if (!checkAdminAccess(c)) {
    return c.json(
      {
        error: 'Forbidden: Admin access strictly reserved for heysoybruno09',
      },
      403
    );
  }

  let body: { songId: string; verified?: boolean };
  try {
    body = await c.req.json<{ songId: string; verified?: boolean }>();
  } catch {
    return c.json({ error: 'Malformed JSON payload in request body' }, 400);
  }

  if (!body.songId) {
    return c.json({ error: 'Field "songId" is required' }, 400);
  }

  const verified = body.verified !== false;
  await verifySong(c.env, body.songId, verified);

  return c.json({
    success: true,
    message: verified ? `Song ${body.songId} successfully verified` : `Song ${body.songId} unverified`,
    songId: body.songId,
    verified,
  });
});

// GET /v1/admin/songs - Dedicated admin panel catalog and submissions overview
adminRoute.get('/admin/songs', async (c) => {
  if (!checkAdminAccess(c)) {
    return c.json(
      {
        error: 'Forbidden: Admin access strictly reserved for heysoybruno09',
      },
      403
    );
  }

  const data = await getAllAdminSongs(c.env);
  return c.json({
    success: true,
    catalog: data.catalog,
    submissions: data.submissions,
    total: data.catalog.length + data.submissions.length,
  });
});
