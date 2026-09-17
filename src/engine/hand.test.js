import { test } from 'node:test';
import assert from 'node:assert/strict';
import { value, isSoft, isPair, legalMoves, handFor } from './hand.js';
import { cellId, cells } from './strategy.js';

// Card builder: rank 2..10 or 'A'; tens all value 10, A value 11 (SPEC §3 Card type).
const c = (rank) => ({ rank, value: rank === 'A' ? 11 : rank });

test('value: hard total sums faces', () => {
  assert.equal(value([c(10), c(6)]), 16);
  assert.equal(value([c(7), c(5), c(9)]), 21);
});

test('value: ace counts 11 when it fits, else 1', () => {
  assert.equal(value([c('A'), c(5)]), 16); // soft 16
  assert.equal(value([c('A'), c(5), c(9)]), 15); // ace forced to 1
});

test('value: A,A,5 is 17, not 27 or 7 (regression: two aces)', () => {
  assert.equal(value([c('A'), c('A'), c(5)]), 17);
});

test('isSoft: true iff an ace still counts as 11', () => {
  assert.equal(isSoft([c('A'), c(7)]), true); // soft 18
  assert.equal(isSoft([c('A'), c('A'), c(5)]), true); // soft 17 — the trap case
  assert.equal(isSoft([c('A'), c(5), c(9)]), false); // ace forced to 1 -> hard 15
  assert.equal(isSoft([c(10), c(6)]), false);
});

test('isPair: two cards of equal value', () => {
  assert.equal(isPair([c(8), c(8)]), true);
  assert.equal(isPair([c(10), c(10)]), true);
  assert.equal(isPair([c('A'), c('A')]), true);
  assert.equal(isPair([c(10), c(6)]), false);
  assert.equal(isPair([c(8), c(8), c(8)]), false); // 3 cards is not a splittable pair
});

test('legalMoves: double/split/surrender only on a fresh 2-card hand', () => {
  const rules = { surrender: true };
  assert.deepEqual(legalMoves([c(10), c(6)], rules), ['H', 'S', 'D', 'R']);
  assert.deepEqual(legalMoves([c(8), c(8)], rules), ['H', 'S', 'D', 'P', 'R']);
  assert.deepEqual(legalMoves([c(10), c(6), c(2)], rules), ['H', 'S']); // after a hit
  assert.deepEqual(legalMoves([c(10), c(6)], { surrender: false }), ['H', 'S', 'D']);
});

test('handFor() builds a representative hand for a chart cell (heatmap click-to-drill, #5)', () => {
  // Round-trip property: every enumerated cell must produce a hand that grades back to that cell.
  for (const cell of cells()) {
    const { hand, upcard } = handFor(cell);
    assert.equal(cellId(hand, upcard), cell.id, `${cell.id} round-trips`);
  }

  // Spot-check the shapes a player would expect to be dealt.
  assert.deepEqual(handFor({ type: 'soft', key: 7, up: 3 }).hand.map((c) => c.rank), ['A', 7]);
  assert.deepEqual(handFor({ type: 'pair', key: 11, up: 6 }).hand.map((c) => c.rank), ['A', 'A']);
  assert.equal(handFor({ type: 'hard', key: 16, up: 10 }).upcard.rank, 10);
  assert.equal(handFor({ type: 'hard', key: 16, up: 11 }).upcard.rank, 'A', 'column 11 is the ace');

  const hard = handFor({ type: 'hard', key: 12, up: 4 }).hand;
  assert.equal(value(hard), 12);
  assert.equal(isPair(hard), false, 'a hard-total drill must not deal a splittable pair');
  assert.equal(isSoft(hard), false, 'a hard-total drill must not deal an ace');
});
