import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGates, recommendNext, recordCountdown, STRATEGY_ACCURACY, STRATEGY_WINDOW } from './gates.js';
import { createProgress } from './progress.js';
import { defaults } from './store.js';
import { DEVIATION_CARD_IDS } from '../engine/deviations.js';

// A player who keeps coming back to the same ten spots: cycling a small pool means cells are
// re-earned rather than seen once, which is what moves them out of Learning (see leitner.test.js).
const POOL = Array.from({ length: 10 }, (_, i) => `hard-${8 + i}-10`);

function profile({ decisions = 0, misses = 0, cleanRuns = 0, bestMs = null } = {}) {
  const progress = createProgress();
  for (let i = 0; i < decisions; i++) {
    progress.grade(POOL[i % POOL.length], i >= misses); // misses land first, then a clean run
  }
  let gates = { ...defaults().gates, cleanRuns, countdownBestMs: bestMs };
  return { progress, gates };
}

test('the thresholds are the ones SPEC §6 states', () => {
  assert.equal(STRATEGY_ACCURACY, 0.99, '>=99% of recent decisions');
  assert.equal(STRATEGY_WINDOW, 50, 'over the last ~50 decisions');
});

test('a fresh profile has passed nothing and is pointed at the play table', () => {
  const { progress, gates } = profile();
  const g = evaluateGates(progress, gates);
  assert.equal(g.strategy.passed, false);
  assert.equal(g.counting.passed, false);
  assert.equal(g.deviations.suggested, false, 'deviations sit behind strategy AND counting');

  const next = recommendNext(progress, gates);
  assert.equal(next.route, 'play');
  assert.ok(next.why, 'the recommendation explains itself');
});

test('the strategy gate needs a full window at 99%+ AND nothing left in Learning', () => {
  const short = profile({ decisions: 49 });
  assert.equal(evaluateGates(short.progress, short.gates).strategy.passed, false,
    '49 perfect decisions is not yet a window');

  const sloppy = profile({ decisions: 50, misses: 1 });
  const s = evaluateGates(sloppy.progress, sloppy.gates).strategy;
  assert.equal(s.passed, false, '98% is under the bar');
  assert.equal(s.accuracy, 0.98);

  // A cell that was missed and never re-earned is still in Learning, even at 100% recently.
  const { progress, gates } = profile({ decisions: 50 });
  progress.grade('pair-8-10', false); // drops that one cell into Learning
  for (let i = 0; i < 50; i++) progress.grade(POOL[i % POOL.length], true); // window goes clean again
  const stuck = evaluateGates(progress, gates).strategy;
  assert.equal(stuck.accuracy, 1, 'the recent window is clean...');
  assert.equal(stuck.learningCells, 1, '...but one cell is still unlearned');
  assert.equal(stuck.passed, false);

  progress.grade('pair-8-10', true); // re-earned -> Review
  assert.equal(evaluateGates(progress, gates).strategy.passed, true);
});

test('the counting gate needs five clean runs and a countdown inside the target', () => {
  const slow = profile({ decisions: 50, cleanRuns: 5, bestMs: 34_000 });
  assert.equal(evaluateGates(slow.progress, slow.gates).counting.passed, false, '34s is over the target');

  const shortStreak = profile({ decisions: 50, cleanRuns: 4, bestMs: 22_000 });
  assert.equal(evaluateGates(shortStreak.progress, shortStreak.gates).counting.passed, false, 'four runs is not five');

  const done = profile({ decisions: 50, cleanRuns: 5, bestMs: 22_000 });
  assert.equal(evaluateGates(done.progress, done.gates).counting.passed, true);
});

test('the guided path walks strategy -> counting -> deviations as each gate falls', () => {
  const learning = profile({ decisions: 50, misses: 5 });
  assert.equal(recommendNext(learning.progress, learning.gates).route, 'play');

  const strategyDone = profile({ decisions: 50 });
  assert.equal(recommendNext(strategyDone.progress, strategyDone.gates).route, 'counting',
    'strategy passed, so counting is next');

  const bothDone = profile({ decisions: 50, cleanRuns: 5, bestMs: 24_000 });
  assert.equal(recommendNext(bothDone.progress, bothDone.gates).route, 'deviations');
  assert.equal(evaluateGates(bothDone.progress, bothDone.gates).deviations.suggested, true);
});

test('gates only ever suggest — nothing in the evaluation can lock a mode', () => {
  const { progress, gates } = profile();
  const g = evaluateGates(progress, gates);
  for (const gate of [g.strategy, g.counting, g.deviations]) {
    assert.equal('locked' in gate, false, 'a gate reports progress, never permission (SPEC Q5=C)');
  }
  // And the recommendation is always one of the real modes, never "nothing you may do".
  assert.ok(['play', 'counting', 'deviations'].includes(recommendNext(progress, gates).route));
});

test('the counting gate reads the same numbers recordCountdown writes', () => {
  let { progress, gates } = profile({ decisions: 50 });
  for (let i = 0; i < 5; i++) gates = recordCountdown(gates, { clean: true, elapsedMs: 26_000 });
  assert.equal(evaluateGates(progress, gates).counting.passed, true, 'five recorded clean runs pass the gate');

  gates = recordCountdown(gates, { clean: false, elapsedMs: 40_000 });
  assert.equal(evaluateGates(progress, gates).counting.passed, false, 'a broken streak re-opens the gate');
});

test('once the indices are learned the guided path ends at the integration table (#9)', () => {
  const { progress, gates } = profile({ decisions: 50, cleanRuns: 5, bestMs: 24_000 });
  assert.equal(recommendNext(progress, gates).route, 'deviations', 'indices are still unlearned');
  assert.equal(evaluateGates(progress, gates).deviations.passed, false);

  // Two correct answers take a card New -> Learning -> Review, which is "learned" for a gate.
  for (const id of DEVIATION_CARD_IDS) {
    progress.grade(id, true);
    progress.grade(id, true);
  }
  const g = evaluateGates(progress, gates);
  assert.equal(g.deviations.passed, true, 'every index is out of New and Learning');
  assert.equal(g.deviations.remaining, 0);
  assert.equal(recommendNext(progress, gates).route, 'integration', 'the capstone is what is left');

  // One forgotten index re-opens the gate and pulls the recommendation back.
  progress.grade(DEVIATION_CARD_IDS[0], false);
  assert.equal(evaluateGates(progress, gates).deviations.remaining, 1);
  assert.equal(recommendNext(progress, gates).route, 'deviations');
});
