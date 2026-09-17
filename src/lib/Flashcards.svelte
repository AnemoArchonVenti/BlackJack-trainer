<script>
  // Mode 3: deviation flashcards (SPEC §5.3). Isolates "know the index" from "keep the count" —
  // the card HANDS you the true count, you name the action. Grading runs through the same
  // getDeviation -> getCorrectAction fallback the integration table will use, so there is one
  // answer key. Missed indices come back first, scheduled by the SRS (#5).
  import { DEVIATIONS, INSURANCE_INDEX, getDeviation, deviationsAvailable, shouldInsure } from '../engine/deviations.js';
  import { getCorrectAction, forGrading } from '../engine/strategy.js';
  import { handFor } from '../engine/hand.js';
  import { gradeCell, cellStats, persist, dueFirst } from './session.svelte.js';
  import HandView from './HandView.svelte';

  const RULES = { decks: 6, h17: false, das: true, surrender: true }; // v1 fixed ruleset (SPEC §1)
  const ACTIONS = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' };
  const INSURANCE_ID = 'dev-insurance';
  const guard = deviationsAvailable(RULES);

  let card = $state(null);
  let answer = $state(null);
  let asked = $state(0);
  let right = $state(0);

  const ids = [INSURANCE_ID, ...DEVIATIONS.map((e) => e.id)];

  // Pose a true count near the entry's index so both sides of the threshold come up: sometimes
  // the deviation is on, sometimes the honest answer is "just play the chart".
  const nearIndex = (index) => index + [-2, -1, 0, 0, 1, 2][Math.floor(Math.random() * 6)];

  function next() {
    // Draw from the front of the due queue, with a little jitter so the same card doesn't repeat.
    const queue = dueFirst(ids);
    const id = queue[Math.floor(Math.random() * Math.min(4, queue.length))];
    answer = null;

    if (id === INSURANCE_ID) {
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
  {#if !guard.available}
    <p class="notice" role="status">{guard.notice}</p>
  {:else}
    <p class="lead">
      The count is given to you — name the play. Illustrious 18 + Fab 4, Hi-Lo indices for a
      6-deck S17 game. Missed indices come back first.
    </p>

    <div class="card">
      {#if !card}
        <button class="primary" onclick={next}>Start</button>
      {:else}
        <p class="tc">True count <b>{tc(card.trueCount)}</b></p>

        {#if card.kind === 'insurance'}
          <div class="stage">
            <HandView hand={[{ rank: 'A', value: 11 }]} label="Dealer shows" />
          </div>
          <p class="prompt">Insurance is offered. Take it?</p>
          <div class="moves">
            <button onclick={() => pick(true)} disabled={!!answer}>Yes <kbd>Y</kbd></button>
            <button onclick={() => pick(false)} disabled={!!answer}>No <kbd>N</kbd></button>
          </div>
        {:else}
          <div class="stage">
            <HandView hand={[card.upcard]} label="Dealer" />
            <HandView hand={card.hand} label="You" />
          </div>
          <div class="moves">
            {#each ['H', 'S', 'D', 'P', 'R'] as code (code)}
              <button onclick={() => pick(code)} disabled={!!answer || (code === 'P' && card.entry.type !== 'pair')}>
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
            <button class="primary" onclick={next}>Next <kbd>enter</kbd></button>
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
  .flashcards { max-width: 40rem; margin: 1.5rem auto; padding: 0 1rem; display: flex; flex-direction: column; gap: 0.9rem; align-items: center; }
  .lead { font-size: 0.85rem; text-align: center; max-width: 32rem; }
  .notice {
    border: 1px solid var(--accent-border); background: var(--accent-bg);
    border-radius: var(--r-md); padding: 0.8rem 1rem; font-size: 0.9rem;
  }
  .card {
    width: 100%; box-sizing: border-box; border: 1px solid var(--border); border-radius: var(--r-lg);
    background: var(--panel); padding: 1.2rem; display: flex; flex-direction: column;
    gap: 0.8rem; align-items: center;
  }
  .tc { margin: 0; font-size: 0.9rem; }
  .tc b { font-size: 1.3rem; color: var(--text-h); }
  .stage {
    display: flex; gap: 1.5rem; justify-content: center; padding: 1rem 1.2rem; width: 100%;
    box-sizing: border-box; border-radius: var(--r-md);
    background: radial-gradient(circle at 50% 30%, var(--felt), var(--felt-edge));
  }
  .prompt { margin: 0; font-size: 0.9rem; }
  .moves { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; }
  .moves button, .primary {
    padding: 0.45rem 0.8rem; border: none; border-radius: var(--r-sm);
    background: var(--btn); color: #fff; font-weight: 600; cursor: pointer; font-size: 0.85rem;
  }
  .moves button:disabled { opacity: 0.35; cursor: not-allowed; }
  kbd { font: inherit; font-size: 0.7rem; opacity: 0.7; }
  .verdict { display: flex; flex-direction: column; gap: 0.4rem; align-items: center; min-height: 2rem; }
  .mark { margin: 0; font-weight: 700; color: var(--good); }
  .mark.bad { color: var(--bad); }
  .rule { margin: 0; font-size: 0.82rem; text-align: center; opacity: 0.85; }
  .score { margin: 0; font-size: 0.78rem; opacity: 0.8; }
</style>
