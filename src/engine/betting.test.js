import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommendedUnits, gradeBet, RAMP, MAX_SPREAD } from './betting.js';

test('the ramp spans the 1-15 spread research §2a benchmarks', () => {
  assert.equal(MAX_SPREAD, 15, '6 decks, 4.5-deck penetration, 1-15 spread');
  assert.equal(RAMP[0].units, 1, 'the bottom rung is the table minimum');
  assert.equal(RAMP[RAMP.length - 1].units, MAX_SPREAD, 'the top rung is the full spread');
  for (let i = 1; i < RAMP.length; i++) {
    assert.ok(RAMP[i].units > RAMP[i - 1].units, 'units only ever increase up the ramp');
    assert.ok(RAMP[i].from > RAMP[i - 1].from, 'and each rung starts at a higher count');
  }
});

test('a bad or neutral count bets the table minimum', () => {
  for (const tc of [-8, -1, 0, 0.9, 1, 1.9]) {
    assert.equal(recommendedUnits(tc), 1, `TC ${tc} is not an edge worth pressing`);
  }
});

test('the bet climbs with the count and tops out at the spread', () => {
  assert.ok(recommendedUnits(3) > recommendedUnits(2), 'more count, more money');
  assert.ok(recommendedUnits(4) > recommendedUnits(3));
  assert.equal(recommendedUnits(9), MAX_SPREAD, 'a huge count is still capped at the spread');
  assert.equal(recommendedUnits(100), MAX_SPREAD);

  // Monotonic across the whole usable range — never a dip.
  let last = 0;
  for (let tc = -5; tc <= 12; tc += 0.5) {
    const units = recommendedUnits(tc);
    assert.ok(units >= last, `TC ${tc} does not bet less than the count below it`);
    last = units;
  }
});

test('gradeBet scores the bet against the count that was actually in the shoe', () => {
  assert.deepEqual(gradeBet(0, 1), { correct: true, want: 1, units: 1 });
  assert.equal(gradeBet(0, 5).correct, false, 'betting big on a dead shoe is a mistake');
  assert.equal(gradeBet(5, 1).correct, false, 'flat-betting a hot shoe is the expensive mistake');

  const hot = gradeBet(5, recommendedUnits(5));
  assert.equal(hot.correct, true);
  assert.equal(hot.want, recommendedUnits(5));
});
