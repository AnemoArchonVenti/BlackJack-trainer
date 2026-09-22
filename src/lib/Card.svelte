<script>
  // SVG-free stylised card (SPEC §11 F4): corner rank+suit, one centre glyph, no image assets,
  // everything themed from design tokens. Suit is cosmetic only (irrelevant to strategy) — engine
  // cards carry no suit, so it is a prop.
  //
  // Motion (F5): the face-down state is a real 3D flip, so the dealer's hole card turns over
  // instead of blinking. The duration comes from the motion preference; at Off it is 0ms and the
  // card simply is face up. A `.skip` ancestor kills the transition mid-flight (see Table).
  //
  // Editorial skin (DESIGN-SPEC §5.3): 92×130 with a hairline edge and no shadow. The back is a
  // brick panel inset inside a cream frame, the way a real card's back is printed short of its
  // edge, with a fine 45° hatch over it.
  import { motion } from './session.svelte.js';

  // What the corner prints, and what a screen reader says. They differ: the face is a single
  // glyph because that is how a card is printed, but "K of ♠" is not something a screen reader
  // can pronounce — it reads the letter and then silence where the suit should be.
  const SPOKEN_RANK = { A: 'ace', J: 'jack', Q: 'queen', K: 'king' };
  const SPOKEN_SUIT = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };

  let { rank, suit = '♠', faceDown = false } = $props();
  const red = $derived(suit === '♥' || suit === '♦');
  const label = $derived(String(rank));
  const spoken = $derived(`${SPOKEN_RANK[rank] ?? rank} of ${SPOKEN_SUIT[suit] ?? suit}`);
  const flipMs = motion().duration;
</script>

<div
  class="card"
  class:down={faceDown}
  style:--flip-ms="{flipMs}ms"
  role="img"
  aria-label={faceDown ? 'face-down card' : spoken}
>
  <div class="face front" class:red>
    <span class="corner tl">{label}<br /><span class="suit">{suit}</span></span>
    <span class="pip">{suit}</span>
    <span class="corner br">{label}<br /><span class="suit">{suit}</span></span>
  </div>
  <div class="face back"><span class="print"></span></div>
</div>

<style>
  .card {
    position: relative;
    width: 5.4rem;
    height: 7.6rem;
    flex: none;
    transform-style: preserve-3d;
    transition: transform var(--flip-ms) ease-out;
  }
  .card.down { transform: rotateY(180deg); }

  .face {
    position: absolute;
    inset: 0;
    border-radius: var(--r-md);
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    backface-visibility: hidden;
    font-family: var(--sans);
  }
  .front { color: var(--card-ink); }
  .front.red { color: var(--card-red); }

  .back { transform: rotateY(180deg); display: grid; place-items: center; }
  /* The printed panel stops 10px short of the card's edge, like a real back. */
  .print {
    position: absolute;
    inset: 10px;
    border-radius: 3px;
    background: var(--card-back);
    background-image: repeating-linear-gradient(45deg, transparent 0 5px, rgba(255, 255, 255, 0.14) 5px 10px);
  }

  .corner {
    position: absolute;
    font-size: 20px;
    line-height: 1;
    font-weight: 600;
    text-align: center;
  }
  .corner .suit { font-size: 16px; }
  .tl { top: 8px; left: 10px; }
  .br { bottom: 8px; right: 10px; transform: rotate(180deg); }
  .pip {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 40px;
  }

  @media (max-width: 560px) {
    .card { width: 4rem; height: 5.6rem; }
    .corner { font-size: 16px; }
    .corner .suit { font-size: 12px; }
    .pip { font-size: 28px; }
    .tl { top: 6px; left: 7px; }
    .br { bottom: 6px; right: 7px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .card { transition-duration: 0ms; }
  }
</style>
