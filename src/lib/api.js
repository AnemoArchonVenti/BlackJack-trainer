// The browser half of the accounts feature: thin wrappers over the /api/* routes.
//
// Framework-free on purpose — account.svelte.js owns the reactive state, this file only knows how
// to talk to the server. Every call is same-origin, which is why the site's Content-Security-Policy
// can stay at `connect-src 'self'`.
//
// Nothing here throws on a network failure. Signing in is optional and the trainer has to keep
// working with the server unreachable, so a failed call reports itself and the caller carries on
// with localStorage exactly as it did before accounts existed.

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** A fetch that never throws: { ok, status, data, error }. */
async function call(path, options = {}) {
  try {
    const res = await fetch(path, { credentials: 'same-origin', ...options });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // A proxy or an error page got in the way; treat it as a failure, not a crash.
      return { ok: false, status: res.status, data: null, error: 'The server sent something unreadable.' };
    }
    if (!res.ok) return { ok: false, status: res.status, data, error: data?.error || `Request failed (${res.status}).` };
    return { ok: true, status: res.status, data, error: null };
  } catch {
    return { ok: false, status: 0, data: null, error: 'Could not reach the server.' };
  }
}

/** Where to send the browser to sign in. A full navigation, not a fetch — it is an OAuth redirect. */
export const signInUrl = (next = location.pathname) => `/api/auth/google?next=${encodeURIComponent(next)}`;

/**
 * whoAmI() -> { user, configured }. Signed out is a normal answer, not an error.
 *
 * `configured` is false on a deployment with no Google credentials set, which is how the UI
 * knows to hide sign-in rather than offer a button that cannot work.
 */
export async function whoAmI() {
  const r = await call('/api/me');
  if (!r.ok) return { user: null, configured: false };
  return { user: r.data.user ?? null, configured: Boolean(r.data.configured) };
}

/** pullProfile() -> { profile, revision, updatedAt } or null when there is nothing stored yet. */
export async function pullProfile() {
  const r = await call('/api/progress');
  if (!r.ok) return { error: r.error };
  return r.data;
}

/** pushProfile(blob) -> { revision, updatedAt } or { error }. */
export async function pushProfile(blob) {
  const r = await call('/api/progress', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(blob) });
  return r.ok ? r.data : { error: r.error };
}

export async function signOut() {
  const r = await call('/api/auth/logout', { method: 'POST' });
  return r.ok;
}

/** Irreversible, and the UI must confirm before calling it. */
export async function deleteAccount() {
  const r = await call('/api/account', { method: 'DELETE' });
  return r.ok ? { ok: true } : { error: r.error };
}
