// Hand helpers. Pure, framework-free (SPEC §3 rule). Card = { rank: 2..10|'A', value: 2..11 }.

/** Best blackjack total: aces count 11 unless that busts, then 1. */
export function value(hand) {
  let total = hand.reduce((s, c) => s + c.value, 0);
  let aces = hand.filter((c) => c.value === 11).length;
  while (total > 21 && aces > 0) {
    total -= 10; // demote one ace 11 -> 1
    aces -= 1;
  }
  return total;
}

/** Soft iff an ace is still counted as 11 in the best total. */
export function isSoft(hand) {
  let total = hand.reduce((s, c) => s + c.value, 0);
  let aces = hand.filter((c) => c.value === 11).length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return aces > 0;
}

/** A fresh two-card hand of equal value (splittable). */
export function isPair(hand) {
  return hand.length === 2 && hand[0].value === hand[1].value;
}

/** Legal moves for grading/gating. Double/split/surrender only on a fresh 2-card hand.
 *  ponytail: split-hand / double-after-split context (re-split caps, one-card-on-split-ace)
 *  arrives with the round loop (#3); this is the pre-decision gate only. */
export function legalMoves(hand, rules = {}) {
  const moves = ['H', 'S'];
  if (hand.length === 2) {
    moves.push('D');
    if (isPair(hand)) moves.push('P');
    if (rules.surrender) moves.push('R');
  }
  return moves;
}

/**
 * The ten-value ranks, in the order a deck lays them out. Defined here, with the card primitives,
 * because shoe.js already imports from this module — putting it the other way round would make
 * the two files import each other.
 */
export const TEN_RANKS = [10, 'J', 'Q', 'K'];

/**
 * A card from its rank. `rank` is what the player is shown; `value` is all the engine ever reads,
 * so a king and a ten are the same card to every chart, count and grade in this codebase.
 */
export const card = (rank) => ({ rank, value: rank === 'A' ? 11 : TEN_RANKS.includes(rank) ? 10 : rank });

/**
 * Which ten-value rank to show for a given cell. Deterministic on purpose: the flashcards and the
 * click-to-drill heatmap pose the same cell over and over, and a card that changes its face every
 * time reads as a different question. Same cell, same picture — a different one per cell.
 */
const tenFor = (seed) => TEN_RANKS[(((seed % 4) + 4) % 4)];

/**
 * handFor(cell) -> { hand, upcard }: a representative two-card hand for a chart cell, the
 * inverse of strategy.js `cellFor`. Drives the heatmap's click-to-drill (#5 F7) and the
 * deviation flashcards (#7), which pose a cell as a dealt situation.
 * Hard rows must avoid aces and pairs, or the hand would key a soft/pair cell instead.
 */
export function handFor({ type, key, up }) {
  // A ten-valued upcard gets a face, so a drilled cell looks like a hand off a real shoe rather
  // than a row of the chart. The value is 10 either way, so nothing downstream can tell.
  const upcard = card(up === 11 ? 'A' : up === 10 ? tenFor(key + up) : up);
  const ten = (offset) => tenFor(key + up + offset);
  if (type === 'pair') {
    // Two ten-value cards are a splittable pair even when they are a jack and a queen — isPair
    // compares value — so the pair row is dealt as two different faces, as a table would.
    const face = (offset) => card(key === 11 ? 'A' : key === 10 ? ten(offset) : key);
    return { hand: [face(1), face(2)], upcard };
  }
  if (type === 'soft') return { hand: [card('A'), card(key)], upcard };
  // hard: 8..11 pair with a 2, 12..17 with a 10 — neither partner ever matches the other card.
  const partner = key >= 12 ? 10 : 2;
  const partnerCard = partner === 10 ? card(ten(1)) : card(partner);
  return { hand: [card(key - partner), partnerCard], upcard };
}
