<script>
  // Mode 4: the integration table (SPEC §5.4). Everything at once — you keep the count yourself,
  // size the bet by it, and are expected to make the index plays. Nothing is shown to you: no
  // running count, no true count, no per-decision verdict. The shoe grades you at the end.
  //
  // Editorial skin (DESIGN-SPEC §5.4/§5.9): the same table as Mode 1 — money line above the felt,
  // flat green panel, actions below it — and the end-of-shoe report is a hairline ledger led by
  // one big figure.
  import { createShoe } from '../engine/shoe.js';
  import { createTable } from '../engine/round.js';
  import { cellId } from '../engine/strategy.js';
  import { deviationFor } from '../engine/deviations.js';
  import { recommendedUnits, RAMP, MAX_SPREAD } from '../engine/betting.js';
  import { scoreShoe, COUNT_CARD_ID, BET_CARD_ID } from '../engine/integration.js';
  import { gradeBet } from '../engine/betting.js';
  import { session, gradeCards, persist, shoeSettings } from './session.svelte.js';
  import { cue } from './audio.js';
  import HandView from './HandView.svelte';
  import { money } from './money.js';

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
      shoe: createShoe({ ...shoeSettings(), seed: Date.now() }),
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

<svelte:window onkeydown={onkey} onpointerdown={() => (skip = true)} />

