import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTagDrill, createCountdownDrill, createTrueCountDrill,
  COUNTDOWN_TARGET_MS, COUNTDOWN_STRETCH_MS, CLEAN_RUNS_TO_PASS,
  COUNTDOWN_GATE_MIN_CARDS, FULL_DECK, targetMsFor, normaliseMs,
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

test('countdown deals a PARTIAL deck, so the answer is not free', () => {
  // The bug this replaces: the drill dealt all 52 cards, Hi-Lo is balanced, so the answer was
  // always 0 — and typing 0 scored a clean run without counting a single card.
  const d = createCountdownDrill({ seed: 3, cards: 40 });
  let dealt = 0;
  while (d.next()) dealt += 1;
  assert.equal(dealt, 40, 'it deals exactly the run length asked for');
  assert.equal(d.next(), null, 'and then stops, with cards still unseen');
  assert.equal(d.remaining, 0);
  assert.equal(d.isFullShoe, false, 'a partial run, so the ending count is genuinely unknown');

  // Across a spread of seeds the ending count must actually vary, or the drill is still guessable.
  const endings = new Set();
  for (let seed = 1; seed <= 25; seed++) {
    const run = createCountdownDrill({ seed, cards: 40 });
    while (run.next());
    endings.add(run.truth);
  }
  assert.ok(endings.size > 4, `40-card runs end on ${endings.size} different counts, not one`);
  assert.ok(!(endings.size === 1 && endings.has(0)), 'and certainly not always zero');
});

test('countdown grades the count it actually reached', () => {
  const d = createCountdownDrill({ seed: 3, cards: 40 });
  while (d.next());
  const truth = d.truth;

  const clean = d.finish(truth, 15_000);
  assert.equal(clean.correct, true);
  assert.equal(clean.expected, truth);
  assert.equal(clean.cards, 40);
  assert.equal(clean.clean, true, 'right count, inside the scaled target');

  const miss = createCountdownDrill({ seed: 3, cards: 40 });
  while (miss.next());
  assert.equal(miss.finish(truth + 1, 15_000).correct, false, 'one off is wrong');
});

test('the 52-card benchmark scales to the run length rather than being ignored', () => {
  assert.equal(targetMsFor(FULL_DECK), COUNTDOWN_TARGET_MS, 'a full deck keeps the sourced 30s');
  assert.equal(targetMsFor(26), Math.round(COUNTDOWN_TARGET_MS / 2), 'half a deck, half the time');

  const short = createCountdownDrill({ seed: 5, cards: 26 });
  assert.equal(short.targetMs, targetMsFor(26));
  while (short.next());
  // 20s over 26 cards is a comfortable full-deck pace, but it is over the 15s this run allows.
  assert.equal(short.finish(short.truth, 20_000).clean, false, 'scored at its own length, not 52');

  // And a time is stored as the full-deck run it is equivalent to, so bests stay comparable.
  assert.equal(normaliseMs(15_000, 26), 30_000, '15s over half a deck is a 30s pace');
  assert.equal(normaliseMs(30_000, FULL_DECK), 30_000, 'a full deck normalises to itself');
});

test('a run too short to be evidence does not move the mastery gate', () => {
  const tiny = createCountdownDrill({ seed: 9, cards: 10 });
  while (tiny.next());
  const result = tiny.finish(tiny.truth, 3_000);
  assert.equal(result.correct, true, 'it still grades — short runs are practice');
  assert.equal(result.countsTowardGate, false, 'but the streak does not move on ten cards');

  const enough = createCountdownDrill({ seed: 9, cards: COUNTDOWN_GATE_MIN_CARDS });
  while (enough.next());
  assert.equal(enough.finish(enough.truth, 5_000).countsTowardGate, true, 'at the floor it counts');
});

test('a full-shoe run says so, because its answer is zero before it starts', () => {
  const full = createCountdownDrill({ seed: 2, decks: 1, cards: FULL_DECK });
  while (full.next());
  assert.equal(full.isFullShoe, true, 'the UI uses this to warn that the answer is not a test');
  assert.equal(full.truth, 0, 'a balanced deck still counts back to zero — the real self-check');
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
