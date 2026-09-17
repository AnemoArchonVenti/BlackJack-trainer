<script>
  // Renders one hand as a row of Cards with its total. hideHole draws the 2nd card face down
  // (dealer's hole while the player acts). Suit is assigned cosmetically per card index.
  //
  // Motion (SPEC §11 F5): each card deals in from the shoe position — up and to the right of the
  // felt — with a per-card stagger, so a deal reads as a deal and the dealer's play-out lands one
  // card at a time. Reduced motion cross-fades instead; Off is instant. One transition function
  // switches on the resolved preference, so there is a single place that decides how a card arrives.
  import { fly, fade } from 'svelte/transition';
  import Card from './Card.svelte';
  import { value } from '../engine/hand.js';
  import { motion } from './session.svelte.js';

  let { hand, label = '', hideHole = false, outcome = '' } = $props();
  const SUITS = ['♠', '♥', '♣', '♦']; // cosmetic only
  const total = $derived(hideHole ? value([hand[0]]) : value(hand));

  const SHOE = { x: 180, y: -160 }; // where the shoe sits relative to a spot

  function dealIn(node, { index = 0 } = {}) {
    const m = motion();
    if (!m.duration) return {}; // Off: no animation at all, not a zero-length one
    return m.fly
      ? fly(node, { ...SHOE, duration: m.duration, delay: index * m.stagger, opacity: 0.3 })
      : fade(node, { duration: m.duration });
  }
</script>

<div class="hand">
  {#if label}<span class="label">{label} <b>{total}{hideHole ? '+' : ''}</b></span>{/if}
  <div class="cards" class:outcome={!!outcome} data-outcome={outcome}>
    {#each hand as card, i (i)}
      <div class="slot" in:dealIn={{ index: i }}>
        <Card rank={card.rank} suit={SUITS[i % 4]} faceDown={hideHole && i === 1} />
      </div>
    {/each}
  </div>
</div>

<style>
  .hand { display: flex; flex-direction: column; gap: 0.4rem; align-items: center; }
  .label { font-size: 0.85rem; color: var(--on-felt); }
  .label b { color: var(--on-felt-strong); }
  .cards { display: flex; gap: 0.35rem; padding: 0.25rem; border-radius: var(--r-md); }
  .slot { display: flex; }
  .cards.outcome[data-outcome='win'] { box-shadow: 0 0 0 2px var(--win); }
  .cards.outcome[data-outcome='lose'] { box-shadow: 0 0 0 2px var(--lose); }
  .cards.outcome[data-outcome='push'] { box-shadow: 0 0 0 2px var(--push); }
  .cards.outcome[data-outcome='active'] { box-shadow: 0 0 0 2px var(--accent); }
</style>
