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
