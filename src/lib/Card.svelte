<script>
  // SVG stylized-suited card (SPEC §11 F4): corner rank+suit, one center glyph, no image assets.
  // Suit is cosmetic only (irrelevant to strategy) — engine cards carry no suit, so it's a prop.
  let { rank, suit = '♠', faceDown = false } = $props();
  const red = $derived(suit === '♥' || suit === '♦');
  const label = $derived(rank === 'A' ? 'A' : String(rank));
</script>

<div class="card" class:red class:down={faceDown} role="img"
     aria-label={faceDown ? 'face-down card' : `${label} of ${suit}`}>
  {#if !faceDown}
    <span class="corner tl">{label}<br />{suit}</span>
    <span class="pip">{suit}</span>
    <span class="corner br">{label}<br />{suit}</span>
  {/if}
</div>

<style>
  .card {
    position: relative;
    width: 3.2rem;
    height: 4.6rem;
    border-radius: 0.4rem;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    box-shadow: var(--shadow);
    color: var(--card-ink);
    font-family: var(--heading);
    flex: none;
  }
  .card.red { color: var(--card-red); }
  .card.down {
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
</style>
