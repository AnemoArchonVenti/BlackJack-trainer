import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDeviation, deviationsAvailable, shouldInsure, deviationFor, DEVIATIONS, INSURANCE_INDEX } from './deviations.js';
import { getCorrectAction, forGrading } from './strategy.js';
import { handFor } from './hand.js';

const c = (rank) => ({ rank, value: rank === 'A' ? 11 : rank });
const h = (...ranks) => ranks.map(c);
const S17 = { decks: 6, h17: false, das: true, surrender: true };
const dev = (hand, up, tc) => getDeviation(hand, c(up), tc, S17);

// ---- Table transcribed from research §3a/§3b INDEPENDENTLY (do not import the module's data) ----
test('the table is the Illustrious 18 + Fab 4, at the published indices', () => {
  assert.equal(INSURANCE_INDEX, 3, 'insurance is a pure count bet at TC >= +3');
  const published = [
    ['16 vs 10', 0], ['15 vs 10', 4], ['10,10 vs 5', 5], ['10,10 vs 6', 4], ['10 vs 10', 4],
    ['12 vs 3', 2], ['12 vs 2', 3], ['11 vs A', 1], ['9 vs 2', 1], ['10 vs A', 4], ['9 vs 7', 3],
    ['16 vs 9', 5], ['13 vs 2', -1], ['12 vs 4', 0], ['12 vs 5', -2], ['12 vs 6', -1], ['13 vs 3', -2],
    ['14 vs 10', 3], ['15 vs 10 (surrender)', 0], ['15 vs 9', 2], ['15 vs A', 1],
  ];
  assert.equal(DEVIATIONS.length, published.length, '17 hand plays from the I18 (insurance is separate) + Fab 4');
  for (const [play, index] of published) {
    const entry = DEVIATIONS.find((e) => e.play === play);
    assert.ok(entry, `${play} is in the table`);
    assert.equal(entry.index, index, `${play} index`);
  }
});

test('a positive index deviates at or above it and plays basic strategy below', () => {
  // 11 vs A: basic strategy hits under S17; the index doubles it at TC >= +1.
  assert.equal(forGrading(getCorrectAction(h(5, 6), c('A'), S17)), 'H', 'basic strategy baseline');
  assert.equal(dev(h(5, 6), 'A', 0), null, 'below the index there is no deviation');
  assert.equal(dev(h(5, 6), 'A', 1), 'D', 'at the index, double');
  assert.equal(dev(h(5, 6), 'A', 6), 'D', 'above the index, still double');

  // 10 vs 10 is the double decision (research §3a row 6, corrected against the Wizard).
  assert.equal(dev(h(6, 4), 10, 4), 'D');
  assert.equal(dev(h(6, 4), 10, 3.9), null);

  // Splitting tens is only ever right at a big count.
  assert.equal(dev(h(10, 10), 5, 5), 'P');
  assert.equal(dev(h(10, 10), 5, 4), null, 'below +5 you keep the twenty');
  assert.equal(dev(h(10, 10), 6, 4), 'P');
});

test('a negative-index stand holds at or above the index and hits below it', () => {
  // 13 vs 2: basic strategy stands; the deviation is on the LOW side.
  assert.equal(forGrading(getCorrectAction(h(10, 3), c(2), S17)), 'S', 'basic strategy baseline');
  assert.equal(dev(h(10, 3), 2, -1), null, 'at the index you are still standing — basic strategy');
  assert.equal(dev(h(10, 3), 2, 0), null, 'above it too');
  assert.equal(dev(h(10, 3), 2, -2), 'H', 'below the index, hit');

  assert.equal(dev(h(10, 2), 5, -3), 'H', '12 vs 5 hits below -2');
  assert.equal(dev(h(10, 2), 5, -2), null);
  assert.equal(dev(h(10, 2), 4, -1), 'H', '12 vs 4 hits below 0');
  assert.equal(dev(h(10, 2), 4, 0), null);
});

test('16 vs 10 stands at 0 and up, hits below — both sides differ from the surrender basic play', () => {
  assert.equal(forGrading(getCorrectAction(h(10, 6), c(10), S17)), 'R', 'basic strategy surrenders this');
  assert.equal(dev(h(10, 6), 10, 0), 'S');
  assert.equal(dev(h(10, 6), 10, 3), 'S');
  assert.equal(dev(h(10, 6), 10, -1), 'H');
});

