<script>
  // Mode 1: single-spot strategy play-table (SPEC §5.1). Wires the pure round engine to the UI:
  // play a full round, get the graded recap (#4), feed the SRS (#5).
  //
  // Motion (#10 F5): cards deal in staggered from the shoe, the hole card flips at settle, and
  // ANY input immediately resolves the choreography — the .skip class kills in-flight animations
  // so an impatient player never waits on a flourish.
  //
  // Editorial skin (DESIGN-SPEC §5.4): the felt is one flat green panel with a hairline inset
  // frame, and it holds nothing but the game. The money moves out above it, the actions move out
  // below it, and the review sits alongside as a ledger.
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
  const SHOE_SIZE = t.shoe.cardsRemaining; // a full shoe, read before a card leaves it

  // The engine mutates a plain object in place; Svelte tracks by identity, so render from a
  // fresh snapshot re-taken after every action. ponytail: JSON clone — the round is tiny.
  let round = $state(null);
  let moves = $state([]);
  let bankroll = $state(t.bankroll);
  let lastBet = $state(0);
  let liveBet = $state(0); // the bet being built on the chips, so the header can show it
  let dealt = $state(0);
  let drillCell = $state(null); // a review miss clicked through to a targeted drill (#5)
  let skip = $state(false); // set by any input mid-deal; cleared when the next round starts
  const phase = $derived(round ? round.phase : 'betting');
  // What is at stake right now: the round's wagers once it is dealt, the chips before that.
  const stake = $derived(round ? round.hands.reduce((s, h) => s + h.bet, 0) : liveBet);

  function sync() {
    round = t.round ? JSON.parse(JSON.stringify(t.round)) : null;
    moves = t.legalMoves();
    bankroll = t.bankroll;
    dealt = SHOE_SIZE - t.shoe.cardsRemaining;
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

<div class="play">
  <section class="table" aria-label="Table">
    <h1 class="sr-only">Play</h1>

    <div class="meta">
      <div class="figures">
        <span class="item">Bankroll <b>${bankroll}</b></span>
        <span class="item">Bet <b>${stake}</b></span>
      </div>
      <span class="shoe">Shoe · {dealt} of {SHOE_SIZE} dealt</span>
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
            <ChipStack {bankroll} {lastBet} onDeal={deal} bind:bet={liveBet} />
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
      {:else if canRebet}
        <button class="action primary wide" onclick={() => deal(lastBet)}>
          Next hand (Enter) — ${lastBet}
        </button>
      {/if}
    </div>
  </section>

  {#if phase === 'done' && round?.decisions.length}
    <Review decisions={round.decisions} net={round.net} onCell={(c) => (drillCell = c)} />
  {/if}

  {#if drillCell}
    <CellDrill cell={drillCell} onClose={() => (drillCell = null)} />
  {/if}
</div>

<style>
  .play {
    max-width: var(--content); margin: 0 auto; padding: 40px var(--pad) 48px;
    display: grid; grid-template-columns: repeat(12, minmax(0, 1fr));
    column-gap: var(--gutter); row-gap: var(--s-5);
    align-items: start; text-align: left;
  }
  .table { grid-column: 1 / span 8; display: flex; flex-direction: column; gap: 20px; }

  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

  /* ── The money line, above the felt ── */
  .meta { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-3); }
  .figures { display: flex; gap: 28px; align-items: baseline; }
  .item { font-size: 14px; color: var(--text); }
  .item b {
    font-family: var(--heading); font-size: 24px; font-weight: 500;
    color: var(--text-h); margin-left: 6px; font-variant-numeric: tabular-nums;
  }
  .shoe { font-family: var(--mono); font-size: 12px; color: var(--text); }

  /* ── The felt: one flat panel, a hairline frame inside it, nothing else ── */
  .felt {
    display: flex; padding: 12px; border-radius: var(--r-lg);
    background: var(--felt); min-height: 60vh;
  }
  .inner {
    flex: 1; box-sizing: border-box;
    border: 1px solid var(--felt-inset); border-radius: var(--r-md);
    padding: 40px 32px;
    display: flex; flex-direction: column; justify-content: space-between; align-items: center;
    gap: var(--s-4);
  }
  .zone { display: flex; flex-direction: column; align-items: center; gap: var(--s-4); }
  .bottom { margin-top: auto; }
  .spots { display: flex; gap: var(--s-5); flex-wrap: wrap; justify-content: center; }

  /* ── Actions, below the felt ── */
  .controls { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  .action {
    height: 56px; display: flex; align-items: center; justify-content: center; gap: 10px;
    border: 1px solid var(--text-h); border-radius: var(--r-sm); background: none;
    color: var(--text-h); font: inherit; font-size: 16px; font-weight: 500; cursor: pointer;
  }
  .action:hover { background: var(--hover); }
  .key { font-family: var(--mono); font-size: 12px; font-weight: 400; color: var(--text); }
  .primary { background: var(--accent); border-color: var(--accent); color: var(--on-btn); }
  .primary:hover { background: var(--accent); opacity: 0.9; }
  .wide { grid-column: 1 / -1; }

  /* "Any input skips to the resolved state": drop every in-flight card animation and flip.
     Svelte's fly/fade compile to CSS animations, so clearing them lands each card at its
     final position rather than rewinding it. */
  .felt.skip :global(*) {
    animation: none !important;
    transition: none !important;
  }

  @media (max-width: 960px) {
    .play { grid-template-columns: 1fr; }
    .table { grid-column: 1; }
  }
  @media (max-width: 560px) {
    .felt { min-height: 0; padding: 8px; }
    .inner { padding: 20px 12px; gap: var(--s-3); }
    .controls { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .action { height: 48px; }
  }
</style>
