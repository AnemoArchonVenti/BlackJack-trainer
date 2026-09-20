<script>
  // Renders one hand as a row of Cards with its total. hideHole draws the 2nd card face down
  // (dealer's hole while the player acts). Suit is assigned cosmetically per card index.
  //
  // Motion (SPEC §11 F5): each card deals in from the shoe position — up and to the right of the
  // felt — with a per-card stagger, so a deal reads as a deal and the dealer's play-out lands one
  // card at a time. Reduced motion cross-fades instead; Off is instant. One transition function
  // switches on the resolved preference, so there is a single place that decides how a card arrives.
  //
  // Editorial skin (DESIGN-SPEC §5.4): the hand says what it is in words — "Dealer shows 4",
  // "You hold hard 15" — instead of wearing a coloured ring. Active, won, lost and pushed are all
  // said in the caption, so nothing on the felt is outlined or boxed.
  import { fly, fade } from 'svelte/transition';
  import Card from './Card.svelte';
  import { value, isSoft } from '../engine/hand.js';
  import { motion } from './session.svelte.js';

  let {
    hand,
    role = 'player',
    hideHole = false,
    outcome = '',
    active = false,
    bet = 0,
    index = null,
    split = false,
    net = null,
  } = $props();

  const SUITS = ['♠', '♥', '♣', '♦']; // cosmetic only
  const total = $derived(hideHole ? value([hand[0]]) : value(hand));

  const money = (n) => `$${Math.abs(n)}`;
  const OUTCOME = { win: 'Won', lose: 'Lost', push: 'Push' };

  // The caption is the whole status line: who holds what, or how it settled.
  const caption = $derived.by(() => {
    if (role === 'dealer') return hideHole ? 'Dealer shows' : 'Dealer has';
    if (outcome && OUTCOME[outcome]) {
      const word = OUTCOME[outcome];
      return outcome === 'push' || net === null ? word : `${word} ${money(net)}`;
    }
    if (split) return `Hand ${index + 1} · ${money(bet)}`;
    return `You hold ${isSoft(hand) ? 'soft' : 'hard'}`;
  });

  const SHOE = { x: 180, y: -160 }; // where the shoe sits relative to a spot

  function dealIn(node, { index: i = 0 } = {}) {
    const m = motion();
    if (!m.duration) return {}; // Off: no animation at all, not a zero-length one
    return m.fly
      ? fly(node, { ...SHOE, duration: m.duration, delay: i * m.stagger, opacity: 0.3 })
      : fade(node, { duration: m.duration });
  }
</script>

<div class="hand" class:top={role === 'dealer'}>
  {#if role === 'dealer'}
    <span class="caption" class:active>
      <i class="text {outcome}">{caption}</i>
      <b class="total">{total}{hideHole ? '+' : ''}</b>
    </span>
  {/if}

  <div class="cards">
    {#each hand as card, i (i)}
      <div class="slot" in:dealIn={{ index: i }}>
        <Card rank={card.rank} suit={SUITS[i % 4]} faceDown={hideHole && i === 1} />
      </div>
    {/each}
  </div>

  {#if role !== 'dealer'}
    <span class="caption" class:active>
      <i class="text {outcome}">{caption}</i>
      <b class="total" class:active>{total}</b>
    </span>
  {/if}
</div>

<style>
  .hand { display: flex; flex-direction: column; gap: 14px; align-items: center; }
  .cards { display: flex; gap: 10px; }
  .slot { display: flex; }

  .caption {
    display: inline-flex; align-items: baseline; gap: 8px;
    font-family: var(--heading); color: var(--on-felt);
  }
  .text { font-style: italic; font-size: 18px; font-weight: 400; }
  .caption.active .text { color: var(--on-felt-strong); }

  .total {
    font-size: 26px; font-weight: 600; font-style: normal;
    color: var(--on-felt-strong); font-variant-numeric: tabular-nums;
  }
  /* The hand you are acting on is the one wearing the light: its total inverts. */
  .total.active {
    background: var(--on-felt-strong); color: var(--felt);
    padding: 0 8px; border-radius: var(--r-sm);
  }

  /* Money colours are mixed toward the felt's own ink before they land on green — the raw
     --win is the felt colour itself, and raw --lose does not carry on it either. */
  .text.win { color: color-mix(in oklab, var(--win) 30%, var(--on-felt-strong)); }
  .text.lose { color: color-mix(in oklab, var(--lose) 45%, var(--on-felt-strong)); }
  .text.push { color: var(--on-felt-strong); }

  @media (max-width: 560px) {
    .hand { gap: 10px; }
    .cards { gap: 6px; }
    .text { font-size: 16px; }
    .total { font-size: 22px; }
  }
</style>
