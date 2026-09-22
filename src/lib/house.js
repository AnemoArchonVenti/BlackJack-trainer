// What this trainer deals, and what it teaches — in the words the site shows the player.
//
// The numbers are not written here. They are imported from the code that actually settles the
// hands (`engine/round.js`), builds the shoe (`engine/shoe.js`) and holds the charts and indices,
// so the site can never advertise a rule the table does not deal. Any sentence that names a
// number spells it from these imports; `house.test.js` guards the handful of booleans the prose
// assumes. Change a rule in the engine and this copy follows it.
//
// Pure data and strings. Framework-free — the dashboard and the shell both read it.
import { RULES } from '../engine/round.js';
import { DECKS, PENETRATION } from '../engine/shoe.js';
import { DEVIATIONS } from '../engine/deviations.js';
import { UPCARDS } from '../engine/strategy.js';
import { HARD, SOFT, PAIR } from '../engine/charts.js';

const pays = RULES.blackjackPays === 1.5 ? '3:2' : `${RULES.blackjackPays}:1`;
const cutPct = Math.round((PENETRATION / DECKS) * 100);
/** Insurance is a bet rather than a hand play, so it lives outside the DEVIATIONS table. */
export const INDEX_PLAYS = DEVIATIONS.length + 1;
/** Every square of the strategy chart: hard totals + soft totals + pairs, against every upcard. */
export const CHART_CELLS =
  (Object.keys(HARD).length + Object.keys(SOFT).length + Object.keys(PAIR).length) * UPCARDS.length;

/**
 * The house rules, exactly as the engine plays them. `term` is the rule; `detail` says what it
 * means at the table, because "S17" tells a beginner nothing on its own.
 */
export function houseRules({ decks = DECKS, penetrationDecks = PENETRATION } = {}) {
  const pct = Math.round((penetrationDecks / decks) * 100);
  return [
  {
    term: `${decks} decks`,
    detail: `Dealt from a shoe and cut ${pct}% in — ${penetrationDecks} of the ${decks} decks are played before the shuffle.`,
  },
  {
    term: 'Dealer stands on soft 17',
    detail: 'S17. With an ace counted as 11 the dealer never draws to 17, which is the single rule this whole trainer is built around.',
  },
  {
    term: `Blackjack pays ${pays}`,
    detail: 'A two-card 21, when the dealer does not have one too.',
  },
  {
    term: 'Dealer peeks for blackjack',
    detail: 'A dealer natural ends the round before you act, so you never double or split into one.',
  },
  {
    term: 'Double on any first two cards',
    detail: 'No restriction by total.',
  },
  {
    term: 'Double after split',
    detail: 'DAS. It changes several pair decisions, so the chart you are graded against assumes it.',
  },
  {
    term: `Split to ${RULES.maxHands} hands`,
    detail: 'Split aces take one card each and are then finished.',
  },
  {
    term: 'Late surrender',
    detail: 'Offered on your first two cards, after the dealer has checked for blackjack — half your bet back.',
  },
  ];
}

/** The default game, for the static reference pages and anything with no settings to hand. */
export const HOUSE_RULES = houseRules();

/** The three methods, in the order the guided path teaches them. */
export const METHODS = [
  {
    name: 'Basic strategy',
    what: `The complete ${DECKS}-deck S17 chart — hard totals, soft totals and pairs, ${CHART_CELLS} cells in all.`,
    how: 'You play full rounds, then every decision in the round is graded against the chart and explained.',
  },
  {
    name: 'Hi-Lo card counting',
    what: '2 through 6 count +1, 7 through 9 count 0, tens and aces count −1.',
    how: 'Drilled as tag speed, then a full deck countdown, then the true count — the running count divided by the decks still to come.',
  },
  {
    name: 'The Illustrious 18 and the Fab 4',
    what: `${INDEX_PLAYS} index plays with Hi-Lo true-count thresholds, insurance included.`,
    how: 'Learned as spaced-repetition flashcards, then played live at the integration table.',
  },
];

/** What is adjustable and what is not, and why — worth saying, not just asserting. */
export const WHY_FIXED =
  'The rules are fixed because a chart for one game is wrong for another: index numbers in particular move when the dealer hits soft 17, so that rule, double after split and late surrender are not switches. The size of the shoe is a different matter — this chart is sourced for four through eight decks, so you can set the deck count and the cut anywhere in that range and every hand is still graded correctly.';

/**
 * The one-line version, for the footer on every page.
 *
 * Deck count is a setting now (4–8, the range the chart is sourced for), so the footer has to be
 * able to say what is actually being dealt — a line that always claims six decks while the shoe
 * holds eight is exactly the drift this module exists to prevent.
 */
export const ruleLineFor = (decks = DECKS) =>
  `${decks} decks · dealer stands on soft 17 · double after split · late surrender · blackjack pays ${pays}`;

/** The default game's line, for the static pages. */
export const RULE_LINE = ruleLineFor();

/** The methods in one line, same place. */
export const METHOD_LINE = 'Basic strategy · Hi-Lo counting · Illustrious 18 + Fab 4';
