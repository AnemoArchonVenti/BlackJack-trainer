// Heuristic "why" for the correct play (SPEC §4.4 / research §4.4). Authored intuition, NOT EV:
// each line names the mental model a player should carry, not an expected-value number.
// explain(hand, upcard, action) takes the *reconciled* correctAction (raw Ds/Rh kept when legal)
// and returns one sentence. ~18 templates keyed by situation family. Pure, framework-free.
import { value, isSoft, isPair } from './hand.js';

export function explain(hand, upcard, action) {
  const total = value(hand);

  if (isPair(hand)) {
    const v = hand[0].value;
    if (v === 11) return 'Always split aces: one card on each turns a weak soft start into two live hands.';
    if (v === 8) return 'Always split eights: sixteen is the worst hand in the game, so trade it for two fresh starts.';
    if (v === 10) return 'Never break up twenty — it already beats almost every hand the dealer can make.';
    if (v === 5) return 'Play two fives as a hard ten, never a pair: one strong hand beats two weak ones.';
    if (action === 'P') return 'Split against a weak dealer card (2–6): the dealer is likely to break, so get more money out.';
    return "Don't split into the dealer's strong card — kept together, the pair has a better shot than two weak hands.";
  }

  if (isSoft(hand)) {
    if (action === 'D' || action === 'Ds')
      return "Double a soft hand against a weak dealer: you can't bust, so press the bet while the ace keeps you safe.";
    if (action === 'S')
      return total >= 19
        ? 'Stand on a strong soft total — nineteen or twenty is already a winning hand.'
        : "Soft eighteen is good enough here: stand rather than gamble a made hand into a worse one.";
    return 'Hit your soft hand: a low total carrying an ace can only improve and never busts.';
  }

  // hard totals
  if (action === 'Rh')
    return 'Surrender the worst spots against a high card — sixteen versus a ten is a loser, so save half the bet.';
  if (action === 'D' || action === 'Ds') {
    if (total === 11) return 'Eleven is the premier doubling hand: so many cards make a strong total that you press the bet.';
    if (total === 10) return "Ten doubles when you out-rank the dealer's card — you're the favorite to draw the bigger hand.";
    if (total === 9) return 'Nine doubles against a dealer bust card (3–6): press your edge while the dealer is weak.';
    return 'Double into a weak dealer: one good card wins far more often than it costs you.';
  }
  if (action === 'S') {
    if (total >= 17) return 'Seventeen or more — stand and make the dealer try to beat a pat hand.';
    return 'Stand on a stiff total against a dealer bust card (2–6): let the dealer be the one forced to hit and break.';
  }
  // action === 'H'
  if (total >= 12)
    return 'Hit a stiff total against a strong dealer card (7–A): standing on sixteen just hands the dealer the pot.';
  return 'Too low to bust — take a card and build toward a pat total.';
}
