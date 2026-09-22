// Every query the API makes, in one place. Nothing else in the Worker writes SQL.
//
// D1 is SQLite, so parameters are bound with `?` — never interpolated. That is not a style
// preference: a Google subject id or an email arrives from outside, and string-building a query
// with it is how an injection happens.

/** The one id generator. Opaque and random — nothing about a user is derivable from it. */
export const newId = () => crypto.randomUUID();

const now = () => Date.now();

/**
 * findOrCreateUser(db, { sub, email }) -> user row.
 *
 * Matched on Google's subject id, never on email: people change their email address, and Google
 * lets them, but `sub` is stable for the life of the account. The email is refreshed on each
 * sign-in so the "signed in as" line does not go stale.
 */
export async function findOrCreateUser(db, { sub, email }) {
  const existing = await db.prepare('SELECT * FROM users WHERE google_sub = ?').bind(sub).first();
  if (existing) {
    await db
      .prepare('UPDATE users SET last_seen_at = ?, email = ? WHERE id = ?')
      .bind(now(), email ?? existing.email, existing.id)
      .run();
    return { ...existing, email: email ?? existing.email };
  }

  const user = { id: newId(), google_sub: sub, email: email ?? null, created_at: now(), last_seen_at: now() };
  await db
    .prepare('INSERT INTO users (id, google_sub, email, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)')
    .bind(user.id, user.google_sub, user.email, user.created_at, user.last_seen_at)
    .run();
  return user;
}

/** Store a session by the HASH of its token, so this table is useless to anyone who reads it. */
export async function insertSession(db, { tokenHash, userId, expiresAt }) {
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(tokenHash, userId, now(), expiresAt)
    .run();
}

/** The user behind a session token hash, or null when it is unknown or expired. */
export async function userForSession(db, tokenHash) {
  return db
    .prepare(
      `SELECT users.* FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    )
    .bind(tokenHash, now())
    .first();
}

export async function deleteSession(db, tokenHash) {
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}

/** Sign out everywhere — used by account deletion, and worth having on its own. */
export async function deleteAllSessions(db, userId) {
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
}

/** Expired rows are dead weight; swept opportunistically rather than on a schedule. */
export async function sweepExpiredSessions(db) {
  await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now()).run();
}

/** The saved profile, or null if this account has never synced. */
export async function getProfile(db, userId) {
  return db.prepare('SELECT blob, updated_at, revision FROM profiles WHERE user_id = ?').bind(userId).first();
}

/**
 * putProfile(db, userId, blob) -> the new revision.
 *
 * The server never parses the blob. It is the app's own JSON, stored and handed back verbatim,
 * which means the app can change its shape without this table needing a migration.
 */
export async function putProfile(db, userId, blob) {
  const row = await db
    .prepare(
      `INSERT INTO profiles (user_id, blob, updated_at, revision) VALUES (?, ?, ?, 1)
       ON CONFLICT(user_id) DO UPDATE SET blob = excluded.blob, updated_at = excluded.updated_at,
         revision = profiles.revision + 1
       RETURNING revision, updated_at`,
    )
    .bind(userId, blob, now())
    .first();
  return row;
}

/** Everything about a person, gone. The foreign keys cascade sessions and profile with them. */
export async function deleteUser(db, userId) {
  await db.prepare('PRAGMA foreign_keys = ON').run();
  await db.prepare('DELETE FROM profiles WHERE user_id = ?').bind(userId).run();
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
  await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
}
