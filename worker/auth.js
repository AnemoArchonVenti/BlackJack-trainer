// Google sign-in, and the session cookies that follow it.
//
// This is the authorization-code flow with PKCE, run entirely server-side. No Google JavaScript
// runs on the page, which is why the site's Content-Security-Policy can stay at `script-src
// 'self'` — the whole exchange is redirects and one server-to-server call.
//
// Nothing here stores a password, because there is never one to store. What the app keeps is an
// opaque session token, and even that is kept only as a SHA-256 hash.

import { insertSession, userForSession, deleteSession } from './db.js';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

/** Sessions last 90 days. Long enough that a casual user is not signed out between visits. */
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
/** The round trip to Google and back should take seconds; ten minutes is generous. */
const FLOW_TTL_S = 600;

const SESSION_COOKIE = 'tw21_session';
const FLOW_COOKIE = 'tw21_flow';

// ── small crypto helpers ─────────────────────────────────────────────────────────────────────

const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const randomToken = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));

export async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return b64url(digest);
}

// ── cookies ──────────────────────────────────────────────────────────────────────────────────

function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

/**
 * HttpOnly so no script can read it, Secure so it never crosses plaintext, SameSite=Lax so it
 * still arrives on the top-level redirect back from Google but not on a cross-site form post.
 */
const cookie = (name, value, maxAgeSeconds) =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;

const clearCookie = (name) => `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

// ── the flow ─────────────────────────────────────────────────────────────────────────────────

const redirectUri = (url) => `${url.origin}/api/auth/callback`;

/**
 * Step one: send the browser to Google.
 *
 * The `state` guards against a forged callback and the PKCE verifier against an intercepted
 * code. Both are stashed in a short-lived HttpOnly cookie rather than in a database, because
 * they are worthless ten minutes from now and a table of them would only need sweeping.
 */
export async function startGoogleLogin(request, env, url) {
  if (!env.GOOGLE_CLIENT_ID) {
    return new Response('Sign-in is not configured on this deployment.', { status: 503 });
  }

  const state = randomToken(16);
  const verifier = randomToken(32);
  const challenge = await sha256(verifier);
  // Where to send them afterwards. Only same-site paths, so this cannot become an open redirect.
  const rawNext = url.searchParams.get('next') || '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  const authUrl = new URL(GOOGLE_AUTH);
  authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri(url));
  authUrl.searchParams.set('response_type', 'code');
  // openid gives the subject id; email is the only profile detail this app asks for, and it is
  // asked for so the page can say who you are signed in as. No name, no picture.
  authUrl.searchParams.set('scope', 'openid email');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('prompt', 'select_account');

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      'Set-Cookie': cookie(FLOW_COOKIE, JSON.stringify({ state, verifier, next }), FLOW_TTL_S),
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Step two: Google sends the browser back with a code. Verify it belongs to the flow we started,
 * trade it for tokens, and turn the result into a session.
 */
export async function completeGoogleLogin(request, env, url) {
  const raw = readCookie(request, FLOW_COOKIE);
  if (!raw) return fail('That sign-in attempt expired. Try again.');

  let flow;
  try {
    flow = JSON.parse(raw);
  } catch {
    return fail('That sign-in attempt could not be read. Try again.');
  }

  const returnedState = url.searchParams.get('state');
  // Constant-time-ish comparison is overkill for a value we generated seconds ago, but a
  // mismatch must be fatal: it means the callback did not come from the flow we started.
  if (!returnedState || returnedState !== flow.state) return fail('Sign-in could not be verified. Try again.');

  if (url.searchParams.get('error')) {
    // The person clicked Cancel on Google's screen. Not an error worth a scary page.
    return backTo(flow.next || '/');
  }

  const code = url.searchParams.get('code');
  if (!code) return fail('Google did not return an authorization code.');

  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri(url),
    grant_type: 'authorization_code',
    code_verifier: flow.verifier,
  });

  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) return fail('Google refused the sign-in. Try again.');

  const tokens = await res.json();
  const claims = decodeIdToken(tokens.id_token);
  if (!claims?.sub) return fail('Google returned a token this app could not read.');

  return { claims, next: flow.next || '/' };
}

/**
 * Read the claims out of an ID token WITHOUT verifying its signature.
 *
 * That is safe here, and only here, for the reason OpenID Connect spec §3.1.3.7 gives: this
 * token did not arrive via the browser, it came back on a direct TLS connection to Google's
 * token endpoint that we authenticated to with the client secret. TLS already proves who sent
 * it. A token arriving any other way would have to have its signature checked against Google's
 * JWKS, so do not reuse this function for one.
 */
function decodeIdToken(idToken) {
  try {
    const payload = idToken.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

const fail = (message) =>
  new Response(message, { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

const backTo = (path) =>
  new Response(null, { status: 302, headers: { Location: path, 'Cache-Control': 'no-store' } });

// ── sessions ─────────────────────────────────────────────────────────────────────────────────

/** Mint a session and hand back the Set-Cookie headers that land it in the browser. */
export async function issueSession(env, userId, next) {
  const token = randomToken(32);
  await insertSession(env.twenty_one_db, {
    tokenHash: await sha256(token),
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });

  const headers = new Headers({ Location: next, 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', cookie(SESSION_COOKIE, token, SESSION_TTL_MS / 1000));
  headers.append('Set-Cookie', clearCookie(FLOW_COOKIE));
  return new Response(null, { status: 302, headers });
}

/** The signed-in user for this request, or null. Every protected route goes through here. */
export async function currentUser(request, env) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  return userForSession(env.twenty_one_db, await sha256(token));
}

/** Sign out: drop the server-side row as well as the cookie, so the token is dead either way. */
export async function endSession(request, env) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await deleteSession(env.twenty_one_db, await sha256(token));
  return clearCookie(SESSION_COOKIE);
}

export { SESSION_COOKIE, clearCookie };
