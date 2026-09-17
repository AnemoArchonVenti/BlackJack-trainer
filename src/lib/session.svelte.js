// The one live session: bankroll, settings, gate progress and the SRS, hydrated from the
// localStorage blob on boot and saved after every round/drill (SPEC §7).
// Svelte 5 runes are the rune-era equivalent of a `writable` store — Svelte-native, no external
// state library (#10). The `srs/` modules stay pure; this file is the only reactive wrapper.
import { load, save } from '../srs/store.js';
import { createProgress } from '../srs/progress.js';
import { cellId } from '../engine/strategy.js';
import { recordCountdown, evaluateGates, recommendNext } from '../srs/gates.js';
import { setAudioEnabled } from './audio.js';
import { resolveMotion, prefersReducedMotion } from './motion.js';

const saved = load();
const progress = createProgress(saved.progress);

// `revision` is the reactivity handle for the non-reactive progress module: every read below
// touches it, every grade bumps it, so $derived views recompute without cloning the SRS state.
export const session = $state({
  bankroll: saved.bankroll,
  settings: { ...saved.settings },
  gates: { ...saved.gates },
  revision: 0,
});

// Settings that reach outside the store get mirrored on boot (#10).
setAudioEnabled(session.settings.audio);

/** Change one setting, mirror it where it matters, and save. */
export function setSetting(key, value) {
  session.settings = { ...session.settings, [key]: value };
  if (key === 'audio') setAudioEnabled(value);
  persist();
}

/** The motion numbers for the current preference, with the OS setting layered on top (#10 F5). */
export function motion() {
  return resolveMotion(session.settings.motion, prefersReducedMotion());
}

export function persist() {
  return save({
    version: 1,
    bankroll: session.bankroll,
    settings: session.settings,
    gates: session.gates,
    progress: progress.toJSON(),
  });
}

/** Grade one cell into the SRS. Returns the cell's new bucket. */
export function gradeCell(id, correct) {
  const bucket = progress.grade(id, correct).bucket;
  session.revision += 1;
  return bucket;
}

/** Feed a finished round's decisions to Leitner + the heatmap, then save (#5). */
export function gradeRound(decisions) {
  for (const d of decisions) progress.grade(cellId(d.hand, d.upcard), d.correct);
  session.revision += 1;
  persist();
}

/** Mastery-gate progress for the guided path (#8). Suggestions only — nothing locks. */
export function gateProgress() {
  session.revision;
  return evaluateGates(progress, session.gates);
}

/** The single "Continue ->" the dashboard offers. */
export function nextStep() {
  session.revision;
  return recommendNext(progress, session.gates);
}

export function heatmap() {
  session.revision;
  return progress.heatmap();
}
export function cellStats(id) {
  session.revision;
  return progress.stats(id);
}
export function bucketCounts() {
  session.revision;
  return progress.counts();
}
export function recentAccuracy(n = 50) {
  session.revision;
  return progress.recentAccuracy(n);
}
export function dueFirst(ids) {
  session.revision;
  return progress.dueFirst(ids);
}
export function inBucket(bucket) {
  session.revision;
  return progress.inBucket(bucket);
}

/** Record a countdown run against the counting gate and save (#6). Returns the updated gates. */
export function recordCountdownRun(result) {
  session.gates = recordCountdown(session.gates, result);
  persist();
  return session.gates;
}
