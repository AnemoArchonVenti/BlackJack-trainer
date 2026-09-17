import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCorrectAction, forGrading, cellId, cells } from './strategy.js';

// Card builder (SPEC §3). Dealer columns run 2 3 4 5 6 7 8 9 10 A -> index 0..9.
const c = (rank) => ({ rank, value: rank === 'A' ? 11 : rank });
const UPCARDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'A'].map(c);
const S17 = { decks: 6, h17: false, das: true, surrender: true };

// ---- Chart transcribed from research §1a INDEPENDENTLY (the oracle; do not import charts.js) ----
const HARD = {
  8: 'H H H H H H H H H H',
  9: 'H D D D D H H H H H',
  10: 'D D D D D D D D H H',
  11: 'D D D D D D D D D H',
  12: 'H H S S S H H H H H',
  13: 'S S S S S H H H H H',
  14: 'S S S S S H H H H H',
  15: 'S S S S S H H H Rh H',
  16: 'S S S S S H H Rh Rh Rh',
  17: 'S S S S S S S S S S',
  18: 'S S S S S S S S S S',
  19: 'S S S S S S S S S S',
  20: 'S S S S S S S S S S',
  21: 'S S S S S S S S S S',
};
const SOFT = {
  // keyed by non-ace total: A,2 -> 2 ... A,9 -> 9
  2: 'H H H D D H H H H H',
  3: 'H H H D D H H H H H',
  4: 'H H D D D H H H H H',
  5: 'H H D D D H H H H H',
  6: 'H D D D D H H H H H',
  7: 'Ds Ds Ds Ds Ds S S H H H',
  8: 'S S S S S S S S S S',
  9: 'S S S S S S S S S S',
};
const PAIR = {
  // keyed by card value (2..10, 11 = aces)
  2: 'P P P P P P H H H H',
  3: 'P P P P P P H H H H',
  4: 'H H H P P H H H H H',
  5: 'D D D D D D D D H H',
  6: 'P P P P P H H H H H',
  7: 'P P P P P P H H H H',
  8: 'P P P P P P P P P P',
  9: 'P P P P P S P P S S',
  10: 'S S S S S S S S S S',
  11: 'P P P P P P P P P P',
};
const row = (s) => s.split(' ');

// Hand builders that avoid accidentally landing on the pair/soft tables.
const hardHand = {
  8: [c(5), c(3)], 9: [c(5), c(4)], 10: [c(6), c(4)], 11: [c(7), c(4)],
  12: [c(10), c(2)], 13: [c(10), c(3)], 14: [c(10), c(4)], 15: [c(10), c(5)],
  16: [c(10), c(6)], 17: [c(10), c(7)], 18: [c(10), c(8)], 19: [c(10), c(9)],
  20: [c(10), c(7), c(3)], 21: [c(10), c(8), c(3)], // 3-card: 2-card 20/21 would be a pair or ace
};
const softHand = (n) => [c('A'), c(n)];
const pairHand = (v) => (v === 11 ? [c('A'), c('A')] : [c(v), c(v)]);

test('hard-total sweep matches research §1a cell-for-cell', () => {
  for (const total of Object.keys(HARD)) {
    const want = row(HARD[total]);
    UPCARDS.forEach((up, i) => {
      assert.equal(getCorrectAction(hardHand[total], up, S17), want[i], `hard ${total} vs col ${i}`);
    });
  }
});

test('soft-total sweep matches research §1a cell-for-cell', () => {
  for (const n of Object.keys(SOFT)) {
    const want = row(SOFT[n]);
    UPCARDS.forEach((up, i) => {
      assert.equal(getCorrectAction(softHand(Number(n)), up, S17), want[i], `soft A,${n} vs col ${i}`);
    });
  }
});

test('pair sweep matches research §1a cell-for-cell', () => {
  for (const v of Object.keys(PAIR)) {
    const want = row(PAIR[v]);
    UPCARDS.forEach((up, i) => {
      assert.equal(getCorrectAction(pairHand(Number(v)), up, S17), want[i], `pair ${v} vs col ${i}`);
    });
  }
});

