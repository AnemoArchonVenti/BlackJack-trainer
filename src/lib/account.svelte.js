// Accounts and progress sync.
//
// The rule this whole file exists to honour: **signing in is optional and never blocks anything.**
// The trainer works exactly as it always has with no account — progress in localStorage, no
// network — and an account only adds a copy on the server so the same progress appears on another
// device. If the server is unreachable, every drill still runs and every result still saves.
//
// localStorage stays the working copy. The server is a mirror, written to after the fact.
//
// ── The part that could lose someone's work ─────────────────────────────────────────────────
//
// Two devices, or one device that played anonymously before signing in, can both hold progress.
// Silently picking one destroys the other, so this does not silently pick. When both sides have
// real progress and they disagree, it raises a conflict for the UI to ask about, and touches
// nothing until the person answers. Everywhere else the newer of the two wins, compared on the
// local profile's `savedAt` against the server's `updatedAt`.
//
// Last-write-wins is a real limitation, not a solved problem: play on two devices at once and the
// second save overwrites the first rather than merging cell by cell. Merging SRS state properly is
// a bigger job than this feature needed, and the sign-in prompt covers the case that actually
// bites people.

import { load, save, readRaw, overwrite, hasRealProgress } from '../srs/store.js';
import { whoAmI, pullProfile, pushProfile, signOut as apiSignOut, deleteAccount as apiDeleteAccount, signInUrl } from './api.js';

/** How long to wait after the last change before pushing. Drills fire saves in bursts. */
const PUSH_DEBOUNCE_MS = 2500;

export const account = $state({
  /** 'unknown' until the first /api/me answers — the UI shows nothing rather than guessing. */
  status: 'unknown', // 'unknown' | 'signed-out' | 'signed-in'
  user: null,
  syncing: false,
  lastSyncedAt: null,
  /** False when this deployment has no sign-in credentials — the UI then offers none. */
  configured: false,
  /** Set when the server rejected or could not be reached. Shown, never thrown. */
  error: null,
  /**
   * A pending question for the person, set when this browser and the account disagree:
   * { local, remote, localSavedAt, remoteUpdatedAt }. The UI must resolve it before sync starts.
   */
  conflict: null,
});

export { signInUrl };

let pushTimer = null;
let onAdopt = null;

/**
 * Called once from the app shell. `adopt` is how this module hands a profile back to the running
 * session — the store is not the app's state, session.svelte.js is, so a pulled profile has to be
 * given to it rather than written underneath it.
 */
export function initAccount(adopt) {
  onAdopt = adopt;
  refresh();
}

/** Ask the server who we are, and sync if the answer is somebody. */
export async function refresh() {
  const { user, configured } = await whoAmI();
  account.configured = configured;
  if (!user) {
    account.status = 'signed-out';
    account.user = null;
    return;
  }
  account.status = 'signed-in';
  account.user = user;
  await reconcile();
}

/**
 * Decide what the truth is, once, on sign-in or boot.
 *
 * Four cases, and only one of them is a question:
 *   · server has nothing         -> push this browser up
 *   · this browser has nothing   -> adopt the server's
 *   · both, and they agree       -> nothing to do
 *   · both, and they disagree    -> ASK. Touch neither side until answered.
 */
async function reconcile() {
  account.syncing = true;
  account.error = null;
  try {
    const remote = await pullProfile();
    if (remote?.error) {
      account.error = remote.error;
      return;
    }

    const local = readRaw() ?? load();
    const localHas = hasRealProgress(local);
    const remoteHas = hasRealProgress(remote.profile);

    if (!remoteHas) {
      if (localHas) await push(local);
      account.lastSyncedAt = Date.now();
      return;
    }

    if (!localHas) {
      adoptRemote(remote.profile);
      account.lastSyncedAt = Date.now();
      return;
    }

    // Both sides have something. If this browser already holds exactly what the server last
    // sent, there is nothing to reconcile — that is the ordinary case on a device you use daily.
    if (sameProfile(local, remote.profile)) {
      account.lastSyncedAt = Date.now();
      return;
    }

    account.conflict = {
      local,
      remote: remote.profile,
      localSavedAt: local.savedAt || 0,
      remoteUpdatedAt: remote.updatedAt || 0,
    };
  } finally {
    account.syncing = false;
  }
}

/** Cheap structural comparison. The blobs are small and this only runs on boot. */
function sameProfile(a, b) {
  const strip = (p) => {
    const { savedAt, ...rest } = p ?? {};
    return JSON.stringify(rest);
  };
  return strip(a) === strip(b);
}

function adoptRemote(profile) {
  overwrite({ ...profile, savedAt: Date.now() });
  onAdopt?.(profile);
}

/** The person chose. Whichever way, the other side is overwritten and the question goes away. */
export async function resolveConflict(choice) {
  const conflict = account.conflict;
  if (!conflict) return;
  account.conflict = null;

  if (choice === 'local') {
    await push(conflict.local);
  } else {
    adoptRemote(conflict.remote);
    await push(conflict.remote);
  }
  account.lastSyncedAt = Date.now();
}

async function push(profile) {
  account.syncing = true;
  const result = await pushProfile(profile);
  account.syncing = false;
  if (result?.error) {
    account.error = result.error;
    return false;
  }
  account.lastSyncedAt = Date.now();
  account.error = null;
  return true;
}

/**
 * Called by session.svelte.js after every local save. Debounced, because a round of blackjack
 * grades several cells and would otherwise be several requests for one hand.
 *
 * A pending push is deliberately NOT flushed on unload: a request fired from a closing page is
 * unreliable, and the local copy is already correct. It syncs on the next visit.
 */
export function queuePush() {
  if (account.status !== 'signed-in' || account.conflict) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const local = readRaw();
    if (local) push(local);
  }, PUSH_DEBOUNCE_MS);
}

export async function signOut() {
  clearTimeout(pushTimer);
  await apiSignOut();
  account.status = 'signed-out';
  account.user = null;
  account.conflict = null;
  account.lastSyncedAt = null;
  // The local copy is deliberately left alone. Signing out should not wipe the progress of
  // somebody who was only trying to stop syncing.
}

/** Irreversible on the server. The caller confirms first; this does not ask. */
export async function deleteAccount() {
  const result = await apiDeleteAccount();
  if (result?.error) {
    account.error = result.error;
    return false;
  }
  account.status = 'signed-out';
  account.user = null;
  account.conflict = null;
  return true;
}
