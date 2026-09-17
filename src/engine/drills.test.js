import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTagDrill, createCountdownDrill, createTrueCountDrill,
  COUNTDOWN_TARGET_MS, COUNTDOWN_STRETCH_MS, CLEAN_RUNS_TO_PASS,
} from './drills.js';

test('drill benchmarks match research §2d (re-verified 2026-09-17)', () => {
  assert.equal(COUNTDOWN_TARGET_MS, 30_000, 'pass mark: under 30 seconds');
  assert.equal(COUNTDOWN_STRETCH_MS, 25_000, 'stretch goal: 25 seconds');
  assert.equal(CLEAN_RUNS_TO_PASS, 5, 'five clean runs in a row before advancing');
});

test('tag drill flashes one card and grades the call against the Hi-Lo tags', () => {
  const d = createTagDrill({ seed: 11 });
  const seen = [];
  for (let i = 0; i < 20; i++) {
    const card = d.deal();
    seen.push(card.value);
    const truth = card.value <= 6 ? 1 : card.value <= 9 ? 0 : -1; // research §2a, stated independently
    assert.deepEqual(d.answer(truth), { correct: true, expected: truth }, `card ${card.rank}`);
  }
  assert.deepEqual(d.stats, { asked: 20, correct: 20 });

  const wrong = createTagDrill({ seed: 11 });
  const card = wrong.deal();
  const bad = card.value <= 6 ? -1 : 1;
  assert.equal(wrong.answer(bad).correct, false, 'a wrong tag is graded wrong');
  assert.deepEqual(wrong.stats, { asked: 1, correct: 0 });
  assert.deepEqual(seen.slice(0, 1), [card.value], 'same seed deals the same cards');
});

test('countdown drill streams a full deck and grades the final running count', () => {
  const d = createCountdownDrill({ seed: 3 });
  let dealt = 0;
  while (d.next()) dealt += 1;
  assert.equal(dealt, 52, 'a single deck, one card at a time');
  assert.equal(d.next(), null, 'the deck is exhausted');
  assert.equal(d.truth, 0, 'a balanced deck counts back to zero — the self-check (research §2a)');

  const clean = d.finish(0, 22_000);
  assert.deepEqual(clean, { correct: true, expected: 0, elapsedMs: 22_000, clean: true, stretch: true });

  const slow = createCountdownDrill({ seed: 3 });
  while (slow.next());
  const late = slow.finish(0, 41_000);
  assert.equal(late.correct, true, 'the count was right...');
  assert.equal(late.clean, false, '...but over 30s it is not a clean run');

  const miscount = createCountdownDrill({ seed: 4 });
  while (miscount.next());
  assert.deepEqual(miscount.finish(3, 12_000), { correct: false, expected: 0, elapsedMs: 12_000, clean: false, stretch: true });
});

test('true-count drill poses a real shoe position and grades RC / decks remaining', () => {
  const d = createTrueCountDrill({ seed: 7 });
  for (let i = 0; i < 6; i++) {
    const q = d.deal();
    assert.ok(q.decksRemaining > 0, 'a question always has decks left to divide by');
    assert.equal(Number.isInteger(q.runningCount), true, 'the running count is posed as a whole number');

    const exact = q.runningCount / q.decksRemaining;
    const nearest = Math.round(exact);
    assert.equal(d.answer(nearest).correct, true, `TC ${q.runningCount}/${q.decksRemaining} -> ${nearest}`);
    assert.equal(d.answer(nearest + 2).correct, false, 'two off is wrong');
    assert.equal(d.answer(nearest).expected, exact, 'the exact true count is reported back for feedback');
  }
});

test('true-count questions land on half-deck boundaries, the way a discard tray reads', () => {
  const d = createTrueCountDrill({ seed: 21 });
  const asked = new Set();
  for (let i = 0; i < 25; i++) {
    const { decksRemaining } = d.deal();
    assert.equal(decksRemaining * 2, Math.round(decksRemaining * 2), `${decksRemaining} decks is a half-deck step`);
    assert.ok(decksRemaining >= 0.5 && decksRemaining <= 5.5, `${decksRemaining} is a plausible tray reading`);
    asked.add(decksRemaining);
  }
  assert.ok(asked.size > 1, 'the drill varies the position rather than posing one shoe depth');
});
