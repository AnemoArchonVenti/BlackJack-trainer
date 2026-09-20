<script>
  // Mode 3: deviation flashcards (SPEC §5.3). Isolates "know the index" from "keep the count" —
  // the card HANDS you the true count, you name the action. Grading runs through the same
  // getDeviation -> getCorrectAction fallback the integration table will use, so there is one
  // answer key. Missed indices come back first, scheduled by the SRS (#5).
  //
  // Editorial skin (DESIGN-SPEC §5.9): the count you are given is the page's big figure, set
  // above the felt where the table keeps its money line, and the card loses its box.
  import {
    DEVIATIONS, DEVIATION_CARD_IDS, INSURANCE_CARD_ID, INSURANCE_INDEX,
    getDeviation, deviationsAvailable, shouldInsure,
  } from '../engine/deviations.js';
  import { getCorrectAction, forGrading } from '../engine/strategy.js';
  import { handFor } from '../engine/hand.js';
  import { gradeCell, cellStats, persist, dueFirst } from './session.svelte.js';
  import HandView from './HandView.svelte';
  import { cue } from './audio.js';

  const RULES = { decks: 6, h17: false, das: true, surrender: true }; // v1 fixed ruleset (SPEC §1)
  const ACTIONS = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' };
  const guard = deviationsAvailable(RULES);

  let card = $state(null);
  let answer = $state(null);
  let asked = $state(0);
  let right = $state(0);

  const ids = DEVIATION_CARD_IDS;

  // Pose a true count near the entry's index so both sides of the threshold come up: sometimes
  // the deviation is on, sometimes the honest answer is "just play the chart".
  const nearIndex = (index) => index + [-2, -1, 0, 0, 1, 2][Math.floor(Math.random() * 6)];

  function next() {
    // Draw from the front of the due queue, with a little jitter so the same card doesn't repeat.
    const queue = dueFirst(ids);
    const id = queue[Math.floor(Math.random() * Math.min(4, queue.length))];
    answer = null;

    if (id === INSURANCE_CARD_ID) {
      card = { id, kind: 'insurance', trueCount: nearIndex(INSURANCE_INDEX), play: 'Insurance' };
      return;
    }
    const entry = DEVIATIONS.find((e) => e.id === id);
    const { hand, upcard } = handFor(entry);
    card = { id, kind: 'play', entry, hand, upcard, trueCount: nearIndex(entry.index), play: entry.play };
  }

  /** The answer key: the deviation when the count crosses the index, else the chart. */
  const expected = (c) =>
    c.kind === 'insurance'
      ? shouldInsure(c.trueCount)
      : getDeviation(c.hand, c.upcard, c.trueCount, RULES) ?? forGrading(getCorrectAction(c.hand, c.upcard, RULES));

  function pick(choice) {
    if (answer) return;
    const want = expected(card);
    const correct = choice === want;
    answer = { choice, want, correct, deviated: card.kind === 'play' && getDeviation(card.hand, card.upcard, card.trueCount, RULES) !== null };
    asked += 1;
    if (correct) right += 1;
    gradeCell(card.id, correct);
    cue(correct ? 'correct' : 'wrong');
    persist();
  }

  const stats = $derived(card ? cellStats(card.id) : null);
  const tc = (n) => `${n > 0 ? '+' : ''}${n}`;
  const rule = (c) =>
    c.kind === 'insurance'
      ? `Insurance: take it at a true count of ${tc(INSURANCE_INDEX)} or higher.`
      : c.entry.below
        ? `${c.entry.play}: ${ACTIONS[c.entry.at].toLowerCase()} at ${tc(c.entry.index)} or above, ${ACTIONS[c.entry.below].toLowerCase()} below it.`
        : `${c.entry.play}: ${ACTIONS[c.entry.at].toLowerCase()} at ${tc(c.entry.index)} or above, otherwise play basic strategy.`;

  function onkey(e) {
    if (!guard.available) return;
    if (!card) return next();
    if (answer) {
      if (e.key === 'Enter') next();
      return;
    }
    const k = e.key.toUpperCase();
    if (card.kind === 'insurance') {
      if (k === 'Y') pick(true);
      else if (k === 'N') pick(false);
    } else if (ACTIONS[k]) pick(k);
  }
</script>

<svelte:window onkeydown={onkey} />

