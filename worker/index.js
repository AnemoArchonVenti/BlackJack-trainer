// The API behind the trainer.
//
// The site is still a directory of static files; this Worker exists only for the handful of
// /api/* routes that accounts need. wrangler.toml sends /api/* here and everything else straight
// to the assets, so the pages a visitor reads are served exactly as fast as they were before
// sign-in existed.
//
// Signing in is OPTIONAL and always will be. The trainer works with no account at all, keeping
// progress in localStorage as it always has; an account only adds a copy on the server so the
// same progress turns up on another device. Nothing gates on being signed in.
//
// What the server stores is in migrations/0001_accounts.sql, and it is deliberately almost
// nothing: a Google subject id, an email to show back to you, and the app's own progress blob.

import { startGoogleLogin, completeGoogleLogin, issueSession, currentUser, endSession, clearCookie, SESSION_COOKIE } from './auth.js';
import { findOrCreateUser, getProfile, putProfile, deleteUser, sweepExpiredSessions } from './db.js';

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders },
  });

/** What the client is allowed to know about the signed-in account. */
const publicUser = (user) => ({ id: user.id, email: user.email });

/** A profile blob has to be JSON and has to be sane in size — 256 KB is orders above a real one. */
const MAX_BLOB_BYTES = 256 * 1024;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Belt and braces: wrangler.toml already routes only /api/* here, but if that ever changes
    // the Worker should hand anything else back to the static assets rather than 404 it.
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    try {
      return await route(request, env, ctx, url);
    } catch (err) {
      // Never leak a stack trace to the client; it is the server's problem, not theirs.
      console.error('api error', url.pathname, err?.stack || err);
      return json({ error: 'Something went wrong on our side.' }, 500);
    }
  },
};

async function route(request, env, ctx, url) {
  const { pathname } = url;
  const method = request.method;

  // ── sign in ────────────────────────────────────────────────────────────────────────────────
  if (pathname === '/api/auth/google' && method === 'GET') {
    return startGoogleLogin(request, env, url);
  }

  if (pathname === '/api/auth/callback' && method === 'GET') {
    const result = await completeGoogleLogin(request, env, url);
    if (result instanceof Response) return result; // an error or a cancellation
    const { claims, next } = result;
    const user = await findOrCreateUser(env.twenty_one_db, { sub: claims.sub, email: claims.email });
    // Housekeeping on a route that already costs a round trip, rather than a scheduled job.
    ctx.waitUntil(sweepExpiredSessions(env.twenty_one_db));
    return issueSession(env, user.id, next);
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    const cleared = await endSession(request, env);
    return json({ ok: true }, 200, { 'Set-Cookie': cleared });
  }

  // ── who am I ───────────────────────────────────────────────────────────────────────────────
  if (pathname === '/api/me' && method === 'GET') {
    const user = await currentUser(request, env);
    // Signed out is a normal state here, not an error — the app asks this on every boot.
    //
    // `configured` lets the client hide the sign-in button entirely on a deployment where the
    // Google credentials have not been set, rather than offering a button that answers 503.
    return json({
      user: user ? publicUser(user) : null,
      configured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    });
  }

  // ── progress ───────────────────────────────────────────────────────────────────────────────
  if (pathname === '/api/progress') {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'Not signed in.' }, 401);

    if (method === 'GET') {
      const row = await getProfile(env.twenty_one_db, user.id);
      if (!row) return json({ profile: null, revision: 0, updatedAt: null });
      return json({ profile: JSON.parse(row.blob), revision: row.revision, updatedAt: row.updated_at });
    }

    if (method === 'PUT') {
      const text = await request.text();
      if (text.length > MAX_BLOB_BYTES) return json({ error: 'That profile is too large to store.' }, 413);

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        return json({ error: 'Profile must be JSON.' }, 400);
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return json({ error: 'Profile must be a JSON object.' }, 400);
      }

      // Re-serialise rather than storing the raw body: what goes in the column is then always
      // something this server produced from parsed JSON, not an arbitrary string a client sent.
      const row = await putProfile(env.twenty_one_db, user.id, JSON.stringify(parsed));
      return json({ ok: true, revision: row.revision, updatedAt: row.updated_at });
    }

    return json({ error: 'Method not allowed.' }, 405);
  }

  // ── delete everything ──────────────────────────────────────────────────────────────────────
  if (pathname === '/api/account' && method === 'DELETE') {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'Not signed in.' }, 401);
    await deleteUser(env.twenty_one_db, user.id);
    // Sign the browser out too, or it holds a cookie for a session row that no longer exists.
    return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(SESSION_COOKIE) });
  }

  return json({ error: 'No such endpoint.' }, 404);
}