test('15 vs 10 is the three-way spot: hit below 0, surrender 0 to +3, stand from +4', () => {
  assert.equal(forGrading(getCorrectAction(h(10, 5), c(10), S17)), 'R', 'basic strategy surrenders this');
  assert.equal(dev(h(10, 5), 10, -1), 'H', 'below 0 the surrender index says take a card');
  assert.equal(dev(h(10, 5), 10, 0), null, 'at 0 the surrender IS basic strategy — nothing to deviate to');
  assert.equal(dev(h(10, 5), 10, 3), null);
  assert.equal(dev(h(10, 5), 10, 4), 'S', 'from +4 the I18 stand outranks the surrender');
});

test('Fab 4 surrenders that basic strategy does not make', () => {
  assert.equal(forGrading(getCorrectAction(h(10, 4), c(10), S17)), 'H', '14 vs 10 is a hit');
  assert.equal(dev(h(10, 4), 10, 3), 'R');
  assert.equal(dev(h(10, 4), 10, 2), null);
  assert.equal(dev(h(10, 5), 9, 2), 'R', '15 vs 9');
  assert.equal(dev(h(10, 5), 'A', 1), 'R', '15 vs A');
  assert.equal(dev(h(10, 5), 'A', 0), null);
});

test('insurance is a pure count bet, independent of the hand', () => {
  assert.equal(shouldInsure(2.9), false);
  assert.equal(shouldInsure(3), true);
  assert.equal(shouldInsure(8), true);
});

test('S17 guard: an H17 ruleset disables deviations rather than inventing indices', () => {
  const H17 = { ...S17, h17: true };
  assert.deepEqual(deviationsAvailable(S17), { available: true, notice: null });

  const blocked = deviationsAvailable(H17);
  assert.equal(blocked.available, false);
  assert.match(blocked.notice, /not yet sourced/i, 'the UI gets a notice to show, not a silent failure');

  // Every spot that deviates under S17 must return null under H17.
  assert.equal(getDeviation(h(5, 6), c('A'), 6, H17), null);
  assert.equal(getDeviation(h(10, 6), c(10), 3, H17), null);
  assert.equal(getDeviation(h(10, 2), c(5), -5, H17), null);
});

test('a hand with no index play never deviates, however extreme the count', () => {
  for (const tc of [-10, -3, 0, 3, 10]) {
    assert.equal(dev(h(10, 8), 6, tc), null, '18 vs 6 has no index');
    assert.equal(dev(h('A', 7), 3, tc), null, 'soft 18 vs 3 has no index');
    assert.equal(dev(h(8, 8), 10, tc), null, '8,8 vs 10 has no index');
  }
});

test('every table entry is keyed to a real chart cell the player can be dealt', () => {
  for (const e of DEVIATIONS) {
    assert.ok(['hard', 'soft', 'pair'].includes(e.type), `${e.play} has a cell type`);
    assert.ok(e.up >= 2 && e.up <= 11, `${e.play} upcard is a real column`);
    assert.ok(e.id.startsWith('dev-'), `${e.play} has an SRS id`);
    assert.ok(['H', 'S', 'D', 'P', 'R'].includes(e.at), `${e.play} deviates to a pressable button`);
  }
  assert.equal(new Set(DEVIATIONS.map((e) => e.id)).size, DEVIATIONS.length, 'ids are unique');
});

test('every entry can be posed as a dealt hand that keys back to it (flashcard round-trip)', () => {
  for (const e of DEVIATIONS) {
    const { hand, upcard } = handFor(e);
    assert.equal(deviationFor(hand, upcard)?.type, e.type, `${e.play} resolves to a deviation entry`);
    // The posed hand must actually reach this entry's threshold behaviour.
    const above = getDeviation(hand, upcard, e.index, S17);
    const below = getDeviation(hand, upcard, e.index - 1, S17);
    assert.notDeepEqual([above, below], [null, null], `${e.play} deviates on one side of its index`);
  }
});