<section class="flashcards">
  <h1>Deviations</h1>

  {#if !guard.available}
    <div class="notice" role="status">
      <span class="kicker">Not available</span>
      <p>{guard.notice}</p>
    </div>
  {:else}
    <p class="lead">
      The count is given to you — name the play. Illustrious 18 + Fab 4, Hi-Lo indices for a
      6-deck S17 game. Missed indices come back first.
    </p>

    <div class="card">
      {#if !card}
        <button class="action primary" onclick={next}>Start</button>
      {:else}
        <div class="meta">
          <span class="item">True count <b>{tc(card.trueCount)}</b></span>
          {#if card.kind === 'insurance'}<span class="shoe">Insurance is offered</span>{/if}
        </div>

        <div class="stage">
          <div class="inner">
            {#if card.kind === 'insurance'}
              <HandView hand={[{ rank: 'A', value: 11 }]} role="dealer" />
            {:else}
              <HandView hand={[card.upcard]} role="dealer" />
              <HandView hand={card.hand} />
            {/if}
          </div>
        </div>

        {#if card.kind === 'insurance'}
          <p class="prompt">Insurance is offered. Take it?</p>
          <div class="moves two">
            <button class="action" onclick={() => pick(true)} disabled={!!answer}>Yes <kbd>Y</kbd></button>
            <button class="action" onclick={() => pick(false)} disabled={!!answer}>No <kbd>N</kbd></button>
          </div>
        {:else}
          <div class="moves">
            {#each ['H', 'S', 'D', 'P', 'R'] as code (code)}
              <button class="action" onclick={() => pick(code)} disabled={!!answer || (code === 'P' && card.entry.type !== 'pair')}>
                {ACTIONS[code]} <kbd>{code}</kbd>
              </button>
            {/each}
          </div>
        {/if}

        <div class="verdict" aria-live="polite">
          {#if answer}
            <p class="mark" class:bad={!answer.correct}>
              {#if answer.correct}
                ✓ {answer.deviated ? 'Deviation' : 'Basic strategy'}
              {:else}
                ✗ correct: {card.kind === 'insurance' ? (answer.want ? 'take insurance' : 'no insurance') : ACTIONS[answer.want]}
              {/if}
            </p>
            <p class="rule">{rule(card)}</p>
            <button class="action primary" onclick={next}>Next <kbd>enter</kbd></button>
          {/if}
        </div>
      {/if}
    </div>

    <p class="score">
      {asked ? `${right}/${asked} this session` : ''}
      {#if stats && stats.attempts}· this index: {stats.correct}/{stats.attempts} · {stats.bucket}{/if}
    </p>
  {/if}
</section>

<style>
  .flashcards {
    max-width: 46rem; margin: 0 auto; padding: 40px var(--pad) 48px;
    display: flex; flex-direction: column; gap: var(--s-4); text-align: left;
  }
  h1 { margin: 0; font-size: 40px; font-weight: 500; letter-spacing: -0.02em; }
  .lead { font-size: 17px; line-height: 1.55; color: var(--text); max-width: 34rem; text-wrap: pretty; }

  /* A notice, not a callout box: the same top rule every section gets. */
  .notice { border-top: 1px solid var(--rule); padding-top: var(--s-3); display: flex; flex-direction: column; gap: var(--s-2); }
  .kicker {
    font-family: var(--mono); font-size: 12px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--accent);
  }
  .notice p { font-size: 16px; line-height: 1.55; color: var(--text); max-width: 34rem; }

  .card {
    border-top: 1px solid var(--rule); padding-top: var(--s-4);
    display: flex; flex-direction: column; gap: var(--s-3); align-items: flex-start;
  }

  .meta { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-3); width: 100%; }
  .item { font-size: 14px; color: var(--text); }
  .item b {
    font-family: var(--heading); font-size: 30px; font-weight: 500; margin-left: 6px;
    color: var(--text-h); font-variant-numeric: tabular-nums;
  }
  .shoe { font-family: var(--mono); font-size: 12px; color: var(--text); }

  .stage { display: flex; width: 100%; padding: 12px; border-radius: var(--r-lg); background: var(--felt); }
  .inner {
    flex: 1; box-sizing: border-box;
    border: 1px solid var(--felt-inset); border-radius: var(--r-md); padding: var(--s-5) var(--s-4);
    display: flex; gap: var(--s-5); align-items: center; justify-content: center; flex-wrap: wrap;
  }

  .prompt { font-size: 16px; color: var(--text-h); }
  .moves { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; width: 100%; }
  .moves.two { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 22rem; }

  button { font: inherit; font-size: 16px; font-weight: 500; cursor: pointer; }
  .action {
    height: 56px; display: inline-flex; align-items: center; justify-content: center; gap: 10px;
    border: 1px solid var(--text-h); border-radius: var(--r-sm); background: none; color: var(--text-h);
  }
  .action:hover:not(:disabled) { background: var(--hover); }
  .action:disabled { opacity: 0.35; cursor: not-allowed; }
  .primary {
    background: var(--accent); border-color: var(--accent); color: var(--on-btn);
    padding: 0 24px; align-self: flex-start;
  }
  kbd { font-family: var(--mono); font-size: 12px; font-weight: 400; color: var(--text); }
  .primary kbd { color: currentColor; opacity: 0.75; }

  .verdict { display: flex; flex-direction: column; gap: var(--s-2); align-items: flex-start; min-height: 2rem; }
  .mark { font-size: 16px; font-weight: 500; color: var(--good); }
  .mark.bad { color: var(--danger); }
  .rule { font-size: 14px; line-height: 1.55; color: var(--text); text-wrap: pretty; }
  .score { font-family: var(--mono); font-size: 12px; color: var(--text); }

  @media (max-width: 560px) {
    .moves { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .action { height: 48px; }
  }
</style>
