// Seedable 6-deck shoe (SPEC §4.3). Pure/deterministic given a seed; zero Svelte.
// Ground-truth backbone every play/counting mode grades against.
import { value, isSoft, card, TEN_RANKS } from './hand.js';

/** Hi-Lo tag (research §2a): 2–6 = +1, 7–9 = 0, 10/A = −1. Keyed by card VALUE, never by rank,
 *  which is what makes a jack, queen, king and ten one card as far as the count is concerned. */
export function hiLoTag(card) {
  const v = card.value; // 2..10 for numbers and the four ten-value ranks, 11 for ace
  return v <= 6 ? 1 : v <= 9 ? 0 : -1;
}

// Small seeded PRNG — deterministic, no dependency. ponytail: mulberry32 is fine for a card game.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One deck: 2..9, the four ten-value ranks (10/J/Q/K), one ace — ×4 suits.
// The faces are dealt as themselves rather than as four more tens. Nothing in the engine can
// tell the difference, but the player can: recognising a king as a −1 on sight is part of the
// skill the counting drills exist to build, and a table that only ever shows 10s never asks.
// ponytail: no `suit` field; the UI assigns one, since strategy never depends on it.
function oneDeck() {
  const ranks = [2, 3, 4, 5, 6, 7, 8, 9, ...TEN_RANKS, 'A'];
  const deck = [];
  for (let s = 0; s < 4; s++) for (const r of ranks) deck.push(card(r));
  return deck;
}

/**
 * createShoe({ decks, penetration, seed, cards }) -> shoe.
 * `cards` rigs the deck (skips shuffle) for deterministic tests; otherwise seeded Fisher-Yates.
 * penetration is in decks: the cut card sits at penetration*52 cards dealt.
 */
/** The shoe the trainer deals from (SPEC §1): six decks, cut three-quarters in. */
export const DECKS = 6;
export const PENETRATION = 4.5; // decks dealt before the cut card

export function createShoe({ decks = DECKS, penetration = PENETRATION, seed = Date.now(), cards } = {}) {
  let deck;
  if (cards) {
    deck = cards.map((r) => (typeof r === 'object' ? r : card(r)));
  } else {
    deck = [];
    for (let d = 0; d < decks; d++) deck.push(...oneDeck());
    const rng = mulberry32(seed);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  let pos = 0;
  let running = 0;
  const cut = penetration * 52;

  const take = () => {
    if (pos >= deck.length) throw new Error('shoe exhausted');
    return deck[pos++];
  };
  const draw = () => {
    const c = take();
    running += hiLoTag(c);
    return c;
  };

  const shoe = {
    seed,
    draw,
    get cardsRemaining() {
      return deck.length - pos;
    },
    get decksRemaining() {
      return (deck.length - pos) / 52;
    },
    get runningCount() {
      return running;
    },
    get trueCount() {
      return running / shoe.decksRemaining;
    },
    get needsShuffle() {
      return pos >= cut;
    },
    // Initial deal: player and dealer upcard are exposed (counted); dealer hole is NOT
    // counted until playDealer reveals it. Order: player, up, player, hole.
    deal() {
      const player = [draw()];
      const dealerUp = draw();
      player.push(draw());
      const hole = take(); // face down — no tag yet
      return { player, dealer: [dealerUp, hole] };
    },
    // Reveal the hole (count it), then hit to S17 (or H17 if rules.h17).
    // rules.revealOnly: count the hole but don't draw — used when no live player
    // hand remains (all bust/surrender, or a natural), so RC/TC stay correct.
    playDealer(hand, rules = {}) {
      running += hiLoTag(hand[1]); // hole card now exposed
      if (rules.revealOnly) return hand;
      while (value(hand) < 17 || (value(hand) === 17 && isSoft(hand) && rules.h17)) {
        hand.push(draw());
      }
      return hand;
    },
  };
  return shoe;
}
