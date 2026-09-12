<script>
  // End-of-round graded recap (SPEC §11 F6): every decision with ✓/✗, the correct action, and the
  // heuristic "why". Slides in beside the felt (desktop) / below it (mobile). Engine already graded
  // each decision (round.js record()); this just renders and pulls the reason text.
  import { explain } from '../engine/reasons.js';

  let { decisions = [] } = $props();
  const LABEL = {
    H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender',
    Ds: 'Double (else stand)', Rh: 'Surrender (else hit)',
  };
</script>

<aside class="review" aria-live="polite" aria-label="Round review">
  <h2>How you played</h2>
  <ol>
    {#each decisions as d, i (i)}
      <li class:wrong={!d.correct}>
        <span class="mark" aria-hidden="true">{d.correct ? '✓' : '✗'}</span>
        <div class="detail">
          {#if d.correct}
            <b>{LABEL[d.chosen]}</b>
          {:else}
            <b>You {LABEL[d.chosen]}</b> — correct: <b>{LABEL[d.correctAction]}</b>
            <!-- ponytail: the tiny heatmap chart-cell for a miss is #5 (heatmap mental model), not built yet. -->
          {/if}
          <p class="why">{explain(d.hand, d.upcard, d.correctAction)}</p>
        </div>
      </li>
    {/each}
  </ol>
</aside>

<style>
  .review {
    flex: 1 1 280px;
    max-width: 360px;
    background: var(--card-bg);
    color: var(--card-ink);
    border-radius: 1rem;
    padding: 1rem 1.2rem;
    box-shadow: var(--shadow);
    align-self: stretch;
  }
  h2 { margin: 0 0 0.6rem; font-size: 1.05rem; }
  ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.7rem; }
  li { display: flex; gap: 0.6rem; align-items: flex-start; }
  .mark { font-weight: 800; font-size: 1.1rem; color: var(--win); line-height: 1.3; }
  li.wrong .mark { color: var(--lose); }
  .detail { font-size: 0.9rem; }
  .why { margin: 0.15rem 0 0; opacity: 0.8; font-size: 0.82rem; line-height: 1.35; }
</style>
