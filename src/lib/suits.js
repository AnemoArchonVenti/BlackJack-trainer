// Suits are cosmetic. The engine deals cards as { rank, value } with no suit at all, because no
// chart, count or grade in blackjack depends on one — so the UI picks a suit purely so the table
// looks like a table.
//
// The suit belongs to the CARD, not to the view that happens to be drawing it. Two earlier
// approaches both failed on that:
//
//   · `Math.random()` in the template has no reactive dependency, so Svelte hoists it and
//     evaluates it once — every card in a drill session comes out the same suit.
//   · Deriving it from a counter the view tracks (cards asked, cards left) re-derives whenever
//     that counter moves, so answering a question visibly flipped the suit of the card still on
//     screen before the next one arrived.
//
// Assigning once per card object and remembering it fixes both. A WeakMap means the entry dies
// with the card, so a six-deck shoe dealt all night leaks nothing.

export const SUITS = ['♠', '♥', '♦', '♣'];

/** The suit each card object has been dealt, for as long as that card object exists. */
const dealtSuit = new WeakMap();
let dealt = 0;

/**
 * suitFor(card) -> the suit this card is wearing. Stable for the life of the card object, so a
 * hand keeps its suits as it is hit, split and re-rendered.
 *
 * Stepping by 3 walks all four suits rather than repeating one, and folding in the rank stops
 * consecutive cards marching ♠ ♥ ♦ ♣ in visible lockstep.
 */
export function suitFor(card) {
  if (!card || typeof card !== 'object') return SUITS[0];
  let suit = dealtSuit.get(card);
  if (suit === undefined) {
    suit = SUITS[(((dealt++ * 3 + String(card.rank).charCodeAt(0)) % 4) + 4) % 4];
    dealtSuit.set(card, suit);
  }
  return suit;
}
