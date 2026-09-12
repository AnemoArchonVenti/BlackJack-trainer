<script>
  // Bet UI (SPEC §11 F9): click denomination chips to build a bet, Clear/Rebet/Deal.
  // Defaults to the last bet so flat-bet drilling is just repeated Deal.
  let { bankroll, lastBet = 0, onDeal } = $props();
  const DENOMS = [1, 5, 25, 100];
  const COLORS = { 1: '#6b7a8f', 5: '#c0392b', 25: '#27ae60', 100: '#2c3e50' };
  let bet = $state(0);

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
    <button onclick={() => (bet = 0)} disabled={bet === 0}>Clear</button>
    {#if lastBet}<button onclick={rebet}>Rebet ${lastBet}</button>{/if}
    <button class="deal" onclick={deal} disabled={bet === 0}>Deal</button>
  </div>
</div>

<style>
  .chipstack { display: flex; flex-direction: column; gap: 0.6rem; align-items: center; }
  .chips { display: flex; gap: 0.5rem; }
  .chip {
    width: 3rem; height: 3rem; border-radius: 50%;
    background: var(--c); color: var(--chip-ink); font-weight: 700;
    border: 3px dashed rgba(255, 255, 255, 0.55); cursor: pointer;
  }
  .chip:disabled { opacity: 0.35; cursor: not-allowed; }
  .row { display: flex; gap: 0.5rem; align-items: center; }
  .bet { color: #fff; font-weight: 700; min-width: 5rem; }
  .deal { background: var(--btn); color: #fff; }
  button { padding: 0.4rem 0.8rem; border-radius: 0.4rem; border: none; cursor: pointer; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
