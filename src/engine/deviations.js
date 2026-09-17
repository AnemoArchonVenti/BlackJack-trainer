// Deviations / index plays (SPEC §4.2). Illustrious 18 + Fab 4 with Hi-Lo true-count indices,
// transcribed from research §3a/§3b. Pure/framework-free; zero Svelte.
//
// DATA ONLY below — source of truth is the research doc. Do not hand-edit an index here; fix it
// in research first, then mirror (SPEC preamble).
//
// Reading an entry: `index` is a TRUE-count threshold. At or above it the play is `at`; below it
// the play is `below` when the table states one, otherwise basic strategy. getDeviation only
// reports an action that actually differs from basic strategy, so `null` always means
// "play the chart".
import { cellFor, getCorrectAction, forGrading } from './strategy.js';

/** Insurance is a pure count bet, not a hand play — TC >= +3 (research §3a row 1). */
export const INSURANCE_INDEX = 3;
export const shouldInsure = (trueCount) => trueCount >= INSURANCE_INDEX;

// Ordered as research lists them, and that order matters: where two entries cover one cell
// (15 vs 10 is both an I18 stand and a Fab 4 surrender) the higher-index entry is tried first.
export const DEVIATIONS = [
  // ── Illustrious 18 (research §3a), hand plays only; insurance is above ──────────────────
  { id: 'dev-hard-16-10', play: '16 vs 10', type: 'hard', key: 16, up: 10, index: 0, at: 'S', below: 'H' },
  { id: 'dev-hard-15-10', play: '15 vs 10', type: 'hard', key: 15, up: 10, index: 4, at: 'S' },
  { id: 'dev-pair-10-5', play: '10,10 vs 5', type: 'pair', key: 10, up: 5, index: 5, at: 'P' },
  { id: 'dev-pair-10-6', play: '10,10 vs 6', type: 'pair', key: 10, up: 6, index: 4, at: 'P' },
  { id: 'dev-hard-10-10', play: '10 vs 10', type: 'hard', key: 10, up: 10, index: 4, at: 'D' },
  { id: 'dev-hard-12-3', play: '12 vs 3', type: 'hard', key: 12, up: 3, index: 2, at: 'S' },
  { id: 'dev-hard-12-2', play: '12 vs 2', type: 'hard', key: 12, up: 2, index: 3, at: 'S' },
  { id: 'dev-hard-11-11', play: '11 vs A', type: 'hard', key: 11, up: 11, index: 1, at: 'D' },
  { id: 'dev-hard-9-2', play: '9 vs 2', type: 'hard', key: 9, up: 2, index: 1, at: 'D' },
  { id: 'dev-hard-10-11', play: '10 vs A', type: 'hard', key: 10, up: 11, index: 4, at: 'D' },
  { id: 'dev-hard-9-7', play: '9 vs 7', type: 'hard', key: 9, up: 7, index: 3, at: 'D' },
  { id: 'dev-hard-16-9', play: '16 vs 9', type: 'hard', key: 16, up: 9, index: 5, at: 'S' },
  // The negative-index stands: at/above you stand (which is basic strategy anyway), below you hit.
  { id: 'dev-hard-13-2', play: '13 vs 2', type: 'hard', key: 13, up: 2, index: -1, at: 'S', below: 'H' },
  { id: 'dev-hard-12-4', play: '12 vs 4', type: 'hard', key: 12, up: 4, index: 0, at: 'S', below: 'H' },
  { id: 'dev-hard-12-5', play: '12 vs 5', type: 'hard', key: 12, up: 5, index: -2, at: 'S', below: 'H' },
  { id: 'dev-hard-12-6', play: '12 vs 6', type: 'hard', key: 12, up: 6, index: -1, at: 'S', below: 'H' },
  { id: 'dev-hard-13-3', play: '13 vs 3', type: 'hard', key: 13, up: 3, index: -2, at: 'S', below: 'H' },

  // ── Fab 4 late-surrender indices (research §3b) ─────────────────────────────────────────
  { id: 'dev-hard-14-10', play: '14 vs 10', type: 'hard', key: 14, up: 10, index: 3, at: 'R' },
  // ponytail: research states only the at/above side here, but basic strategy ALREADY surrenders
  // 15 vs 10 — an index of 0 can only mean "don't surrender below 0", so the below side is a hit.
  // That is inferred from the sourced index, not a new number (research §3b note).
  { id: 'dev-hard-15-10-r', play: '15 vs 10 (surrender)', type: 'hard', key: 15, up: 10, index: 0, at: 'R', below: 'H' },
  { id: 'dev-hard-15-9', play: '15 vs 9', type: 'hard', key: 15, up: 9, index: 2, at: 'R' },
  { id: 'dev-hard-15-11', play: '15 vs A', type: 'hard', key: 15, up: 11, index: 1, at: 'R' },
];

/** Insurance is drilled as its own card, so it needs an SRS id like every table entry. */
export const INSURANCE_CARD_ID = 'dev-insurance';

/** Every card the deviation curriculum covers: insurance plus each table entry. */
export const DEVIATION_CARD_IDS = [INSURANCE_CARD_ID, ...DEVIATIONS.map((e) => e.id)];

/**
 * deviationsAvailable(rules) -> { available, notice }.
 * The table is tagged S17. Research §3c is explicit that several vs-Ace indices shift under H17
 * and warns against inventing numbers, so an H17 ruleset turns deviations off with a notice
 * rather than quietly applying S17 indices to an H17 game.
 */
export function deviationsAvailable(rules = {}) {
  if (!rules.h17) return { available: true, notice: null };
  return {
    available: false,
    notice: 'Deviations are off for this ruleset: H17 indices are not yet sourced (research §3c).',
  };
}

/**
 * getDeviation(hand, upcard, trueCount, rules) -> the deviated action, or null to play the chart.
 * Returns only actions that differ from basic strategy, so a caller can do:
 *   const action = getDeviation(...) ?? forGrading(getCorrectAction(...))
 */
export function getDeviation(hand, upcard, trueCount, rules = {}) {
  if (!deviationsAvailable(rules).available) return null;

  const cell = cellFor(hand, upcard);
  const basic = forGrading(getCorrectAction(hand, upcard, rules));

  for (const e of DEVIATIONS) {
    if (e.type !== cell.type || e.key !== cell.key || e.up !== cell.up) continue;
    const action = trueCount >= e.index ? e.at : e.below;
    if (action && action !== basic) return action;
  }
  return null;
}

/** The entry behind a deviation, for flashcard prompts and review text. */
export function deviationFor(hand, upcard) {
  const cell = cellFor(hand, upcard);
  return DEVIATIONS.find((e) => e.type === cell.type && e.key === cell.key && e.up === cell.up) ?? null;
}
