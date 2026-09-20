<script>
  // Progress view (#5): the strategy grid with its two faces — the canonical reference chart and
  // the accuracy heatmap — plus the bucket snapshot. Clicking any cell drills that situation.
  //
  // Editorial skin (DESIGN-SPEC §5.8): the route leads with its own heading now that the shell
  // prints none, and the side column is the dashboard's hairline list — the bucket counts moved
  // here off the dashboard, where they were a row of little boxes.
  import Chart from './Chart.svelte';
  import CellDrill from './CellDrill.svelte';
  import { bucketCounts, recentAccuracy, session } from './session.svelte.js';
  import { money } from './money.js';

  let drillCell = $state(null);
  let view = $state('accuracy');
  const counts = $derived(bucketCounts());
  const recent = $derived(recentAccuracy(50));
  const pct = (n) => (n === null ? '—' : `${Math.round(n * 100)}%`);
</script>

<div class="progress">
  <header class="head">
    <h1>Progress</h1>
  </header>

  <div class="grid">
    <Chart bind:view onCell={(c) => (drillCell = c)} />
  </div>

  <aside class="side" aria-label="Your progress">
    <dl class="rows">
      {#each Object.entries(counts) as [bucket, n] (bucket)}
        <div><dt>{bucket}</dt><dd>{n}</dd></div>
      {/each}
      <div><dt>Last 50 decisions</dt><dd>{pct(recent)}</dd></div>
      <div><dt>Bankroll</dt><dd>{money(session.bankroll)}</dd></div>
    </dl>
    <p class="hint">Click any cell to drill that exact situation.</p>
  </aside>
</div>

{#if drillCell}
  <CellDrill cell={drillCell} onClose={() => (drillCell = null)} />
{/if}

<style>
  .progress {
    max-width: var(--content); margin: 0 auto; padding: 40px var(--pad) 48px;
    display: grid; grid-template-columns: repeat(12, minmax(0, 1fr));
    column-gap: var(--gutter); row-gap: var(--s-5);
    align-items: start; text-align: left;
  }
  .head { grid-column: 1 / -1; }
  h1 { margin: 0; font-size: 40px; font-weight: 500; letter-spacing: -0.02em; }

  .grid { grid-column: 1 / span 8; }
  .side { grid-column: 9 / span 4; display: flex; flex-direction: column; gap: var(--s-3); }

  .rows { margin: 0; border-top: 1px solid var(--rule); }
  .rows div {
    display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-3);
    padding: 14px 0; border-bottom: 1px solid var(--border);
  }
  dt { font-size: 14px; color: var(--text); }
  dd {
    margin: 0; font-family: var(--heading); font-size: 24px; font-weight: 500;
    color: var(--text-h); font-variant-numeric: tabular-nums;
  }
  .hint { font-size: 14px; color: var(--text); }

  @media (max-width: 960px) {
    .progress { grid-template-columns: 1fr; row-gap: var(--s-4); }
    .grid, .side, .head { grid-column: 1; }
  }
</style>