test('prototype spot-checks (the 8 in basic-strategy-drill.html)', () => {
  const g = (hand, up) => forGrading(getCorrectAction(hand, c(up), S17));
  assert.equal(g([c(10), c(6)], 10), 'R', '16 v10 -> surrender');
  assert.equal(g([c(8), c(8)], 'A'), 'P', '8,8 vs A -> P (S17)');
  assert.equal(g([c('A'), c(7)], 3), 'D', 'A,7 vs 3 -> Ds/D');
  assert.equal(g([c('A'), c(7)], 9), 'H', 'A,7 vs 9 -> H');
  assert.equal(g([c(5), c(6)], 10), 'D', '11 vs 10 -> D');
  assert.equal(g([c(5), c(6)], 'A'), 'H', '11 vs A -> H (S17)');
  assert.equal(g([c(10), c(5)], 10), 'R', '15 vs 10 -> surrender');
  assert.equal(g([c(9), c(9)], 7), 'S', '9,9 vs 7 -> S');
});

test('Ds/Rh are preserved raw but collapse to D/R for grading', () => {
  assert.equal(getCorrectAction([c('A'), c(7)], c(2), S17), 'Ds'); // raw preserved
  assert.equal(getCorrectAction([c(10), c(6)], c(9), S17), 'Rh');
  assert.equal(forGrading('Ds'), 'D');
  assert.equal(forGrading('Rh'), 'R');
  assert.equal(forGrading('H'), 'H');
});

test('H17 rule delta: 11 vs A flips H->D; default S17 stays H', () => {
  const H17 = { ...S17, h17: true };
  assert.equal(getCorrectAction([c(5), c(6)], c('A'), S17), 'H');
  assert.equal(getCorrectAction([c(5), c(6)], c('A'), H17), 'D');
  assert.equal(getCorrectAction([c(8), c(8)], c('A'), H17), 'Rh'); // 8,8 vs A: P -> surrender under H17
});

// ---- Cell identity: the heatmap/SRS key for a situation (#5) ----
test('cellId keys the chart cell a hand lands in — one oracle, no second resolver', () => {
  assert.equal(cellId([c(10), c(6)], c(10)), 'hard-16-10', 'hard total vs ten');
  assert.equal(cellId([c('A'), c(7)], c(3)), 'soft-7-3', 'soft keyed by the non-ace card');
  assert.equal(cellId([c(8), c(8)], c('A')), 'pair-8-11', 'pairs beat soft/hard; ace column is 11');
  assert.equal(cellId([c('A'), c('A')], c(6)), 'pair-11-6', 'A,A is the ace pair, not soft 12');

  // 17..21 share one chart row, so they must share one cell (and <8 clamps up to the 8 row).
  assert.equal(cellId([c(10), c(9)], c(2)), 'hard-17-2', '19 folds into the 17+ row');
  assert.equal(cellId([c(2), c(2), c(3)], c(5)), 'hard-8-5', '7 clamps up to the 8 row');

  // A three-card hand is no longer a pair or a fresh double — it keys the hard row it totals to.
  assert.equal(cellId([c(8), c(8), c(5)], c(10)), 'hard-17-10', 'split-out pair keys by total');
});

test('cells() enumerates exactly the chart grid the heatmap renders', () => {
  const all = cells();
  assert.equal(all.length, (10 + 8 + 10) * 10, 'hard 8-17 + soft 2-9 + pairs 2-11, each vs 10 upcards');
  assert.equal(new Set(all.map((x) => x.id)).size, all.length, 'ids are unique');
  // Every enumerated cell must round-trip: its id is what cellId() produces for a real hand there.
  const sample = all.find((x) => x.id === 'pair-11-11');
  assert.deepEqual({ type: sample.type, key: sample.key, up: sample.up }, { type: 'pair', key: 11, up: 11 });
  assert.equal(sample.action, 'P', 'enumerated cells carry the chart action for the reference view');
});
