// Persistence (SPEC §7): one JSON blob in localStorage holding SRS buckets, per-cell stats,
// bankroll, settings and gate progress. Load on boot, save after each round/drill. Every access
// is wrapped — the app must work with storage empty, blocked or corrupt. Zero Svelte, no backend.

export const STORAGE_KEY = 'blackjack-trainer/v1';

/** A fresh profile. Also the field-by-field fallback for a partial or corrupt blob. */
export const defaults = () => ({
  version: 1,
  bankroll: 1000,
  settings: { motion: 'full', audio: false },
  progress: { stats: {}, boxes: {}, recent: [] }, // srs/progress.js toJSON() shape
  gates: { countdownBestMs: null, cleanRuns: 0 },
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
    // Shallow-merge per section so a blob written by an older version keeps booting.
    return {
      ...base,
      ...saved,
      settings: { ...base.settings, ...saved.settings },
      progress: { ...base.progress, ...saved.progress },
      gates: { ...base.gates, ...saved.gates },
    };
  } catch {
    return base; // unparseable, or storage denied
  }
}

/** save(state, storage?) -> true when it stuck, false when storage refused it. Never throws. */
export function save(state, storage = browserStorage()) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return storage != null;
  } catch {
    return false;
  }
}
