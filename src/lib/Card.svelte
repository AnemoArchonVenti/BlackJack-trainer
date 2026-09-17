<script>
  // SVG-free stylised card (SPEC §11 F4): corner rank+suit, one centre glyph, no image assets,
  // everything themed from design tokens. Suit is cosmetic only (irrelevant to strategy) — engine
  // cards carry no suit, so it is a prop.
  //
  // Motion (F5): the face-down state is a real 3D flip, so the dealer's hole card turns over
  // instead of blinking. The duration comes from the motion preference; at Off it is 0ms and the
  // card simply is face up. A `.skip` ancestor kills the transition mid-flight (see Table).
  import { motion } from './session.svelte.js';

  let { rank, suit = '♠', faceDown = false } = $props();
  const red = $derived(suit === '♥' || suit === '♦');
  const label = $derived(rank === 'A' ? 'A' : String(rank));
  const flipMs = motion().duration;
</script>

<div
  class="card"
  class:down={faceDown}
  style:--flip-ms="{flipMs}ms"
  role="img"
  aria-label={faceDown ? 'face-down card' : `${label} of ${suit}`}
>
  <div class="face front" class:red>
    <span class="corner tl">{label}<br />{suit}</span>
    <span class="pip">{suit}</span>
    <span class="corner br">{label}<br />{suit}</span>
  </div>
  <div class="face back"></div>
</div>

<style>
  .card {
    position: relative;
    width: 3.2rem;
    height: 4.6rem;
    flex: none;
    transform-style: preserve-3d;
    transition: transform var(--flip-ms) ease-out;
  }
  .card.down { transform: rotateY(180deg); }

  .face {
    position: absolute;
    inset: 0;
    border-radius: var(--r-sm);
    border: 1px solid var(--card-border);
    box-shadow: var(--shadow);
    backface-visibility: hidden;
    font-family: var(--heading);
  }
  .front { background: var(--card-bg); color: var(--card-ink); }
  .front.red { color: var(--card-red); }
  .back {
    transform: rotateY(180deg);
    background: var(--card-back);
    background-image: repeating-linear-gradient(45deg, transparent 0 6px, rgba(255, 255, 255, 0.12) 6px 12px);
  }

  .corner {
    position: absolute;
    font-size: 0.78rem;
    line-height: 0.85;
    font-weight: 700;
    text-align: center;
  }
  .tl { top: 0.22rem; left: 0.28rem; }
  .br { bottom: 0.22rem; right: 0.28rem; transform: rotate(180deg); }
  .pip {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 1.7rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .card { transition-duration: 0ms; }
  }
</style>
