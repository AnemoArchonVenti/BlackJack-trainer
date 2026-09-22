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
import { clampOne, penetrationDecks } from './settings.js';

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

/**
 * Chrome state that is not worth persisting but more than one component needs. The settings panel
 * is opened by the shell's own button and by the drills that point at a setting they depend on,
 * so "is it open" cannot live inside the shell.
 */
export const ui = $state({ settingsOpen: false });
export const openSettings = () => (ui.settingsOpen = true);
export const closeSettings = () => (ui.settingsOpen = false);
export const toggleSettings = () => (ui.settingsOpen = !ui.settingsOpen);

/**
 * Change one setting, mirror it where it matters, and save.
 * The value goes through the schema's clamp, so a slider, a typed number and a hand-edited blob
 * all land in the same allowed range — the panel never has to be the thing that validates.
 */
export function setSetting(key, value) {
  const clamped = clampOne(key, value);
  if (clamped === undefined) return session.settings; // not a setting we know about
  session.settings = { ...session.settings, [key]: clamped };
  if (key === 'audio') setAudioEnabled(clamped);
  persist();
  return session.settings;
}

/**
 * Put the bankroll back to what the table is set to start with.
 * Without this a bad session is terminal: lose the roll and the felt has nothing to bet with,
 * and clearing site data was the only way back.
 */
export function resetBankroll() {
  session.bankroll = session.settings.bankroll;
  persist();
  return session.bankroll;
}

/** The shoe arguments the table and the integration drill should deal from, per settings. */
export function shoeSettings() {
  return { decks: session.settings.decks, penetration: penetrationDecks(session.settings) };
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

/** Grade a batch of SRS cards in one go (the integration table settles several per round). */
export function gradeCards(entries) {
  for (const { id, correct } of entries) progress.grade(id, correct);
  session.revision += 1;
  persist();
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
export function cellsInBucket(bucket) {
  session.revision;
  return progress.cellsInBucket(bucket);
}

/** Record a countdown run against the counting gate and save (#6). Returns the updated gates. */
export function recordCountdownRun(result) {
  session.gates = recordCountdown(session.gates, result);
  persist();
  return session.gates;
}
