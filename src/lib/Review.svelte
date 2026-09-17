<script>
  // End-of-round graded recap (SPEC §11 F6): every decision with ✓/✗, the correct action, and the
  // heuristic "why". Slides in beside the felt (desktop) / below it (mobile). Engine already graded
  // each decision (round.js record()); this just renders and pulls the reason text.
  import { explain } from '../engine/reasons.js';
  import { cellFor } from '../engine/strategy.js';
  import { cellStats } from './session.svelte.js';

  let { decisions = [], onCell = null } = $props();

  const LABEL = {
    H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender',
    Ds: 'Double (else stand)', Rh: 'Surrender (else hit)',
  };
  // A miss also shows its chart cell, tying the mistake to the heatmap mental model (#5 F6).
  // Clicking the cell launches a targeted drill of that exact situation.
  const ROW = {
    hard: (k) => (k === 17 ? '17+' : `${k}`),
    soft: (k) => `A,${k}`,
    pair: (k) => (k === 11 ? 'A,A' : `${k},${k}`),
  };
  const cellLabel = (c) => `${ROW[c.type](c.key)} vs ${c.up === 11 ? 'A' : c.up}`;
  const cellKey = (c) => `${c.type}-${c.key}-${c.up}`;
  const hint = (s) => (s.attempts ? `${s.correct}/${s.attempts} correct here · ${s.bucket}` : 'first look at this cell');
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
            {@const cell = cellFor(d.hand, d.upcard)}
            <b>You {LABEL[d.chosen]}</b> — correct: <b>{LABEL[d.correctAction]}</b>
            <br />
            <button
              class="chartcell a-{d.correctAction}"
              onclick={() => onCell?.(cell)}
              disabled={!onCell}
              title={hint(cellStats(cellKey(cell)))}
            >{cellLabel(cell)} <b>{d.correctAction}</b></button>
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
  .chartcell {
    display: inline-flex; gap: 0.35rem; align-items: center; margin-top: 0.3rem;
    padding: 0.12rem 0.45rem; border: 1px solid var(--card-border); border-radius: 3px;
    font: 600 0.72rem var(--sans); color: var(--card-ink); cursor: pointer;
  }
  .chartcell:disabled { cursor: default; }
  .chartcell b { font-weight: 800; }
  .chartcell.a-H { background: var(--act-hit); }
  .chartcell.a-S { background: var(--act-stand); }
  .chartcell.a-D, .chartcell.a-Ds { background: var(--act-double); }
  .chartcell.a-P { background: var(--act-split); }
  .chartcell.a-Rh { background: var(--act-surrender); }
</style>
