import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreShoe, COUNT_CARD_ID, BET_CARD_ID } from './integration.js';

// One round as the integration table records it.
const round = ({ called = 0, truth = 0, trueCount = 0, units = 1, decisions = [] } = {}) => ({
  calledCount: called,
  truthCount: truth,
  trueCount,
  units,
  decisions,
});
const play = (correct, cellId = 'hard-16-10') => ({ correct, wasDeviation: false, cellId });
const index = (correct, cellId = 'hard-16-10', deviationId = 'dev-hard-16-10') => ({
  correct,
  wasDeviation: true,
  cellId,
  deviationId,
});

test('an empty shoe scores nothing rather than dividing by zero', () => {
  const r = scoreShoe([]);
  assert.equal(r.rounds, 0);
  assert.equal(r.count.accuracy, null);
  assert.equal(r.deviations.accuracy, null);
  assert.equal(r.overall, null);
  assert.deepEqual(r.misses, []);
});

test('count accuracy compares what the player called to what the shoe actually held', () => {
  const r = scoreShoe([
    round({ called: 3, truth: 3 }),
    round({ called: -1, truth: -1 }),
    round({ called: 4, truth: 2 }), // two off
  ]);
  assert.deepEqual(r.count, { correct: 2, total: 3, accuracy: 2 / 3 });
  assert.equal(r.misses.filter((m) => m.id === COUNT_CARD_ID).length, 1, 'only the miscount is a miss');
});

test('bet sizing is graded against the true count that was really in the shoe', () => {
  const r = scoreShoe([
    round({ trueCount: 0, units: 1 }), // minimum on a dead shoe — right
    round({ trueCount: 5, units: 1 }), // flat-betting a hot shoe — wrong
    round({ trueCount: 5, units: 15 }), // full spread at TC +5 — right
  ]);
  assert.deepEqual(r.bets, { correct: 2, total: 3, accuracy: 2 / 3 });
  assert.equal(r.misses.filter((m) => m.id === BET_CARD_ID).length, 1);
});

test('play and deviations are scored separately — deviations are the subset that had an index', () => {
  const r = scoreShoe([
    round({ decisions: [play(true), play(false, 'soft-7-3')] }),
    round({ decisions: [index(true), index(false, 'hard-12-4', 'dev-hard-12-4')] }),
  ]);
  assert.deepEqual(r.play, { correct: 2, total: 4, accuracy: 0.5 }, 'every decision counts as play');
  assert.deepEqual(r.deviations, { correct: 1, total: 2, accuracy: 0.5 }, 'only the index spots count as deviations');
});

test('every miss comes back as an SRS card id, keyed to what was actually missed', () => {
  const r = scoreShoe([
    round({ called: 1, truth: 0, trueCount: 4, units: 1, decisions: [play(false, 'soft-7-3')] }),
    round({ decisions: [index(false, 'hard-12-4', 'dev-hard-12-4')] }),
  ]);
  const ids = r.misses.map((m) => m.id);
  assert.ok(ids.includes(COUNT_CARD_ID), 'the miscount');
  assert.ok(ids.includes(BET_CARD_ID), 'the mis-sized bet');
  assert.ok(ids.includes('soft-7-3'), 'the wrong play, by its chart cell');
  assert.ok(ids.includes('dev-hard-12-4'), 'the missed index, by its deviation id');
  assert.equal(new Set(ids).size, ids.length, 'one card per distinct miss');

  const clean = scoreShoe([round({ decisions: [play(true), index(true)] })]);
  assert.deepEqual(clean.misses, [], 'a clean shoe feeds nothing back');
});

test('the overall grade averages only the axes the shoe actually exercised', () => {
  // No deviation came up, so the overall is count + bets + play, not a zero for deviations.
  const r = scoreShoe([round({ called: 0, truth: 0, trueCount: 0, units: 1, decisions: [play(true)] })]);
  assert.equal(r.deviations.accuracy, null, 'no index spots arose');
  assert.equal(r.overall, 1, 'three out of three axes perfect is a perfect shoe');

  const half = scoreShoe([
    round({ called: 9, truth: 0, trueCount: 0, units: 1, decisions: [play(true)] }), // count wrong
  ]);
  assert.equal(half.overall, 2 / 3);
});
