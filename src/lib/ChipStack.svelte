<script>
  // Bet UI (SPEC §11 F9): click denomination chips to build a bet, Clear/Rebet/Deal.
  // Defaults to the last bet so flat-bet drilling is just repeated Deal.
  //
  // Editorial skin (DESIGN-SPEC §5.5): the stack lives in the felt's bottom area during the
  // betting phase. Because it sits on the green, the button pair inverts — a white rule and
  // white ink instead of the ink outline used on the page ground, and Deal is a white fill with
  // green text. The page's ink/green pair is unreadable on the felt; the intent (one primary,
  // one weight of outline) is what carries over.
  let { bankroll, lastBet = 0, onDeal, bet = $bindable(0) } = $props();
  const DENOMS = [1, 5, 25, 100];
  const COLORS = { 1: 'var(--chip-1)', 5: 'var(--chip-5)', 25: 'var(--chip-25)', 100: 'var(--chip-100)' };

  const add = (d) => { if (bet + d <= bankroll) bet += d; };
  const rebet = () => { if (lastBet && lastBet <= bankroll) bet = lastBet; };
  const deal = () => { if (bet > 0 && bet <= bankroll) { onDeal(bet); bet = 0; } };
</script>

<div class="chipstack">
  <div class="chips">
    {#each DENOMS as d (d)}
      <button class="chip" style="--c:{COLORS[d]}" disabled={bet + d > bankroll} onclick={() => add(d)}>
        ${d}
      </button>
    {/each}
  </div>
  <div class="row">
    <span class="bet">Bet ${bet}</span>
    <button class="ghost" onclick={() => (bet = 0)} disabled={bet === 0}>Clear</button>
    {#if lastBet}<button class="ghost" onclick={rebet}>Rebet ${lastBet}</button>{/if}
    <button class="deal" onclick={deal} disabled={bet === 0}>Deal</button>
  </div>
</div>

<style>
  .chipstack { display: flex; flex-direction: column; gap: var(--s-3); align-items: center; }
  .chips { display: flex; gap: var(--s-2); }

  .chip {
    width: 48px; height: 48px; border-radius: 50%;
    background: var(--c); color: var(--chip-ink);
    font: 600 14px var(--sans);
    border: 2px dashed color-mix(in oklab, var(--on-felt-strong) 55%, transparent);
    /* A cream rim, as a real chip has: --chip-25 is the felt's own green, so without an edge
       that denomination vanishes into the table. */
    outline: 2px solid var(--card-bg);
    cursor: pointer;
  }
  .chip:disabled { opacity: 0.35; cursor: not-allowed; }

  .row { display: flex; gap: var(--s-2); align-items: center; }
  .bet {
    font-family: var(--heading); font-size: 20px; font-weight: 500;
    color: var(--on-felt-strong); font-variant-numeric: tabular-nums;
    min-width: 6rem;
  }

  button { font: inherit; font-size: 15px; font-weight: 500; cursor: pointer; }
  .ghost {
    padding: 10px 16px; border-radius: var(--r-sm);
    border: 1px solid var(--on-felt); background: none; color: var(--on-felt-strong);
  }
  .ghost:hover:not(:disabled) { background: color-mix(in oklab, var(--on-felt-strong) 12%, transparent); }
  .deal {
    padding: 10px 20px; border-radius: var(--r-sm); border: 1px solid var(--on-felt-strong);
    background: var(--on-felt-strong); color: var(--felt);
  }
  button:disabled { opacity: 0.4; cursor: not-allowed; }

  @media (max-width: 560px) {
    .row { flex-wrap: wrap; justify-content: center; }
  }
</style>
