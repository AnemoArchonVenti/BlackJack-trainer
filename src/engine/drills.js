// Counting drills (SPEC §5 mode 2, research §2d). Isolated counting practice that builds speed
// before counting has to happen at the table. Pure/framework-free; zero Svelte.
//
// Every drill grades against the shoe's ground truth (shoe.js) rather than re-implementing
// Hi-Lo, so there is exactly one counting oracle in the codebase.
import { createShoe, hiLoTag } from './shoe.js';

// Benchmarks from research §2d (Blackjack Apprenticeship). The BJA page still 403s to automated
// fetches (SPEC §9 item 2); re-verified 2026-09-17 against corroborating practice literature.
// Both times are quoted for a FULL 52-card deck, which is what makes the per-card rate below the
// only honest way to score a run of any other length.
export const COUNTDOWN_TARGET_MS = 30_000; // pass mark, for 52 cards
export const COUNTDOWN_STRETCH_MS = 25_000; // stretch goal, for 52 cards
export const CLEAN_RUNS_TO_PASS = 5; // clean runs in a row before advancing
export const FULL_DECK = 52;

/**
 * The shortest run that counts toward the counting gate.
 *
 * ponytail: a convention, not a sourced number. Runs shorter than this still grade and still
 * show a time — they are useful practice — but they do not extend the clean-run streak, because
 * a five-card run is not evidence of anything and the gate is meant to mean something.
 */
export const COUNTDOWN_GATE_MIN_CARDS = 26;

/** Scale a 52-card benchmark to a run of `cards`. The rate is sourced; the scaling is arithmetic. */
export const targetMsFor = (cards) => Math.round((COUNTDOWN_TARGET_MS / FULL_DECK) * cards);
export const stretchMsFor = (cards) => Math.round((COUNTDOWN_STRETCH_MS / FULL_DECK) * cards);

/** A run's time expressed as the 52-card run it is equivalent to, so bests stay comparable. */
export const normaliseMs = (elapsedMs, cards) =>
  cards > 0 ? Math.round((elapsedMs * FULL_DECK) / cards) : elapsedMs;

/**
 * (a) Tag speed: flash one card, the player calls +1 / 0 / −1.
 * A fresh single deck per drill keeps the card mix honest without a reshuffle.
 */
export function createTagDrill({ seed = Date.now(), decks = 1 } = {}) {
  let shoe = createShoe({ decks, seed });
  let card = null;
  let asked = 0;
  let correct = 0;

  return {
    get card() {
      return card;
    },
    get stats() {
      return { asked, correct };
    },
    /** Flash the next card. Reshuffles (same seed family) rather than running dry. */
    deal() {
      if (shoe.cardsRemaining === 0) shoe = createShoe({ decks, seed: seed + asked });
      card = shoe.draw();
      return card;
    },
    /** answer(tag) -> { correct, expected } graded against the Hi-Lo tag of the flashed card. */
    answer(tag) {
      const expected = hiLoTag(card);
      const hit = tag === expected;
      asked += 1;
      if (hit) correct += 1;
      return { correct: hit, expected };
    },
  };
}

/**
 * (b) Countdown: stream cards one at a time and end on the correct running count.
 *
 * `cards` is how many the run deals, and it is the whole point of the drill being honest.
 * Counting down a COMPLETE deck always ends on zero — Hi-Lo is balanced, so a full 52 cards sum
 * to 0 by construction. That property is a genuine self-check at a real table, but as a graded
 * exercise it is worthless: the answer is known before the first card turns, and typing 0 scores
 * a clean run without counting anything. Dealing a partial deck leaves the ending count genuinely
 * unknown, so the only way to answer is to have counted.
 *
 * The caller owns the clock; `finish` takes the elapsed time so the drill stays pure.
 */
export function createCountdownDrill({ seed = Date.now(), decks = 1, cards = 40 } = {}) {
  const shoe = createShoe({ decks, seed });
  const total = Math.max(1, Math.min(Math.round(cards), decks * FULL_DECK));
  const target = targetMsFor(total);
  const stretch = stretchMsFor(total);
  let dealt = 0;

  return {
    /** How many this run deals in total, and how many are still to come. */
    get total() {
      return total;
    },
    get remaining() {
      return total - dealt;
    },
    /** True when the run covers the whole shoe, so the answer is 0 before it starts. */
    get isFullShoe() {
      return total === decks * FULL_DECK;
    },
    /** This run's pass mark and stretch goal, scaled from the sourced 52-card benchmarks. */
    get targetMs() {
      return target;
    },
    get stretchMs() {
      return stretch;
    },
    /** The count so far — ground truth, not shown to the player mid-drill. */
    get truth() {
      return shoe.runningCount;
    },
    /** next() -> the next card, or null once the run is done. */
    next() {
      if (dealt >= total) return null;
      dealt += 1;
      return shoe.draw();
    },
    /** finish(called, elapsedMs) -> the graded run. "Clean" = right count AND inside the target. */
    finish(called, elapsedMs) {
      const expected = shoe.runningCount;
      const correct = called === expected;
      return {
        correct,
        expected,
        elapsedMs,
        cards: total,
        targetMs: target,
        // The 52-card run this was equivalent to, so a 30-card best and a 52-card best can be
        // compared at all — and so the gate measures a rate rather than a run length.
        normalisedMs: normaliseMs(elapsedMs, total),
        clean: correct && elapsedMs <= target,
        stretch: elapsedMs <= stretch,
        // Short runs are practice. They grade, they just do not move the mastery streak.
        countsTowardGate: total >= COUNTDOWN_GATE_MIN_CARDS,
      };
    },
  };
}

/**
 * (c) True-count conversion: given a real shoe position (running count + decks remaining),
 * the player computes TC = RC / decks remaining (research §2a).
 * Graded to the nearest whole true count — ponytail: neither research nor SPEC fixes a rounding
 * convention, and the sources call a rough estimate good enough, so nearest-integer it is.
 */
export function createTrueCountDrill({ seed = Date.now(), decks = 6 } = {}) {
  const rng = (() => {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  })();
  let shoe = createShoe({ decks, seed });
  let question = null;

  return {
    /**
     * Deal to a half-deck boundary and pose that position. Real players read decks remaining off
     * the discard tray in half decks, so the question shows 2.5 decks, never 2.38 — and because
     * the shoe is dealt to exactly that boundary, the posed number IS the shoe's truth.
     */
    deal() {
      const halves = 1 + Math.floor(rng() * (decks * 2 - 1)); // 0.5 .. (decks - 0.5) decks left
      const target = decks * 52 - halves * 26; // cards to draw to reach that boundary
      if (decks * 52 - shoe.cardsRemaining > target) shoe = createShoe({ decks, seed: seed + halves });
      while (decks * 52 - shoe.cardsRemaining < target) shoe.draw();
      question = { runningCount: shoe.runningCount, decksRemaining: shoe.decksRemaining };
      return question;
    },
    /** answer(trueCount) -> { correct, expected }: expected is the exact TC, for the feedback line. */
    answer(trueCount) {
      const expected = shoe.trueCount;
      return { correct: Math.round(expected) === trueCount, expected };
    },
  };
}
