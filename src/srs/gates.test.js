import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordCountdown } from './gates.js';
import { defaults } from './store.js';

const run = (clean, elapsedMs, stretch = false) => ({ correct: clean, clean, elapsedMs, stretch });

test('a clean countdown run extends the streak and records a new best time', () => {
  let gates = defaults().gates;
  assert.deepEqual(gates, { countdownBestMs: null, cleanRuns: 0 }, 'a fresh profile has no counting history');

  gates = recordCountdown(gates, run(true, 28_000));
  assert.deepEqual(gates, { countdownBestMs: 28_000, cleanRuns: 1 });

  gates = recordCountdown(gates, run(true, 24_000, true));
  assert.deepEqual(gates, { countdownBestMs: 24_000, cleanRuns: 2 }, 'faster run becomes the best');

  gates = recordCountdown(gates, run(true, 29_000));
  assert.deepEqual(gates, { countdownBestMs: 24_000, cleanRuns: 3 }, 'a slower clean run keeps the best');
});

test('a miscounted or over-target run breaks the streak without touching the best time', () => {
  let gates = recordCountdown(recordCountdown(defaults().gates, run(true, 26_000)), run(true, 27_000));
  assert.equal(gates.cleanRuns, 2);

  gates = recordCountdown(gates, { correct: false, clean: false, elapsedMs: 15_000, stretch: true });
  assert.deepEqual(gates, { countdownBestMs: 26_000, cleanRuns: 0 },
    'a fast but wrong run is not a best time and resets the streak');

  gates = recordCountdown(recordCountdown(gates, run(true, 20_000)), { correct: true, clean: false, elapsedMs: 44_000, stretch: false });
  assert.equal(gates.cleanRuns, 0, 'right count but over 30s still breaks the streak');
  assert.equal(gates.countdownBestMs, 20_000, 'the over-target run does not register as a best');
});

test('recordCountdown does not mutate the gates it was handed (store state stays one-way)', () => {
  const before = defaults().gates;
  const after = recordCountdown(before, run(true, 21_000));
  assert.deepEqual(before, { countdownBestMs: null, cleanRuns: 0 });
  assert.notEqual(after, before);
});

test('the gate measures a counting RATE, not how short a run you picked', () => {
  // Run length is adjustable now, so a raw elapsed time is not comparable between runs. The
  // best stored is the full-deck equivalent; otherwise shortening the drill looks like speed.
  let gates = defaults().gates;
  gates = recordCountdown(gates, {
    correct: true, clean: true, elapsedMs: 12_000, normalisedMs: 24_000, countsTowardGate: true,
  });
  assert.equal(gates.countdownBestMs, 24_000, 'stored as the 52-card pace it was worth');

  gates = recordCountdown(gates, {
    correct: true, clean: true, elapsedMs: 5_000, normalisedMs: 30_000, countsTowardGate: true,
  });
  assert.equal(gates.countdownBestMs, 24_000, 'a faster clock at a slower pace is not a new best');
  assert.equal(gates.cleanRuns, 2, 'but it was still a clean run');
});

test('a run too short to be evidence leaves the streak exactly where it was', () => {
  let gates = recordCountdown(defaults().gates, run(true, 20_000));
  assert.equal(gates.cleanRuns, 1, 'one honest run banked');

  const short = { correct: true, clean: true, elapsedMs: 2_000, normalisedMs: 10_400, countsTowardGate: false };
  const after = recordCountdown(gates, short);
  assert.deepEqual(after, gates, 'practice neither advances the streak nor costs it');

  // Not even a miss on a short run should cost a streak earned on honest ones.
  const shortMiss = { correct: false, clean: false, elapsedMs: 2_000, normalisedMs: 10_400, countsTowardGate: false };
  assert.equal(recordCountdown(gates, shortMiss).cleanRuns, 1, 'and a short miss does not reset it');
});
