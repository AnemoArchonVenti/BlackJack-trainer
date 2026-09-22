-- Accounts and synced progress.
--
-- Apply with:  npx wrangler d1 migrations apply twenty-one-db --remote
--
-- Design notes, because the shape of this table is a privacy decision as much as a technical one:
--
--   · No passwords, anywhere. Google is the identity provider, so the only thing proving who
--     somebody is lives at Google. There is no credential here to leak.
--   · The only personal data stored is an email address, and only so the app can say who you are
--     signed in as. No name, no avatar, no locale, no profile picture — Google offers all of
--     them and none are asked for.
--   · `google_sub` is Google's stable subject id. It is what identifies a returning user, not
--     the email, because people change their email address and Google reuses neither.
--   · Deleting a user cascades to their sessions and their progress, so "delete my account"
--     is one statement and leaves nothing behind.

CREATE TABLE users (
  id           TEXT PRIMARY KEY,           -- our own opaque id, not Google's
  google_sub   TEXT NOT NULL UNIQUE,       -- Google's stable subject identifier
  email        TEXT,                       -- shown back to the user; nothing else uses it
  created_at   INTEGER NOT NULL,           -- epoch ms
  last_seen_at INTEGER NOT NULL
);

-- Sessions are opaque random tokens. Only a SHA-256 hash is stored, so a dump of this table
-- cannot be replayed as a login — the same reason a password table stores hashes.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

-- One row per user holding exactly the JSON blob the app already keeps in localStorage. The
-- client stays the source of truth for its own shape; the server never parses this, it stores
-- and returns it. That keeps a schema change in the app from needing a migration here.
--
-- `revision` increments on every write and is what the client checks to notice that another
-- device has moved on since it last pulled.
CREATE TABLE profiles (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  blob       TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  revision   INTEGER NOT NULL DEFAULT 1
);
