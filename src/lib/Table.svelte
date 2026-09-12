<script>
  // Mode 1: single-spot strategy play-table (SPEC §5.1). Wires the pure round engine to the
  // UI. No grading recap yet (#4) and no count display yet (#8) — just play full rounds.
  import { createShoe } from '../engine/shoe.js';
  import { createTable } from '../engine/round.js';
  import HandView from './HandView.svelte';
  import ChipStack from './ChipStack.svelte';

  const t = createTable({ shoe: createShoe({ seed: Date.now() }), bankroll: 1000 });
  const ACTIONS = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' };

  // The engine mutates a plain object in place; Svelte tracks by identity, so render from a
  // fresh snapshot re-taken after every action. ponytail: JSON clone — the round is tiny.
  let round = $state(null);
  let moves = $state([]);
  let bankroll = $state(t.bankroll);
  let lastBet = $state(0);
  const phase = $derived(round ? round.phase : 'betting');

  function sync() {
    round = t.round ? JSON.parse(JSON.stringify(t.round)) : null;
    moves = t.legalMoves();
    bankroll = t.bankroll;
  }
  const act = (fn) => { fn(); sync(); };
  const deal = (bet) => { lastBet = bet; act(() => t.deal(bet)); };
  const move = (code) => act(() => ({ H: t.hit, S: t.stand, D: t.double, P: t.split, R: t.surrender })[code]());
</script>

<div class="felt">
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
      <ChipStack {bankroll} {lastBet} onDeal={deal} />
    {:else}
      <ChipStack {bankroll} {lastBet} onDeal={deal} />
    {/if}
  </footer>
</div>

<style>
  .felt {
    max-width: 720px;
    margin: 1.5rem auto;
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
  header { align-self: stretch; color: #e8f3ec; }
  header b { color: #fff; }
  .spots { display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center; }
  footer { display: flex; flex-direction: column; gap: 0.8rem; align-items: center; }
  .moves { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
  .moves button {
    padding: 0.6rem 1rem; border: none; border-radius: 0.4rem;
    background: var(--btn); color: #fff; font-weight: 600; cursor: pointer;
  }
  .result { font-size: 1.3rem; font-weight: 700; color: var(--push); margin: 0; }
  .result.win { color: var(--win); }
  .result.lose { color: var(--lose); }
</style>
