<script>
  // Mode 4: the integration table (SPEC §5.4). Everything at once — you keep the count yourself,
  // size the bet by it, and are expected to make the index plays. Nothing is shown to you: no
  // running count, no true count, no per-decision verdict. The shoe grades you at the end.
  import { createShoe } from '../engine/shoe.js';
  import { createTable } from '../engine/round.js';
  import { cellId } from '../engine/strategy.js';
  import { deviationFor } from '../engine/deviations.js';
  import { recommendedUnits, RAMP, MAX_SPREAD } from '../engine/betting.js';
  import { scoreShoe, COUNT_CARD_ID, BET_CARD_ID } from '../engine/integration.js';
  import { gradeBet } from '../engine/betting.js';
  import { session, gradeCards, persist } from './session.svelte.js';
  import { cue } from './audio.js';
  import HandView from './HandView.svelte';

  const UNIT = 10; // dollars per betting unit
  const RULES = { deviations: true }; // the whole point of this mode
  const ACTIONS = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' };

  let t = $state(newTable());
  let round = $state(null);
  let moves = $state([]);
  let bankroll = $state(session.bankroll);
  let skip = $state(false);

  let called = $state(0); // the player's running count for this round
  let units = $state(1);
  let history = $state([]); // one entry per settled round, fed to scoreShoe at the cut
  let report = $state(null);
  let pending = null; // the count/bet truth captured at the deal, before any cards were exposed

  const phase = $derived(round ? round.phase : 'betting');

  function newTable() {
    return createTable({
      shoe: createShoe({ decks: 6, penetration: 4.5, seed: Date.now() }),
      bankroll: session.bankroll,
      rules: RULES,
    });
  }

  function sync() {
    round = t.round ? JSON.parse(JSON.stringify(t.round)) : null;
    moves = t.legalMoves();
    bankroll = t.bankroll;
    session.bankroll = t.bankroll;
  }

  function deal() {
    if (report) return;
    skip = false;
    // Truth is read BEFORE the deal: this is the count the player should be holding right now,
    // and the true count their bet should have been sized from.
    pending = { calledCount: called, truthCount: t.shoe.runningCount, trueCount: t.shoe.trueCount, units };
    cue('chip');
    t.deal(units * UNIT);
    sync();
    if (round?.phase === 'done') settle();
  }

  const move = (code) => {
    skip = true;
    cue('deal');
    ({ H: t.hit, S: t.stand, D: t.double, P: t.split, R: t.surrender })[code]();
    sync();
    if (round?.phase === 'done') settle();
  };

  function settle() {
    const decisions = t.round.decisions.map((d) => ({
      correct: d.correct,
      wasDeviation: d.wasDeviation,
      cellId: cellId(d.hand, d.upcard),
      deviationId: deviationFor(d.hand, d.upcard)?.id ?? null,
    }));
    history = [...history, { ...pending, decisions }];

    // Feed the SRS as we go, not only at the cut: every decision, every index spot, plus the two
    // skills this mode is really testing. Grading the hits as well as the misses is what lets a
    // card climb the boxes (#5) — the end-of-shoe report is the summary, not the source.
    gradeCards([
      { id: COUNT_CARD_ID, correct: pending.calledCount === pending.truthCount },
      { id: BET_CARD_ID, correct: gradeBet(pending.trueCount, pending.units).correct },
      ...decisions.map((d) => ({ id: d.cellId, correct: d.correct })),
      ...decisions.filter((d) => d.wasDeviation && d.deviationId).map((d) => ({ id: d.deviationId, correct: d.correct })),
    ]);

    if (t.shoe.needsShuffle) endShoe();
  }

  function endShoe() {
    report = scoreShoe(history);
    cue(report.overall === 1 ? 'correct' : 'wrong');
    persist();
  }

  function nextShoe() {
    t = newTable();
    round = null;
    history = [];
    report = null;
    called = 0;
    units = 1;
    sync();
  }

  function onkey(e) {
    if (e.target.tagName === 'INPUT' || report) return;
    const code = e.key.toUpperCase();
    if (phase === 'player' && moves.includes(code)) {
      e.preventDefault();
      move(code);
    } else if (e.key === 'Enter' && phase !== 'player') {
      deal();
    }
  }

  const pct = (n) => (n === null ? '—' : `${Math.round(n * 100)}%`);
  const AXES = [
    ['count', 'Count accuracy', 'rounds you had the running count exactly right'],
    ['bets', 'Bet sizing', 'rounds you bet the ramp for the true count'],
    ['play', 'Play', 'decisions matching the answer key'],
    ['deviations', 'Deviations', 'index spots you got right'],
  ];
