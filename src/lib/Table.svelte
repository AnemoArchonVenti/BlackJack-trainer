<script>
  // Mode 1: single-spot strategy play-table (SPEC §5.1). Wires the pure round engine to the UI:
  // play a full round, get the graded recap (#4), feed the SRS (#5).
  //
  // Motion (#10 F5): cards deal in staggered from the shoe, the hole card flips at settle, and
  // ANY input immediately resolves the choreography — the .skip class kills in-flight animations
  // so an impatient player never waits on a flourish.
  import { createShoe } from '../engine/shoe.js';
  import { createTable } from '../engine/round.js';
  import HandView from './HandView.svelte';
  import ChipStack from './ChipStack.svelte';
  import Review from './Review.svelte';
  import { session, gradeRound, persist } from './session.svelte.js';
  import CellDrill from './CellDrill.svelte';
  import { cue } from './audio.js';

  // Bankroll is the persisted one (#5): the table owns it during a round, the session owns it across reloads.
  const t = createTable({ shoe: createShoe({ seed: Date.now() }), bankroll: session.bankroll });
  const ACTIONS = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' };

  // The engine mutates a plain object in place; Svelte tracks by identity, so render from a
  // fresh snapshot re-taken after every action. ponytail: JSON clone — the round is tiny.
  let round = $state(null);
  let moves = $state([]);
  let bankroll = $state(t.bankroll);
  let lastBet = $state(0);
  let drillCell = $state(null); // a review miss clicked through to a targeted drill (#5)
  let skip = $state(false); // set by any input mid-deal; cleared when the next round starts
  const phase = $derived(round ? round.phase : 'betting');

  function sync() {
    round = t.round ? JSON.parse(JSON.stringify(t.round)) : null;
    moves = t.legalMoves();
    bankroll = t.bankroll;
    session.bankroll = t.bankroll;
  }
  // Every settled round feeds its decisions to Leitner + the heatmap, then saves (#5).
  let gradedRound = null;
  const act = (fn) => {
    fn();
    sync();
    if (t.round?.phase === 'done' && gradedRound !== t.round) {
      gradedRound = t.round;
      gradeRound(t.round.decisions);
      persist();
      cue(t.round.decisions.every((d) => d.correct) ? 'correct' : 'wrong');
    }
  };
  const deal = (bet) => { lastBet = bet; skip = false; cue('chip'); act(() => t.deal(bet)); };
  const move = (code) => { skip = true; cue('deal'); act(() => ({ H: t.hit, S: t.stand, D: t.double, P: t.split, R: t.surrender })[code]()); };
  const canRebet = $derived(phase === 'done' && lastBet > 0 && lastBet <= bankroll);
  // Every action has a key: H/S/D/P/R play the hand, Enter deals the next one. Keys are gated by
  // the same legal-move list as the buttons, so the keyboard can never make an illegal play.
  const onkey = (e) => {
    if (e.target.tagName === 'INPUT') return;
    const code = e.key.toUpperCase();
    if (phase === 'player' && moves.includes(code)) {
      e.preventDefault();
      move(code);
    } else if (e.key === 'Enter' && canRebet && e.target.tagName !== 'BUTTON') {
      deal(lastBet);
    }
  };
</script>

<svelte:window onkeydown={onkey} onpointerdown={() => (skip = true)} />

<div class="layout">
<div class="felt" class:skip>
  <header><span>Bankroll <b>${bankroll}</b></span></header>

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
          <button onclick={() => move(code)}>{ACTIONS[code]}</button>
        {/each}
      </div>
    {:else if phase === 'done'}
      <p class="result" class:win={round.net > 0} class:lose={round.net < 0}>
        {round.net > 0 ? `Won $${round.net}` : round.net < 0 ? `Lost $${-round.net}` : 'Push'}
      </p>
      {#if canRebet}
        <button class="next" onclick={() => deal(lastBet)}>Next hand (Enter) — ${lastBet}</button>
      {/if}
      <ChipStack {bankroll} {lastBet} onDeal={deal} />
    {:else}
      <ChipStack {bankroll} {lastBet} onDeal={deal} />
    {/if}
  </footer>
</div>

{#if phase === 'done' && round?.decisions.length}
  <Review decisions={round.decisions} onCell={(c) => (drillCell = c)} />
{/if}

{#if drillCell}
  <CellDrill cell={drillCell} onClose={() => (drillCell = null)} />
{/if}
</div>

<style>
  /* Felt + review side by side on desktop; review wraps below the felt on narrow screens. */
  .layout {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: flex-start;
    justify-content: center;
    max-width: 1120px;
    margin: 1.5rem auto;
    padding: 0 1rem;
  }
  .felt {
    flex: 1 1 560px;
    max-width: 720px;
    padding: 1.5rem;
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    align-items: center;
    justify-content: space-between;
    background: radial-gradient(circle at 50% 30%, var(--felt), var(--felt-edge));
    border: 6px solid var(--felt-edge);
    border-radius: 1rem;
  }
  header { align-self: stretch; color: var(--on-felt); }
  header b { color: var(--on-felt-strong); }
  .spots { display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center; }
  footer { display: flex; flex-direction: column; gap: 0.8rem; align-items: center; }
  .moves { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
  .moves button {
    padding: 0.6rem 1rem; border: none; border-radius: 0.4rem;
    background: var(--btn); color: var(--on-btn); font-weight: 600; cursor: pointer;
  }
  .result { font-size: 1.3rem; font-weight: 700; color: var(--push); margin: 0; }
  .result.win { color: var(--win); }
  .result.lose { color: var(--lose); }
  /* "Any input skips to the resolved state": drop every in-flight card animation and flip.
     Svelte's fly/fade compile to CSS animations, so clearing them lands each card at its
     final position rather than rewinding it. */
  .felt.skip :global(*) {
    animation: none !important;
    transition: none !important;
  }
  .next {
    padding: 0.6rem 1.2rem; border: none; border-radius: 0.4rem;
    background: var(--btn); color: var(--on-btn); font-weight: 700; cursor: pointer;
  }
</style>
