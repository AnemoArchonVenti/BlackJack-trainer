// The written pages, generated from the engine.
//
// These are the pages a search engine can actually rank: prose, tables and answers, served as
// static HTML that needs no JavaScript. The trainer itself is an app — it earns links but it has
// almost no text to index.
//
// The rule that makes this worth doing rather than dangerous: NOTHING numeric is typed here.
// Every chart cell, tag, index and ramp rung is imported from the same modules the trainer grades
// against, so the chart a reader finds in a search result is the chart the app marks them with —
// by construction. A cell that changes in engine/charts.js changes on this page in the same build.
//
// Sourcing for the prose figures is research/blackjack-trainer-research.md; a claim that is not
// in there is not made here.

import { HARD, SOFT, PAIR } from '../../src/engine/charts.js';
import { UPCARDS } from '../../src/engine/strategy.js';
import { DEVIATIONS, INSURANCE_INDEX } from '../../src/engine/deviations.js';
import { DECKS, PENETRATION } from '../../src/engine/shoe.js';
import { RAMP, MAX_SPREAD } from '../../src/engine/betting.js';
import { HOUSE_RULES, METHODS, WHY_FIXED, INDEX_PLAYS, CHART_CELLS } from '../../src/lib/house.js';
import { esc, table, breadcrumb, faqPage, graph, webSiteNode } from './html.js';
import { urlFor, SITE } from '../../src/site.js';

const CUT_PCT = Math.round((PENETRATION / DECKS) * 100);

/** Dealer upcards as a person reads them: 11 is an ace. */
const upLabel = (u) => (u === 11 ? 'A' : String(u));

/** What each chart code means, spelled out. The table prints the code; the legend prints this. */
const ACTIONS = {
  H: { short: 'H', long: 'Hit' },
  S: { short: 'S', long: 'Stand' },
  D: { short: 'D', long: 'Double, or hit if doubling is not allowed' },
  Ds: { short: 'Ds', long: 'Double, or stand if doubling is not allowed' },
  P: { short: 'P', long: 'Split' },
  Rh: { short: 'Rh', long: 'Surrender, or hit if surrender is not allowed' },
  R: { short: 'R', long: 'Surrender' },
};

const cell = (code) =>
  '<span class="a a-' + esc(code) + '" title="' + esc(ACTIONS[code]?.long ?? code) + '">' + esc(code) + '</span>';

/** Row labels. Hard 17 stands for "17 or more" — the chart clamps above it. */
const hardLabel = (total) => (Number(total) === 17 ? '17+' : String(total));
const softLabel = (kicker) => 'A,' + kicker + ' <span class="dim">(' + (Number(kicker) + 11) + ')</span>';
const pairLabel = (v) => (Number(v) === 11 ? 'A,A' : v + ',' + v);

const chartTable = (title, data, label) =>
  table({
    caption: title,
    className: 'chart',
    head: UPCARDS.map(upLabel),
    rows: Object.keys(data).map((key) => [label(key), ...data[key].map(cell)]),
  });

const legend = () =>
  '    <ul class="legend">\n' +
  ['H', 'S', 'D', 'Ds', 'P', 'Rh']
    .map((c) => '      <li><span class="a a-' + c + '">' + c + '</span> ' + esc(ACTIONS[c].long) + '</li>')
    .join('\n') +
  '\n    </ul>';

/** The one-line statement of the game, used at the top of every reference page. */
const rulesNote = () =>
  '<p class="note"><strong>These numbers are for one specific game:</strong> ' +
  'dealer stands on soft 17, double after split, late surrender, blackjack pays 3:2, dealt from ' +
  'four to eight decks (' +
  DECKS +
  ' by default). A strategy chart is only correct for the ruleset it was computed for — ' +
  '<a href="/blackjack-rules">what changes when the rules change</a>.</p>';

/** Every page ends by pointing at the drill that practises it. That is the site working. */
const cta = (href, label, line) =>
  '    <p class="cta"><a class="button" href="' + href + '">' + esc(label) + '</a> <span>' + line + '</span></p>';

