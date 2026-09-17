// Mastery-gate progress (SPEC §6). Pure/framework-free; the numbers live in the store blob so
// progress survives a reload (#5). Gates guide, they never lock (SPEC Q5=C) — the evaluation
// side arrives with the guided path (#8); this is the record-keeping side.

/**
 * recordCountdown(gates, result) -> new gates.
 * `result` is a drills.js countdown run. A clean run (right count AND inside the 30s target)
 * extends the streak and can set a new best; anything else resets the streak to zero and is
 * never eligible as a best time — a fast miscount is not a fast count.
 */
export function recordCountdown(gates, { clean, elapsedMs }) {
  if (!clean) return { ...gates, cleanRuns: 0 };
  const best = gates.countdownBestMs;
  return {
    ...gates,
    countdownBestMs: best === null || elapsedMs < best ? elapsedMs : best,
    cleanRuns: gates.cleanRuns + 1,
  };
}

// ── Gate evaluation (SPEC §6) ─────────────────────────────────────────────────────────────
// Thresholds are SPEC's, not invented here. Gates GUIDE: they produce a recommendation and a
// progress readout, never a permission — nothing in this module can lock a mode (SPEC Q5=C).
import { COUNTDOWN_TARGET_MS, CLEAN_RUNS_TO_PASS } from '../engine/drills.js';
import { DEVIATION_CARD_IDS } from '../engine/deviations.js';

export const STRATEGY_ACCURACY = 0.99; // >=99% ...
export const STRATEGY_WINDOW = 50; // ... over the last ~50 decisions

/**
 * evaluateGates(progress, gates) -> { strategy, counting, deviations }.
 * `progress` is an srs/progress.js instance; `gates` is the store blob's gates section.
 */
export function evaluateGates(progress, gates) {
  const accuracy = progress.recentAccuracy(STRATEGY_WINDOW);
  const decisions = progress.recentCount(STRATEGY_WINDOW);
  const learningCells = progress.cellsInBucket('Learning').length;

  const strategy = {
    accuracy,
    decisions,
    learningCells,
    // A full window at the bar, and nothing still being learned — a cell you missed and never
    // re-earned keeps the gate open however clean the recent run has been.
    passed: decisions >= STRATEGY_WINDOW && accuracy >= STRATEGY_ACCURACY && learningCells === 0,
  };

  const counting = {
    cleanRuns: gates.cleanRuns,
    bestMs: gates.countdownBestMs,
    passed: gates.cleanRuns >= CLEAN_RUNS_TO_PASS && gates.countdownBestMs !== null && gates.countdownBestMs <= COUNTDOWN_TARGET_MS,
  };

  // Deviations are the third rung: they need both the chart and the count underneath them.
  // "Learned" borrows the strategy gate's language — an index still in New or Learning is one
  // you cannot be relied on to make at the table.
  const remaining = DEVIATION_CARD_IDS.filter((id) => ['New', 'Learning'].includes(progress.stats(id).bucket));
  const deviations = {
    suggested: strategy.passed && counting.passed,
    remaining: remaining.length,
    total: DEVIATION_CARD_IDS.length,
    passed: strategy.passed && counting.passed && remaining.length === 0,
  };

  return { strategy, counting, deviations };
}

/**
 * recommendNext(progress, gates) -> { route, label, why }: the single "Continue →" the guided
 * path offers. The free menu ignores this entirely.
 */
export function recommendNext(progress, gates) {
  const g = evaluateGates(progress, gates);

  if (!g.strategy.passed) {
    const why =
      g.strategy.decisions < STRATEGY_WINDOW
        ? `Play some hands — ${g.strategy.decisions} of ${STRATEGY_WINDOW} decisions graded so far.`
        : g.strategy.learningCells > 0
          ? `${g.strategy.learningCells} chart ${g.strategy.learningCells === 1 ? 'cell is' : 'cells are'} still in Learning.`
          : `Basic strategy is at ${Math.round(g.strategy.accuracy * 100)}% — the gate wants ${Math.round(STRATEGY_ACCURACY * 100)}%.`;
    return { route: 'play', label: 'Play', why };
  }

  if (!g.counting.passed) {
    const why =
      g.counting.bestMs === null || g.counting.bestMs > COUNTDOWN_TARGET_MS
        ? `Get a deck countdown under ${COUNTDOWN_TARGET_MS / 1000}s.`
        : `${g.counting.cleanRuns} of ${CLEAN_RUNS_TO_PASS} clean countdowns in a row.`;
    return { route: 'counting', label: 'Counting', why };
  }

  if (!g.deviations.passed) {
    return {
      route: 'deviations',
      label: 'Deviations',
      why:
        g.deviations.remaining === g.deviations.total
          ? 'Chart and count are solid — start learning the index plays.'
          : `${g.deviations.remaining} of ${g.deviations.total} indices still need work.`,
    };
  }

  return {
    route: 'integration',
    label: 'Integration',
    why: 'Everything is in place — put the count, the bet and the indices together on one table.',
  };
}
