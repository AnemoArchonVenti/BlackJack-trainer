// Counting drills (SPEC §5 mode 2, research §2d). Isolated counting practice that builds speed
// before counting has to happen at the table. Pure/framework-free; zero Svelte.
//
// Every drill grades against the shoe's ground truth (shoe.js) rather than re-implementing
// Hi-Lo, so there is exactly one counting oracle in the codebase.
import { createShoe, hiLoTag } from './shoe.js';

// Benchmarks from research §2d (Blackjack Apprenticeship). The BJA page still 403s to automated
// fetches (SPEC §9 item 2); re-verified 2026-09-17 against corroborating practice literature.
export const COUNTDOWN_TARGET_MS = 30_000; // pass mark
export const COUNTDOWN_STRETCH_MS = 25_000; // stretch goal
export const CLEAN_RUNS_TO_PASS = 5; // clean runs in a row before advancing

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
 * (b) Deck countdown: stream a full deck one card at a time and end on the correct running count.
 * A balanced deck returns to 0, which is the drill's free self-check (research §2a).
 * The caller owns the clock; `finish` takes the elapsed time so the drill stays pure.
 */
export function createCountdownDrill({ seed = Date.now(), decks = 1 } = {}) {
  const shoe = createShoe({ decks, seed });
  return {
    get remaining() {
      return shoe.cardsRemaining;
    },
    /** The count so far — ground truth, not shown to the player mid-drill. */
    get truth() {
      return shoe.runningCount;
    },
    /** next() -> the next card, or null once the deck is spent. */
    next() {
      return shoe.cardsRemaining ? shoe.draw() : null;
    },
    /** finish(called, elapsedMs) -> the graded run. "Clean" = right count AND inside the target. */
    finish(called, elapsedMs) {
      const expected = shoe.runningCount;
      const correct = called === expected;
      return {
        correct,
        expected,
        elapsedMs,
        clean: correct && elapsedMs <= COUNTDOWN_TARGET_MS,
        stretch: elapsedMs <= COUNTDOWN_STRETCH_MS,
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
