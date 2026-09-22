// Persistence (SPEC §7): one JSON blob in localStorage holding SRS buckets, per-cell stats,
// bankroll, settings and gate progress. Load on boot, save after each round/drill. Every access
// is wrapped — the app must work with storage empty, blocked or corrupt. Zero Svelte, no backend.

import { settingDefaults, clamp as clampSettings } from '../lib/settings.js';

export const STORAGE_KEY = 'blackjack-trainer/v1';

/** A fresh profile. Also the field-by-field fallback for a partial or corrupt blob. */
export const defaults = () => ({
  version: 1,
  bankroll: settingDefaults().bankroll, // the current roll starts at the configured one
  settings: settingDefaults(),
  progress: { stats: {}, boxes: {}, recent: [] }, // srs/progress.js toJSON() shape
  gates: { countdownBestMs: null, cleanRuns: 0 },
  // When this profile was last written, as epoch ms. Needed only once accounts exist: it is what
  // lets the app tell whether this browser or the server holds the more recent progress. Zero
  // means "never saved", which is how a fresh profile is told apart from a synced one.
  savedAt: 0,
});

// The real localStorage, or null when it is missing (Node/tests) or throws on access.
function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** load(storage?) -> the saved profile merged over defaults. Never throws. */
export function load(storage = browserStorage()) {
  const base = defaults();
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    // Shallow-merge per section so a blob written by an older version keeps booting. Settings go
    // through clamp() rather than a merge: a blob from before a setting existed gets its default,
    // and one that has been hand-edited to 400 decks gets the top of the range instead of a shoe
    // the drills cannot deal.
    return {
      ...base,
      ...saved,
      settings: clampSettings(saved.settings),
      progress: { ...base.progress, ...saved.progress },
      gates: { ...base.gates, ...saved.gates },
    };
  } catch {
    return base; // unparseable, or storage denied
  }
}

/**
 * save(state, storage?) -> true when it stuck, false when storage refused it. Never throws.
 *
 * Stamps `savedAt` on the way through, so the caller cannot forget to. Once a profile can also
 * live on a server, that timestamp is the only thing distinguishing "this browser is ahead" from
 * "the account is ahead", and a write that skipped it would look older than it is.
 */
export function save(state, storage = browserStorage()) {
  try {
    const stamped = { ...state, savedAt: Date.now() };
    storage?.setItem(STORAGE_KEY, JSON.stringify(stamped));
    return storage != null;
  } catch {
    return false;
  }
}

/** The profile as it stands on disk, for pushing to a server. Null when nothing is saved. */
export function readRaw(storage = browserStorage()) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Replace the whole profile — used when adopting an account's progress over this browser's. */
export function overwrite(state, storage = browserStorage()) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return storage != null;
  } catch {
    return false;
  }
}

/**
 * hasRealProgress(profile) -> has anything actually been done in this profile?
 *
 * A freshly opened browser and a browser that has played fifty hands both have a profile; only
 * one of them is worth warning somebody about before it is replaced. "Real" means a graded
 * decision or a counting run exists — settings changes alone do not count, because adopting an
 * account's progress over an untouched profile is not a loss worth a dialog.
 */
export function hasRealProgress(profile) {
  if (!profile || typeof profile !== 'object') return false;
  const p = profile.progress ?? {};
  const decisions = Array.isArray(p.recent) ? p.recent.length : 0;
  const cells = p.stats && typeof p.stats === 'object' ? Object.keys(p.stats).length : 0;
  const runs = profile.gates?.cleanRuns || profile.gates?.countdownBestMs ? 1 : 0;
  return decisions > 0 || cells > 0 || runs > 0;
}