</script>

<svelte:window onkeydown={onkey} />

<section class="integration">
  {#if report}
    <div class="report" aria-live="polite">
      <h2>End of shoe</h2>
      <p class="overall">{pct(report.overall)}<span>overall across {report.rounds} rounds</span></p>
      <dl>
        {#each AXES as [key, label, hint] (key)}
          <div>
            <dt>{label}</dt>
            <dd>
              {pct(report[key].accuracy)}
              <span class="of">{report[key].total ? `${report[key].correct}/${report[key].total}` : 'none came up'}</span>
              <span class="hint">{hint}</span>
            </dd>
          </div>
        {/each}
      </dl>
      {#if report.misses.length}
        <p class="fed">
          {report.misses.length} weak {report.misses.length === 1 ? 'spot' : 'spots'} went back into your review queue.
        </p>
      {:else}
        <p class="fed clean">Clean shoe — nothing to send back to the queue.</p>
      {/if}
      <button class="primary" onclick={nextShoe}>New shoe</button>
    </div>
  {:else}
    <p class="lead">
      No count is shown. Keep it yourself, size the bet by it, and play the indices — you are
      graded when the shoe hits the cut card.
    </p>

    <div class="felt" class:skip onpointerdown={() => (skip = true)}>
      <header>
        <span>Bankroll <b>${bankroll}</b></span>
        <span class="rounds">{history.length} rounds this shoe</span>
      </header>

      {#if round}
        <HandView hand={round.dealer} label="Dealer" hideHole={phase === 'player'} />
        <div class="spots">
          {#each round.hands as h, i (i)}
            <HandView
              hand={h.cards}
              label={round.hands.length > 1 ? `Hand ${i + 1} ($${h.bet})` : `You ($${h.bet})`}
              outcome={phase === 'done' ? h.outcome : round.active === i && phase === 'player' ? 'active' : ''}
            />
          {/each}
        </div>
      {/if}

      <footer>
        {#if phase === 'player'}
          <div class="moves">
            {#each moves as code (code)}
              <button onclick={() => move(code)}>{ACTIONS[code]} <kbd>{code}</kbd></button>
            {/each}
          </div>
        {:else}
          {#if round}
            <p class="result" class:win={round.net > 0} class:lose={round.net < 0}>
              {round.net > 0 ? `Won $${round.net}` : round.net < 0 ? `Lost $${-round.net}` : 'Push'}
            </p>
          {/if}
          <div class="entry">
            <label>
              Your running count
              <input type="number" bind:value={called} />
            </label>
            <label>
              Bet
              <input type="number" min="1" max={MAX_SPREAD} bind:value={units} />
              <span class="money">× ${UNIT} = ${units * UNIT}</span>
            </label>
            <button class="primary" onclick={deal}>Deal <kbd>enter</kbd></button>
          </div>
        {/if}
      </footer>
    </div>

    <details class="ramp">
      <summary>Bet ramp</summary>
      <p>Bet the ramp for the true count you are holding. 1 unit = ${UNIT}.</p>
      <ul>
        {#each RAMP as rung, i (rung.units)}
          <li>
            <b>{rung.units} {rung.units === 1 ? 'unit' : 'units'}</b>
            {i === 0 ? `true count under ${RAMP[1].from}` : `true count ${rung.from}${i === RAMP.length - 1 ? '+' : ` to ${RAMP[i + 1].from - 1}`}`}
          </li>
        {/each}
      </ul>
      <p class="hint">At the current shoe a neutral count wants {recommendedUnits(0)} unit.</p>
    </details>
  {/if}
</section>

<style>
  .integration { max-width: 46rem; margin: 1.5rem auto; padding: 0 1rem; display: flex; flex-direction: column; gap: 1rem; }
  .lead { font-size: 0.85rem; text-align: center; }
  .felt {
    padding: 1.4rem; min-height: 22rem; display: flex; flex-direction: column; gap: 1.2rem;
    align-items: center; justify-content: space-between;
    background: radial-gradient(circle at 50% 30%, var(--felt), var(--felt-edge));
    border: 6px solid var(--felt-edge); border-radius: var(--r-lg);
  }
  /* Any input resolves the deal choreography immediately (#10 F5). */
  .felt.skip :global(*) { animation: none !important; transition: none !important; }

  header { align-self: stretch; display: flex; justify-content: space-between; color: var(--on-felt); font-size: 0.85rem; }
  header b { color: var(--on-felt-strong); }
  .rounds { opacity: 0.8; }
  .spots { display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center; }
  footer { display: flex; flex-direction: column; gap: 0.7rem; align-items: center; }
  .moves { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; }
  .moves button, .primary {
    padding: 0.5rem 0.9rem; border: none; border-radius: var(--r-sm);
    background: var(--btn); color: var(--on-btn); font-weight: 600; cursor: pointer; font-size: 0.85rem;
  }
  kbd { font: inherit; font-size: 0.7rem; opacity: 0.7; }
  .entry { display: flex; gap: 0.8rem; align-items: flex-end; flex-wrap: wrap; justify-content: center; }
  label { display: flex; flex-direction: column; gap: 0.2rem; color: var(--on-felt); font-size: 0.75rem; }
  input {
    width: 5rem; padding: 0.35rem 0.5rem; border-radius: var(--r-sm);
    border: 1px solid var(--card-border); font: inherit; font-size: 0.9rem;
  }
  .money { color: var(--on-felt); font-size: 0.72rem; }
  .result { font-size: 1.1rem; font-weight: 700; color: var(--push); margin: 0; }
  .result.win { color: var(--win); }
  .result.lose { color: var(--lose); }

  .report {
    border: 1px solid var(--border); border-radius: var(--r-lg); background: var(--panel);
    padding: 1.2rem 1.4rem; display: flex; flex-direction: column; gap: 0.8rem; text-align: left;
  }
  .report h2 { margin: 0; font-size: 1.05rem; }
  .overall { font-size: 2.4rem; font-weight: 700; color: var(--text-h); display: flex; align-items: baseline; gap: 0.6rem; }
  .overall span { font-size: 0.8rem; font-weight: 400; color: var(--text); }
  .report dl { margin: 0; display: grid; gap: 0.5rem; }
  .report dt { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text); }
  .report dd { margin: 0; font-weight: 700; color: var(--text-h); display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; }
  .of { font-weight: 400; font-size: 0.8rem; color: var(--text); }
  .hint { font-weight: 400; font-size: 0.75rem; opacity: 0.75; }
  .fed { font-size: 0.85rem; }
  .fed.clean { color: var(--good); }
  .report .primary { align-self: flex-start; }

  .ramp { font-size: 0.82rem; }
  .ramp summary { cursor: pointer; font-weight: 600; color: var(--text-h); }
  .ramp ul { list-style: none; padding: 0; margin: 0.5rem 0; display: flex; flex-direction: column; gap: 0.2rem; }
  .ramp b { color: var(--text-h); min-width: 4.5rem; display: inline-block; }
</style>
