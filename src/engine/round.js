// Single-spot round loop + bankroll (SPEC §3, §5 mode 1). Pure/framework-free; zero Svelte.
// Stateful controller over a shoe: place a flat bet, play every legal move, settle the bankroll.
// Grading oracle is NOT surfaced here (#3 scope) — decisions are captured raw for #4 to grade.
import { value, isPair } from './hand.js';
import { createShoe } from './shoe.js';
import { getCorrectAction, forGrading } from './strategy.js';
import { getDeviation } from './deviations.js';

// Else-actions when the chart move isn't legal for the current hand (grading-legality-handoff):
// a 3-card 11 can't double (D->H), a post-hit soft 18 can't double (Ds->S), a 3-card 16 can't surrender (Rh->H).
const ELSE = { D: 'H', Ds: 'S', Rh: 'H' };

// v1 fixed ruleset (SPEC §1). blackjackPays 3:2 and maxHands 4 are standard;
// ponytail: no payout/resplit rule is written in SPEC/research, these are the conventional defaults.
export const RULES = { h17: false, das: true, surrender: true, maxHands: 4, blackjackPays: 1.5 };

const isNatural = (h) => h.cards.length === 2 && !h.fromSplit && value(h.cards) === 21;

export function createTable({ shoe, bankroll = 1000, rules = {} } = {}) {
  rules = { ...RULES, ...rules };
  let round = null;

  // Credit a settled hand back to the bankroll and return its signed net vs. its wager.
  function settleHand(h, dealerVal, dealerNatural) {
    const bet = h.bet;
    let credit;
    if (h.surrendered) credit = bet / 2;
    else if (value(h.cards) > 21) credit = 0; // bust
    else if (isNatural(h)) credit = dealerNatural ? bet : bet + bet * rules.blackjackPays;
    else if (dealerNatural) credit = 0;
    else if (dealerVal > 21 || value(h.cards) > dealerVal) credit = bet * 2; // win
    else if (value(h.cards) < dealerVal) credit = 0; // loss
    else credit = bet; // push
    bankroll += credit;
    h.outcome = credit === 0 ? 'lose' : credit === bet ? 'push' : 'win';
    return credit - bet;
  }

  function finish() {
    const dealer = round.dealer;
    const live = round.hands.some((h) => !h.surrendered && value(h.cards) <= 21);
    const anyNatural = round.hands.some(isNatural);
    // Dealer reveals the hole either way; only draws when a live hand can still win.
    shoe.playDealer(dealer, { ...rules, revealOnly: !live || anyNatural });
    const dealerVal = value(dealer);
    const dealerNatural = dealer.length === 2 && dealerVal === 21;
    round.net = round.hands.reduce((n, h) => n + settleHand(h, dealerVal, dealerNatural), 0);
    round.phase = 'done';
  }

  // Advance to the next unfinished hand, or run the dealer if the player is done.
  function advance() {
    let i = round.active;
    while (i < round.hands.length && round.hands[i].done) i++;
    round.active = i;
    if (i >= round.hands.length) finish();
  }

  const activeHand = () => round.hands[round.active];

  // Record + grade the decision BEFORE mutating (snapshot the hand — the live array keeps growing).
  // Grading reconciles against table.legalMoves() (round-state aware: split/bankroll gates the
  // snapshot alone can't see); an illegal chart move falls to its else-action. correctAction keeps
  // the raw Ds/Rh code for #4's reason text; `correct` compares the collapsed button to the player.
  function record(chosen) {
    const h = activeHand();
    const trueCount = shoe.trueCount;
    // The integration table (#9) expects index plays; Mode 1 grades the chart alone. Either way
    // there is one answer key: the deviation when the count crosses an index, else the chart.
    const deviation = rules.deviations ? getDeviation(h.cards, round.dealer[0], trueCount, rules) : null;
    const raw = deviation ?? getCorrectAction(h.cards, round.dealer[0], rules);
    // ponytail: P-illegal (resplit cap / broke) has no chart else-action — leave it P; never arises in play.
    const correctAction = table.legalMoves().includes(forGrading(raw)) ? raw : ELSE[raw] ?? raw;
    round.decisions.push({
      hand: [...h.cards],
      upcard: round.dealer[0],
      chosen,
      correctAction,
      correct: chosen === forGrading(correctAction),
      wasDeviation: deviation !== null,
      trueCount,
    });
  }

  const table = {
    rules,
    get bankroll() {
      return bankroll;
    },
    get shoe() {
      return shoe; // reassigned on reshuffle, so expose via getter (for #8/#9 count display)
    },
    get round() {
      return round;
    },
    // Legal moves for the active hand, gated by split context and bankroll (SPEC §3, hand.js note).
    legalMoves() {
      if (!round || round.phase !== 'player') return [];
      const h = activeHand();
      const moves = ['H', 'S'];
      if (h.cards.length === 2) {
        if (bankroll >= h.bet) {
          if (!h.fromSplit || rules.das) moves.push('D');
          if (isPair(h.cards) && round.hands.length < rules.maxHands) moves.push('P');
        }
        if (rules.surrender && !h.fromSplit && round.hands.length === 1) moves.push('R');
      }
      return moves;
    },
    deal(bet) {
      if (round && round.phase !== 'done') throw new Error('round in progress');
      if (bet > bankroll) throw new Error('bet exceeds bankroll');
      // ponytail: reshuffle into a fresh default 6-deck shoe (seed+1) so long sessions
      // don't exhaust it; rigged test shoes never hit the cut so this stays dormant there.
      if (shoe.needsShuffle) shoe = createShoe({ seed: shoe.seed + 1 });
      bankroll -= bet;
      const { player, dealer } = shoe.deal();
      round = {
        bet,
        dealer,
        hands: [{ cards: player, bet, fromSplit: false, done: false, surrendered: false }],
        active: 0,
        decisions: [],
        phase: 'player',
        net: 0,
      };
      // Naturals resolve before any decision (either side's 21 ends the round immediately).
      if (isNatural(round.hands[0]) || (value(dealer) === 21)) {
        round.hands[0].done = true;
        finish();
      }
      return round;
    },
    hit() {
      record('H');
      const h = activeHand();
      h.cards.push(shoe.draw());
      if (value(h.cards) >= 21) h.done = true; // 21 auto-stands, bust ends the hand
      advance();
      return round;
    },
    stand() {
      record('S');
      activeHand().done = true;
      advance();
      return round;
    },
    double() {
      record('D');
      const h = activeHand();
      bankroll -= h.bet;
      h.bet *= 2;
      h.cards.push(shoe.draw());
      h.done = true;
      advance();
      return round;
    },
    surrender() {
      record('R');
      const h = activeHand();
      h.surrendered = true;
      h.done = true;
      advance();
      return round;
    },
    split() {
      record('P');
      const h = activeHand();
      const moved = h.cards.pop();
      bankroll -= round.bet;
      h.fromSplit = true; // both halves are split hands — a resulting 21 is not a natural
      const splitAces = moved.value === 11;
      const next = { cards: [moved], bet: round.bet, fromSplit: true, done: false, surrendered: false };
      h.cards.push(shoe.draw());
      next.cards.push(shoe.draw());
      if (splitAces) h.done = next.done = true; // one card on each split ace, no further play
      round.hands.splice(round.active + 1, 0, next);
      advance();
      return round;
    },
  };
  return table;
}