<section class="integration">
  <h1>Integration</h1>

  {#if report}
    <div class="report" aria-live="polite">
      <div class="head">
        <h2>End of shoe</h2>
        <span class="rounds">{report.rounds} rounds</span>
      </div>
      <p class="overall"><b>{pct(report.overall)}</b> <span>overall across {report.rounds} rounds</span></p>
      <dl>
        {#each AXES as [key, label, hint] (key)}
          <div>
            <dt>
              {label}
              <span class="hint">{hint}</span>
            </dt>
            <dd>
              {pct(report[key].accuracy)}
              <span class="of">{report[key].total ? `${report[key].correct}/${report[key].total}` : 'none came up'}</span>
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
      <button class="action primary" onclick={nextShoe}>New shoe</button>
    </div>
  {:else}
    <p class="lead">
      No count is shown. Keep it yourself, size the bet by it, and play the indices — you are
      graded when the shoe hits the cut card.
    </p>

    <div class="meta">
      <span class="item">Bankroll <b>{money(bankroll)}</b></span>
      <span class="rounds">{history.length} rounds this shoe</span>
    </div>

    <div class="felt" class:skip>
      <div class="inner">
        <div class="zone">
          {#if round}
            <HandView hand={round.dealer} role="dealer" hideHole={phase === 'player'} />
          {/if}
        </div>

        <div class="zone bottom">
          {#if round}
            <div class="spots">
              {#each round.hands as h, i (i)}
                <HandView
                  hand={h.cards}
                  index={i}
                  bet={h.bet}
                  split={round.hands.length > 1}
                  active={round.active === i && phase === 'player'}
                  outcome={phase === 'done' ? h.outcome : ''}
                  net={phase === 'done' && round.hands.length === 1 ? round.net : null}
                />
              {/each}
            </div>
          {/if}

          {#if phase !== 'player'}
            <div class="entry">
              <label>
                <span class="unit">Your running count</span>
                <input type="number" bind:value={called} />
              </label>
              <label>
                <span class="unit">Bet in units</span>
                <input type="number" min="1" max={MAX_SPREAD} bind:value={units} />
              </label>
              <span class="money">× {money(UNIT)} = {money(units * UNIT)}</span>
              <button class="deal" onclick={deal}>Deal <kbd>enter</kbd></button>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="controls">
      {#if phase === 'player'}
        {#each moves as code (code)}
          <button class="action" onclick={() => move(code)}>
            {ACTIONS[code]} <span class="key" aria-hidden="true">{code}</span>
          </button>
        {/each}
      {/if}
    </div>

    <details class="ramp">
      <summary>Bet ramp</summary>
      <p>Bet the ramp for the true count you are holding. 1 unit = {money(UNIT)}.</p>
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
  .integration {
    max-width: 56rem; margin: 0 auto; padding: 40px var(--pad) 48px;
    display: flex; flex-direction: column; gap: var(--s-4); text-align: left;
  }
  h1 { margin: 0; font-size: 40px; font-weight: 500; letter-spacing: -0.02em; }
  .lead { font-size: 17px; line-height: 1.55; color: var(--text); max-width: 34rem; text-wrap: pretty; }

  .meta { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-3); }
  .item { font-size: 14px; color: var(--text); }
  .item b {
    font-family: var(--heading); font-size: 24px; font-weight: 500; margin-left: 6px;
    color: var(--text-h); font-variant-numeric: tabular-nums;
  }
  .rounds { font-family: var(--mono); font-size: 12px; color: var(--text); }

  .felt { display: flex; padding: 12px; border-radius: var(--r-lg); background: var(--felt); min-height: 26rem; }
  .inner {
    flex: 1; min-width: 0;
    border: 1px solid var(--felt-inset); border-radius: var(--r-md); padding: var(--s-4) var(--s-4);
    display: flex; flex-direction: column; justify-content: space-between; align-items: center; gap: var(--s-4);
  }
  .zone { display: flex; flex-direction: column; align-items: center; gap: var(--s-4); max-width: 100%; }
  .bottom { margin-top: auto; }
  .spots { display: flex; gap: var(--s-5); flex-wrap: wrap; justify-content: center; max-width: 100%; }
  /* Any input resolves the deal choreography immediately (#10 F5). */
  .felt.skip :global(*) { animation: none !important; transition: none !important; }

  .entry { display: flex; gap: var(--s-3); align-items: flex-end; flex-wrap: wrap; justify-content: center; }
  label { display: flex; flex-direction: column; gap: var(--s-1); color: var(--on-felt-strong); }
  .unit { font-family: var(--mono); font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--on-felt); }
  input {
    width: 6rem; padding: 4px 8px; border-radius: var(--r-sm);
    border: 1px solid var(--card-border); background: var(--card-bg); color: var(--card-ink);
    font-family: var(--heading); font-size: 24px; font-weight: 500;
    font-variant-numeric: tabular-nums; text-align: center;
  }
  .money { font-family: var(--heading); font-size: 18px; color: var(--on-felt); padding-bottom: 6px; }

  .controls { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  button { font: inherit; font-size: 16px; font-weight: 500; cursor: pointer; }
  .action {
    height: 56px; display: flex; align-items: center; justify-content: center; gap: 10px;
    border: 1px solid var(--text-h); border-radius: var(--r-sm); background: none;
    color: var(--text-h);
  }
  .action:hover { background: var(--hover); }
  .key { font-family: var(--mono); font-size: 12px; font-weight: 400; color: var(--text); }
  .primary { background: var(--accent); border-color: var(--accent); color: var(--on-btn); padding: 0 24px; align-self: flex-start; }
  /* On the felt the green primary would vanish, so Deal inverts, as the chip stack's does. */
  .deal {
    height: 48px; padding: 0 20px; display: inline-flex; align-items: center; gap: 10px;
    border: 1px solid var(--on-felt-strong); border-radius: var(--r-sm);
    background: var(--on-felt-strong); color: var(--felt);
  }
  kbd { font-family: var(--mono); font-size: 12px; font-weight: 400; opacity: 0.75; }

  /* ── End-of-shoe report: a ledger, led by one figure ── */
  .report { display: flex; flex-direction: column; gap: var(--s-3); border-top: 1px solid var(--rule); padding-top: var(--s-3); }
  .head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-3); }
  .report h2 { margin: 0; font-size: 26px; font-weight: 500; }
  .overall { display: flex; align-items: baseline; gap: var(--s-3); }
  .overall b {
    font-family: var(--heading); font-size: 48px; font-weight: 500; line-height: 1;
    color: var(--text-h); font-variant-numeric: tabular-nums;
  }
  .overall span { font-size: 14px; color: var(--text); }
  .report dl { margin: 0; border-top: 1px solid var(--border); }
  .report dl div {
    display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-4);
    padding: 14px 0; border-bottom: 1px solid var(--border);
  }
  .report dt { font-size: 16px; font-weight: 500; color: var(--text-h); display: flex; flex-direction: column; gap: 2px; }
  .report dd {
    margin: 0; display: flex; align-items: baseline; gap: var(--s-2);
    font-family: var(--heading); font-size: 24px; font-weight: 500; color: var(--text-h);
    font-variant-numeric: tabular-nums; white-space: nowrap;
  }
  .of { font-family: var(--sans); font-size: 14px; font-weight: 400; color: var(--text); }
  .hint { font-family: var(--sans); font-size: 14px; font-weight: 400; color: var(--text); }
  .fed { font-size: 14px; color: var(--text); }
  .fed.clean { color: var(--good); }

  /* ── Bet ramp ── */
  .ramp { font-size: 14px; color: var(--text); border-top: 1px solid var(--border); padding-top: var(--s-3); }
  .ramp summary { cursor: pointer; font-size: 16px; font-weight: 500; color: var(--text-h); }
  .ramp p { margin-top: var(--s-2); line-height: 1.55; }
  .ramp ul { list-style: none; padding: 0; margin: var(--s-2) 0; display: flex; flex-direction: column; gap: 4px; }
  .ramp b { font-family: var(--heading); font-size: 16px; color: var(--text-h); min-width: 5rem; display: inline-block; }

  @media (max-width: 560px) {
    .controls { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .action { height: 48px; }
    .felt { min-height: 0; padding: 8px; }
    .inner { padding: var(--s-3); }
  }
</style>
