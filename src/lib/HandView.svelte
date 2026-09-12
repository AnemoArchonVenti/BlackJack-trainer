<script>
  // Renders one hand as a row of Cards with its total. hideHole draws the 2nd card face down
  // (dealer's hole while the player acts). Suit is assigned cosmetically per card index.
  import Card from './Card.svelte';
  import { value } from '../engine/hand.js';

  let { hand, label = '', hideHole = false, outcome = '' } = $props();
  const SUITS = ['♠', '♥', '♣', '♦']; // cosmetic only
  const total = $derived(hideHole ? value([hand[0]]) : value(hand));
</script>

<div class="hand">
  {#if label}<span class="label">{label} <b>{total}{hideHole ? '+' : ''}</b></span>{/if}
  <div class="cards" class:outcome={!!outcome} data-outcome={outcome}>
    {#each hand as card, i (i)}
      <Card rank={card.rank} suit={SUITS[i % 4]} faceDown={hideHole && i === 1} />
    {/each}
  </div>
</div>

<style>
  .hand { display: flex; flex-direction: column; gap: 0.4rem; align-items: center; }
  .label { font-size: 0.85rem; color: #e8f3ec; }
  .label b { color: #fff; }
  .cards { display: flex; gap: 0.35rem; padding: 0.25rem; border-radius: 0.5rem; }
  .cards.outcome[data-outcome='win'] { box-shadow: 0 0 0 2px var(--win); }
  .cards.outcome[data-outcome='lose'] { box-shadow: 0 0 0 2px var(--lose); }
  .cards.outcome[data-outcome='push'] { box-shadow: 0 0 0 2px var(--push); }
</style>