// ─────────────────────────────────────────────────────────────────────────────────────────────
// /basic-strategy-chart
// ─────────────────────────────────────────────────────────────────────────────────────────────
function basicStrategyChart(page) {
  const body = [
    '    <h1>' + esc(page.heading) + '</h1>',
    '    <p class="lede">Basic strategy is the one correct play for every hand you can be dealt, worked out from the ' +
      'maths of the game rather than from how the hand feels. There are ' +
      CHART_CELLS +
      ' of them. This is the whole chart, and underneath it, the handful of rows that people actually get wrong.</p>',
    '    ' + rulesNote(),

    '    <h2 id="hard">Hard totals</h2>',
    '    <p>A hard hand has no ace, or has an ace that must count as 1 because counting it as 11 would bust you. ' +
      'Read down the left for your total, across the top for the dealer&rsquo;s upcard.</p>',
    chartTable('Basic strategy: hard totals', HARD, hardLabel),
    legend(),
    '    <p>Below 8 you always hit — there is no card that can bust you, so there is nothing to decide. ' +
      'At 17 and above you always stand; the chart stops there because every total above it plays the same.</p>',

    '    <h2 id="soft">Soft totals</h2>',
    '    <p>A soft hand holds an ace counting as 11, so it cannot bust on one card. That free hit is why so much of ' +
      'this table says double: you are getting a shot at a big total with no risk of losing the hand outright.</p>',
    chartTable('Basic strategy: soft totals', SOFT, softLabel),
    '    <p>Soft 18 (A,7) is the row that costs people money. Against a dealer 9, 10 or ace, 18 is not a good hand — ' +
      'you hit it. Against 2 through 6 you double if you can and stand if you cannot, which is what <code>Ds</code> means.</p>',

    '    <h2 id="pairs">Pairs</h2>',
    '    <p>Pairs are decided before totals: if the chart below says split, you split, whatever the hard-total table ' +
      'would have said about the same number.</p>',
    chartTable('Basic strategy: pairs', PAIR, pairLabel),
    '    <p>Two rules here never bend. <strong>Always split aces and eights.</strong> Two aces is a soft 12, which is a ' +
      'bad hand; split, and each ace starts a hand that draws to 21 on any ten. Sixteen is the worst total in ' +
      'blackjack, so 8,8 is worth breaking into two hands even against a ten. <strong>Never split tens or fives.</strong> ' +
      'Twenty is already close to the best hand at the table, and a pair of fives is a hard 10 — a doubling hand, ' +
      'not a splitting one.</p>',

    '    <h2 id="reading">How to read a cell</h2>',
    '    <p>Find your hand on the left, the dealer&rsquo;s upcard along the top, and play the letter where they meet. ' +
      'The two-letter codes carry a fallback for when the table will not let you make the first choice: ' +
      '<code>D</code> is double-or-hit, <code>Ds</code> is double-or-stand, <code>Rh</code> is surrender-or-hit. ' +
      'On a hand you have already hit, doubling is off the table, so <code>D</code> becomes a hit.</p>',
    '    <p>The chart is not a set of tendencies. Each cell is the play with the highest expected value for that exact ' +
      'situation, and the second-best play in a close cell is worth measurably less. There is no cell where your ' +
      'read of the dealer is worth more than the number.</p>',

    '    <h2 id="memorise">The order to learn it in</h2>',
    '    <ol>',
    '      <li><strong>The pairs that never change</strong> — always split aces and eights, never split tens or fives. ' +
      'Four hands, no exceptions, learned in a minute.</li>',
    '      <li><strong>The stiff hands, 12 through 16.</strong> These are most of your losses and nearly all of your ' +
      'hard decisions. The shape is simple: stand against a dealer 2 through 6, hit against 7 through ace. ' +
      'The exception is 12 against 2 and 3, which hits.</li>',
    '      <li><strong>The doubles.</strong> Hard 9, 10 and 11, then the soft doubles, which are the ones people skip ' +
      'and then misplay for years.</li>',
    '      <li><strong>The rest of the pairs</strong>, which depend on double-after-split being allowed.</li>',
    '      <li><strong>Surrender</strong>, last, because it is the rarest and the cheapest to get wrong.</li>',
    '    </ol>',
    cta(
      '/play',
      'Drill it on real hands',
      'The trainer deals full rounds and grades every decision against this exact chart, then shows you the cell you missed.',
    ),
    '    <p>Once the chart is automatic, the next skill is knowing when to leave it: ' +
      '<a href="/card-counting">Hi-Lo counting</a> tells you how the shoe is running, and ' +
      '<a href="/illustrious-18">the Illustrious 18</a> are the hands where a high enough count overrides the chart above.</p>',
  ].join('\n');

  const faqs = [
    {
      q: 'Does basic strategy change if the dealer hits soft 17?',
      a:
        'Yes, in a small number of cells, and it raises the house edge by roughly 0.20 to 0.22%. Under H17 you double hard 11 against an ace, double A,7 against 2 and A,8 against 6, and surrender 15 and 17 against an ace and 8,8 against an ace. This chart is the S17 version.',
    },
    {
      q: 'Is it ever right to deviate from basic strategy on a hunch?',
      a:
        'No. Every cell is the highest expected-value play for that hand against that upcard, computed over every possible outcome. The only information that justifies a different play is the composition of the remaining shoe, which is what card counting measures.',
    },
    {
      q: 'What does Ds mean on a blackjack strategy chart?',
      a:
        'Double if you are allowed to, otherwise stand. It appears on soft 18 against dealer 2 through 6. Because you have already hit the hand, or because the table forbids the double, you fall back to standing rather than hitting.',
    },
    {
      q: 'Why does the hard-totals chart stop at 17?',
      a:
        'Because every hard total of 17 or more plays identically: you stand against every dealer upcard. The row labelled 17+ covers 17 through 21.',
    },
  ];

  return {
    body,
    jsonLd: graph(
      webSiteNode,
      {
        '@type': 'Article',
        '@id': urlFor(page.path) + '#article',
        headline: page.heading,
        description: page.description,
        inLanguage: SITE.lang,
        isPartOf: { '@id': urlFor('/') + '#website' },
        about: { '@type': 'Thing', name: 'Blackjack basic strategy' },
      },
      breadcrumb([{ name: 'Twenty-One', path: '/' }, { name: 'Basic strategy chart', path: page.path }]),
      faqPage(faqs),
    ),
    faqs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// /card-counting
// ─────────────────────────────────────────────────────────────────────────────────────────────
function cardCounting(page) {
  const tagRows = [
    [
      '<strong>+1</strong>',
      '2, 3, 4, 5, 6',
      'The small cards. Every one of them dealt out is one fewer card that can bust the dealer later.',
    ],
    ['<strong>0</strong>', '7, 8, 9', 'Neutral. They are counted as zero, which in practice means you skip them.'],
    [
      '<strong>&minus;1</strong>',
      '10, J, Q, K, A',
      'The cards you want left in the shoe: they make blackjacks and they bust stiff dealer hands.',
    ],
  ];

  const rampRows = RAMP.map((rung, i) => {
    const next = RAMP[i + 1];
    const from = rung.from === -Infinity ? 'below +' + RAMP[1].from : '+' + rung.from;
    const range = next ? from + ' to +' + (next.from - 1) : from + ' and above';
    return ['<strong>' + range + '</strong>', rung.units + (rung.units === 1 ? ' unit' : ' units')];
  });

  const body = [
    '    <h1>' + esc(page.heading) + '</h1>',
    '    <p class="lede">Counting cards is not memorising which cards have gone. It is keeping one small number in ' +
      'your head that says whether what is left in the shoe favours you or the house — and then betting and playing ' +
      'differently when it does.</p>',
    '    <p>A shoe rich in tens and aces is good for the player: you get more blackjacks, which pay 3:2, and the ' +
      'dealer busts more often on the stiff hands they are forced to draw to. A shoe rich in small cards is good for ' +
      'the house. Hi-Lo measures which of those two you are sitting in, using a single running total.</p>',

    '    <h2 id="tags">Step one: the card tags</h2>',
    '    <p>Every card gets one of three values. This is the whole system.</p>',
    table({
      caption: 'Hi-Lo card tags',
      className: 'tags',
      head: ['Cards', 'Why'],
      rows: tagRows,
    }),
    '    <p>Hi-Lo is <em>balanced</em>: there are as many +1 cards in a deck as &minus;1 cards, so counting an entire ' +
      'deck down lands you back on exactly zero. That is not trivia — it is the self-check. If you count a full deck ' +
      'and do not finish on zero, you made a mistake, and you know it without anyone telling you.</p>',
    cta('/counting', 'Drill the tags and the countdown', 'Tag speed first, then a full 52-card deck against the clock.'),

    '    <h2 id="running">Step two: the running count</h2>',
    '    <p>Start at zero when the shoe is shuffled. Add each card&rsquo;s tag as it appears — every card, including ' +
      'the other players&rsquo; and the dealer&rsquo;s. That total is the <strong>running count</strong>.</p>',
    '    <p>The skill worth building early is <em>cancelling</em>. A ten and a five on the table are +1 and &minus;1, ' +
      'so they are nothing; see them as a pair and move on rather than adding them one at a time. Counters read a ' +
      'table in cancelled pairs, which is how they keep up with a fast dealer.</p>',

    '    <h2 id="true">Step three: the true count</h2>',
    '    <p>A running count of +8 means something completely different with one deck left than with five. Divide it ' +
      'out:</p>',
    '    <p class="formula">true count = running count &divide; decks remaining</p>',
    '    <p>Decks remaining is estimated by eye, from the discard tray. A rough estimate genuinely is enough — half a ' +
      'deck of error is tolerable, and nobody is counting cards to three decimal places. In a ' +
      DECKS +
      '-deck shoe cut at ' +
      PENETRATION +
      ' decks, you are dividing by something between ' +
      DECKS +
      ' and about ' +
      (DECKS - PENETRATION) +
      '.</p>',
    '    <p><strong>Every decision uses the true count, never the running count.</strong> That applies to how you bet ' +
      'and to every index play.</p>',

    '    <h2 id="betting">Step four: betting the count</h2>',
    '    <p>The count is only worth money if your bet is bigger when the count is good. Each +1 of true count is worth ' +
      'roughly half a percent to the player, so the bet should climb with it. The ramp the trainer grades against ' +
      'spreads from one unit to ' +
      MAX_SPREAD +
      ':</p>',
    table({ caption: 'Bet ramp by true count', className: 'ramp', head: ['Bet'], rows: rampRows }),
    '    <p>The published benchmark for this shape of game — ' +
      DECKS +
      ' decks, cut ' +
      CUT_PCT +
      '% in, a 1&ndash;' +
      MAX_SPREAD +
      ' spread — is about a <strong>1.15% player advantage</strong>. That is the whole prize: a hair over one percent, ' +
      'earned by playing perfectly for hours. Counting is not a fast way to make money, and a 1&ndash;' +
      MAX_SPREAD +
      ' spread is conspicuous. The individual rungs above are a convention rather than a sourced optimum, which is ' +
      'why the trainer shows you the ramp instead of hiding it.</p>',

    '    <h2 id="deviations">Step five: playing the count</h2>',
    '    <p>Betting captures most of the edge, but not all of it. When the count is high enough, a handful of hands ' +
      'should be played differently from the chart — standing on 16 against a ten, taking insurance, doubling tens. ' +
      'Those are <a href="/illustrious-18">the Illustrious 18 and the Fab 4</a>, and knowing roughly that set captures ' +
      '80 to 85% of everything available from deviating at all.</p>',
    cta(
      '/integration',
      'Put it together',
      'Keep the count yourself, size the bet off it and take the index plays — graded per shoe.',
    ),

    '    <h2 id="legal">Is this legal?</h2>',
    '    <p>Counting cards in your head is legal. You are doing arithmetic about public information. No jurisdiction ' +
      'treats that as cheating, and using a device to do it for you is a different matter entirely and is generally a ' +
      'crime.</p>',
    '    <p>What casinos can do is refuse your business. They are private property; they can ask you to stop playing ' +
      'blackjack, bar you from the property, flat-bet you, or shuffle early. That is the real constraint on counting, ' +
      'and it is why the spread in the table above is a trade-off rather than a maximum.</p>',
  ].join('\n');

  const faqs = [
    {
      q: 'What is the difference between the running count and the true count?',
      a:
        'The running count is the raw total of the card tags since the shuffle. The true count divides that by the number of decks still to be dealt, which is what makes the number comparable across the shoe. A running count of +8 with one deck left is a true count of +8; with four decks left it is +2. All betting and playing decisions use the true count.',
    },
    {
      q: 'Do I have to count every card at the table?',
      a:
        'Yes — every card that is exposed, including other players hands and the dealer hole card once it is turned. The count measures what is left in the shoe, so every card that leaves it matters regardless of who it went to.',
    },
    {
      q: 'How much can card counting actually win?',
      a:
        'For a 6-deck shoe cut at 4.5 decks with a 1 to 15 bet spread, the published benchmark is roughly a 1.15% advantage to the player. It is a small edge that only pays over a very large number of hands.',
    },
    {
      q: 'Is counting cards illegal?',
      a:
        'No. Keeping a count mentally is legal — it is arithmetic on information everyone at the table can see. Using a device or an app to count for you at the table is a separate matter and is generally a criminal offence. Casinos are private property and may still bar you from playing.',
    },
    {
      q: 'Why is Hi-Lo the system people learn first?',
      a:
        'It is level one, so every card is worth +1, 0 or minus 1 with no fractions, and it is balanced, so a full deck counts down to zero and you can check yourself. It has a betting correlation of .97, which captures nearly all of the available betting edge, and every published index play chart is written for it.',
    },
  ];

  return {
    body,
    jsonLd: graph(
      webSiteNode,
      {
        '@type': 'HowTo',
        '@id': urlFor(page.path) + '#howto',
        name: 'How to count cards with the Hi-Lo system',
        description: page.description,
        inLanguage: SITE.lang,
        step: [
          {
            '@type': 'HowToStep',
            name: 'Learn the card tags',
            url: urlFor(page.path) + '#tags',
            text: 'Cards 2 through 6 count plus one, 7 through 9 count zero, and tens and aces count minus one.',
          },
          {
            '@type': 'HowToStep',
            name: 'Keep a running count',
            url: urlFor(page.path) + '#running',
            text: 'Start at zero on a fresh shoe and add each exposed card tag, cancelling high and low cards against each other.',
          },
          {
            '@type': 'HowToStep',
            name: 'Convert to a true count',
            url: urlFor(page.path) + '#true',
            text: 'Divide the running count by the number of decks still to be dealt, estimated from the discard tray.',
          },
          {
            '@type': 'HowToStep',
            name: 'Size the bet',
            url: urlFor(page.path) + '#betting',
            text: 'Bet the table minimum at low counts and raise the bet as the true count climbs.',
          },
          {
            '@type': 'HowToStep',
            name: 'Take the index plays',
            url: urlFor(page.path) + '#deviations',
            text: 'At high enough true counts, deviate from basic strategy on the Illustrious 18 and Fab 4 hands.',
          },
        ],
      },
      breadcrumb([{ name: 'Twenty-One', path: '/' }, { name: 'Hi-Lo card counting', path: page.path }]),
      faqPage(faqs),
    ),
    faqs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// /illustrious-18
// ─────────────────────────────────────────────────────────────────────────────────────────────
function illustrious18(page) {
  const chartFor = (type) => (type === 'hard' ? HARD : type === 'soft' ? SOFT : PAIR);
  const basicFor = (entry) => {
    const row = chartFor(entry.type)[entry.key];
    const i = UPCARDS.indexOf(entry.up);
    return row && i >= 0 ? row[i] : null;
  };
  const word = (code) => (code ? (ACTIONS[code]?.long.split(',')[0] ?? code) : '—');
  /** A true count reads +4, 0, −2 — never "+0", which is not a number anyone writes. */
  const signed = (n) => (n > 0 ? '+' + n : n < 0 ? '&minus;' + Math.abs(n) : '0');

  const rows = [
    [
      '<strong>Insurance</strong>',
      '<span class="idx">TC &ge; ' + signed(INSURANCE_INDEX) + '</span>',
      'Take insurance',
      'Never take it',
    ],
    ...DEVIATIONS.map((d) => [
      '<strong>' + esc(d.play) + '</strong>',
      '<span class="idx">TC &ge; ' + signed(d.index) + '</span>',
      word(d.at),
      // Where the table states no "below" side, the chart is what you fall back to — and naming
      // the actual play is more use to a reader than the words "basic strategy" on their own.
      d.below ? word(d.below) : word(basicFor(d)) + ' <span class="dim">(basic strategy)</span>',
    ]),
  ];

  const body = [
    '    <h1>' + esc(page.heading) + '</h1>',
    '    <p class="lede">An index play is a hand where a high enough count makes the chart wrong. There are ' +
      INDEX_PLAYS +
      ' of them worth knowing. Between them they capture 80 to 85% of everything a counter can gain from deviating ' +
      'from basic strategy at all — which is why nobody learns the other few hundred.</p>',
    '    ' + rulesNote(),
    '    <p>The Illustrious 18 are Don Schlesinger&rsquo;s eighteen most valuable playing deviations, from ' +
      '<em>Blackjack Attack</em>. The Fab 4 are the four most valuable late-surrender indices. Insurance sits ' +
      'alongside them: it is not a hand decision at all but a side bet, and at a high enough count it is the single ' +
      'most profitable deviation there is.</p>',

    '    <h2 id="table">The index chart</h2>',
    '    <p>Every number below is a <strong>true</strong> count, not a running count. Read a row as: at or above this ' +
      'count, make the play in the third column; below it, do what the fourth column says.</p>',
    table({
      caption: 'Hi-Lo index plays: Illustrious 18, Fab 4 and insurance',
      className: 'indices',
      head: ['Index', 'At or above', 'Below'],
      rows,
    }),

    '    <h2 id="reading">Reading an index</h2>',
    '    <p>Most indices are positive: the deviation switches on when the shoe goes rich. A few are zero or negative, ' +
      'and those work the other way round — the play at or above the index <em>is</em> basic strategy, and what the ' +
      'index buys you is knowing when to abandon it in a poor shoe. Standing on 13 against a 2 is ordinary; hitting ' +
      'it at a true count of &minus;2 is the deviation.</p>',
    '    <p>Two rows cover the same hand. 15 against a ten is both an Illustrious 18 stand and a Fab 4 surrender, and ' +
      'when both apply the surrender wins, because it is the better of the two.</p>',

    '    <h2 id="insurance">Why insurance is the one that matters</h2>',
    '    <p>Insurance is a bet that the dealer&rsquo;s hole card is a ten, paying 2:1. Roughly four cards in thirteen ' +
      'are tens, so it is a losing bet in a neutral shoe and basic strategy says never take it. But it is a bet ' +
      'purely about the density of tens left — which is exactly what the count measures. At a true count of +' +
      INSURANCE_INDEX +
      ' or better, tens are dense enough that the bet turns positive.</p>',
    '    <p>This is also why &ldquo;even money&rdquo; on a blackjack is the same decision wearing a disguise: it is ' +
      'insurance on a hand you were going to win anyway. Below the index, decline it.</p>',

    '    <h2 id="order">Which to learn first</h2>',
    '    <p>Insurance, then 16 against a ten, then 15 against a ten. Those three carry a disproportionate share of the ' +
      'value: insurance because the bet is large and the edge is clean, and the two stiffs because they come up ' +
      'constantly. After that, the rest of the stands, then the doubles, then the surrenders.</p>',
    cta(
      '/deviations',
      'Drill the index plays',
      'Flashcards that hand you a count and ask for the play. Missed cards come back sooner.',
    ),

    '    <h2 id="s17">A caveat worth reading</h2>',
    '    <p>These indices are derived for a <strong>multi-deck game where the dealer stands on soft 17</strong>. Under ' +
      'H17 several of them shift, particularly the ones against a dealer ace, because H17 changes basic strategy ' +
      'itself — 11 against an ace and 15 against an ace become near-basic plays, so their indices move toward zero or ' +
      'drop out altogether. The count-neutral stiffs and insurance are essentially unchanged.</p>',
    '    <p>The trainer will not apply this table to an H17 game. It disables deviations and says why, rather than ' +
      'quietly using S17 numbers on the wrong ruleset — see <a href="/about">where the numbers come from</a>.</p>',
  ].join('\n');

  const faqs = [
    {
      q: 'What is the Illustrious 18?',
      a:
        'The eighteen most valuable basic-strategy deviations for a Hi-Lo card counter, identified by Don Schlesinger in Blackjack Attack. Each one is a hand where, above a specific true count, the correct play differs from the basic strategy chart.',
    },
    {
      q: 'What is the Fab 4?',
      a:
        'The four most valuable late-surrender index plays: 14 against a ten, 15 against a ten, 15 against a nine and 15 against an ace. They only apply at tables that offer surrender.',
    },
    {
      q: 'At what true count should I take insurance?',
      a:
        'At a true count of plus 3 or higher. Below that, insurance is a losing bet and basic strategy correctly says to decline it. Taking even money on a blackjack is the same bet and follows the same rule.',
    },
    {
      q: 'Do I need all 18 to benefit from counting?',
      a:
        'No. Most of a counter edge comes from bet sizing rather than from deviations. Insurance, 16 against a ten and 15 against a ten carry a large share of the deviation value on their own, and are a reasonable place to stop if you are learning.',
    },
  ];

  return {
    body,
    jsonLd: graph(
      webSiteNode,
      {
        '@type': 'Article',
        '@id': urlFor(page.path) + '#article',
        headline: page.heading,
        description: page.description,
        inLanguage: SITE.lang,
        isPartOf: { '@id': urlFor('/') + '#website' },
        about: { '@type': 'Thing', name: 'Blackjack index plays' },
      },
      breadcrumb([{ name: 'Twenty-One', path: '/' }, { name: 'Illustrious 18', path: page.path }]),
      faqPage(faqs),
    ),
    faqs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// /blackjack-rules
// ─────────────────────────────────────────────────────────────────────────────────────────────
function blackjackRules(page) {
  const body = [
    '    <h1>' + esc(page.heading) + '</h1>',
    '    <p class="lede">Blackjack is not one game. The rules printed on the felt move the house edge and, more ' +
      'awkwardly for anyone learning, they move the correct play. A chart is an answer to a specific question, and ' +
      'the question includes the rules.</p>',

    '    <h2 id="table">The game this trainer deals</h2>',
    '    <dl class="rules">',
    ...HOUSE_RULES.map((r) => '      <dt>' + esc(r.term) + '</dt>\n      <dd>' + esc(r.detail) + '</dd>'),
    '    </dl>',

    '    <h2 id="levers">The four rules that move the most</h2>',
    '    <h3>Dealer stands or hits on soft 17</h3>',
    '    <p>The single most important line on the felt. When the dealer hits soft 17 they draw to hands they would ' +
      'otherwise have stood on, which converts some of their 17s into 18s, 19s and 20s. It costs the player roughly ' +
      '<strong>0.20 to 0.22%</strong> — more than every other common rule variation you will meet — and it changes ' +
      'about six cells of basic strategy, mostly against a dealer ace. It also shifts several index plays.</p>',
    '    <h3>Blackjack pays 3:2 or 6:5</h3>',
    '    <p>A 6:5 table pays $6 on a $5 blackjack instead of $7.50. It is the most expensive rule on a modern floor and ' +
      'it is not close. Nothing on this site is computed for it, and the honest advice about a 6:5 table is to walk ' +
      'past it.</p>',
    '    <h3>Double after split</h3>',
    '    <p>DAS makes splitting more attractive, because each new hand can be doubled if it lands well. Without it, ' +
      'several pair cells revert to hitting: 2,2 and 3,3 against 2 and 3, 4,4 against 5 and 6, and 6,6 against 2. ' +
      'The chart here assumes DAS is allowed.</p>',
    '    <h3>Surrender</h3>',
    '    <p>Late surrender gives back half your bet on your first two cards, after the dealer has checked for ' +
      'blackjack. It only affects a few of the worst hands, but those hands are common. Without surrender, every ' +
      '<code>Rh</code> cell on the chart becomes a hit.</p>',

    '    <h2 id="deck">Decks and penetration</h2>',
    '    <p>Fewer decks favour the player slightly, but for anyone counting, the number that matters more is ' +
      '<strong>penetration</strong> — how deep into the shoe the dealer goes before shuffling. A count is only worth ' +
      'something once enough cards have been seen for it to mean anything, so a shoe cut at half is far less useful ' +
      'than one cut at three quarters. This trainer deals ' +
      DECKS +
      ' decks cut ' +
      CUT_PCT +
      '% in by default, which is an ordinary, realistic shoe — and both are settings, so you can practise ' +
      'counting through eight decks cut at half if that is the game in front of you.</p>',

    '    <h2 id="fixed">What you can change, and what you cannot</h2>',
    '    <p>' + esc(WHY_FIXED) + '</p>',
    '    <p>In practice that means the trainer lets you set the things the chart does not depend on — how many decks ' +
      'are in the shoe, anywhere from four to eight, and how deep the cut card sits — and refuses the things it does. ' +
      'The engine is rules-aware, and it knows what H17 does to the chart, but a ruleset is only offered once its ' +
      'numbers are fully sourced. Where they are not, it says so rather than filling the gap with a plausible guess: ' +
      '<a href="/about">how that is enforced</a>.</p>',
    cta(
      '/play',
      'Play this game',
      'Every hand dealt under exactly the rules above, and graded against the chart computed for them.',
    ),
  ].join('\n');

  const faqs = [
    {
      q: 'Does it matter whether the dealer hits or stands on soft 17?',
      a:
        'It is the most significant common rule variation. A dealer who hits soft 17 costs the player roughly 0.20 to 0.22%, and it changes about six cells of basic strategy as well as several card-counting index plays.',
    },
    {
      q: 'How bad is a 6:5 blackjack table?',
      a:
        'Bad enough to avoid. A 6:5 table pays 6 dollars on a 5 dollar blackjack instead of 7.50, and it is the most expensive single rule you will find on a modern casino floor.',
    },
    {
      q: 'What is penetration and why does it matter for counting?',
      a:
        'Penetration is how far into the shoe the dealer deals before shuffling. A count only becomes reliable once a meaningful number of cards have been seen, so deep penetration is worth more to a counter than a small change in the number of decks.',
    },
  ];

  return {
    body,
    jsonLd: graph(
      webSiteNode,
      breadcrumb([{ name: 'Twenty-One', path: '/' }, { name: 'House rules', path: page.path }]),
      faqPage(faqs),
    ),
    faqs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// /about
// ─────────────────────────────────────────────────────────────────────────────────────────────
function about(page) {
  const body = [
    '    <h1>' + esc(page.heading) + '</h1>',
    '    <p class="lede">There is a lot of blackjack advice on the internet and some of it is wrong. This page is the ' +
      'answer to the only question that should decide whether you trust a trainer: where did it get its numbers, and ' +
      'what happens when it does not have them.</p>',

    '    <h2 id="sources">Every number is traced to a source</h2>',
    '    <p>The chart cells, the Hi-Lo tags, the index plays and the drill benchmarks all come from a single research ' +
      'document, and each numeric claim in it carries the URL it came from. The primary sources are the Wizard of ' +
      'Odds multi-deck strategy and Hi-Lo pages, QFIT&rsquo;s system comparison tables, Blackjack Apprenticeship&rsquo;s ' +
      'Hi-Lo guide, and Don Schlesinger&rsquo;s <em>Blackjack Attack</em> for the Illustrious 18 and the Fab 4.</p>',

    '    <h2 id="drift">The code cannot drift from the sources</h2>',
    '    <p>Being able to cite a chart is not the same as shipping it correctly. The test suite transcribes the charts ' +
      'independently from the research document and compares them to the engine cell by cell. If a number in the code ' +
      'and a number in the research ever disagree, the build fails. Nobody has to remember to check.</p>',
    '    <p>The same engine that grades your hand is the one that generates the tables on this site. The chart you ' +
      'read on <a href="/basic-strategy-chart">the strategy page</a> is not a copy of the chart the trainer marks ' +
      'you against — it is the same data, printed at build time.</p>',

    '    <h2 id="method">What it teaches, and in what order</h2>',
    '    <dl class="rules">',
    ...METHODS.map(
      (m) =>
        '      <dt>' + esc(m.name) + '</dt>\n      <dd>' + esc(m.what) + ' <span class="dim">' + esc(m.how) + '</span></dd>',
    ),
    '    </dl>',

    '    <h2 id="gaps">What is deliberately missing</h2>',
    '    <ul>',
    '      <li><strong>H17 index numbers.</strong> The deviation table is derived for a dealer who stands on soft 17. ' +
      'Several indices shift under H17 and a sourced H17 set has not been found, so an H17 game turns deviations off ' +
      'with a notice instead of applying the wrong numbers.</li>',
    '      <li><strong>The exact rungs of the bet ramp.</strong> The 1&ndash;' +
      MAX_SPREAD +
      ' spread and the table-minimum-at-low-counts rule are sourced; the individual steps between them are a ' +
      'convention. The trainer shows you the ramp it is grading against rather than presenting it as settled.</li>',
    '      <li><strong>Other rulesets.</strong> The engine is rules-aware, but a ruleset is only offered once its ' +
      'numbers are sourced.</li>',
    '    </ul>',

    '    <h2 id="privacy">Your data</h2>',
    '    <p>There are no accounts and there is no server. Everything the trainer knows about you — which cells you have ' +
      'mastered, your accuracy heatmap, your settings — is stored in your own browser and never leaves it. Clearing ' +
      'your browser data clears your progress, and there is no way for anyone, including us, to recover it.</p>',

    '    <h2 id="not">What this is not</h2>',
    '    <p>This is practice software for a card game. There is no wagering, no real money, no prizes and nothing to ' +
      'buy. Counting cards is legal, and casinos are private property that may bar you for doing it well. Nothing ' +
      'here is a betting system, and there is no strategy in blackjack or anywhere else that makes a losing session ' +
      'impossible.</p>',
    SITE.contactEmail
      ? '    <p>Corrections are welcome — particularly to a number. <a href="mailto:' +
        esc(SITE.contactEmail) +
        '">' +
        esc(SITE.contactEmail) +
        '</a>.</p>'
      : '    <p>Corrections are welcome, particularly to a number.</p>',
    cta('/', 'Start training', 'The dashboard picks up wherever you left off.'),
  ].join('\n');

  return {
    body,
    jsonLd: graph(
      webSiteNode,
      breadcrumb([{ name: 'Twenty-One', path: '/' }, { name: 'Sources and method', path: page.path }]),
    ),
    faqs: [],
  };
}

/** Every reference page body, keyed by the slug in src/site.js. */
export const BUILDERS = {
  'basic-strategy-chart': basicStrategyChart,
  'card-counting': cardCounting,
  'illustrious-18': illustrious18,
  'blackjack-rules': blackjackRules,
  about,
};
