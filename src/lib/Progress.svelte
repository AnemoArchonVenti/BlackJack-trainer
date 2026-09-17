<script>
  // Progress view (#5): the strategy grid with its two faces — the canonical reference chart and
  // the accuracy heatmap — plus the bucket snapshot. Clicking any cell drills that situation.
  import Chart from './Chart.svelte';
  import CellDrill from './CellDrill.svelte';
  import { bucketCounts, recentAccuracy, session } from './session.svelte.js';

  let drillCell = $state(null);
  let view = $state('accuracy');
  const counts = $derived(bucketCounts());
  const recent = $derived(recentAccuracy(50));
</script>

<section class="progress">
  <div class="grid">
    <Chart bind:view onCell={(c) => (drillCell = c)} />
  </div>

  <aside class="side">
    <h2>Progress</h2>
    <dl class="buckets">
      {#each Object.entries(counts) as [bucket, n] (bucket)}
        <div><dt>{bucket}</dt><dd>{n}</dd></div>
      {/each}
    </dl>
    <p class="recent">
      Last 50 decisions: <b>{recent === null ? '—' : `${Math.round(recent * 100)}%`}</b>
    </p>
    <p class="bankroll">Bankroll <b>${session.bankroll}</b></p>
    <p class="hint">Click any cell to drill that exact situation.</p>

    {#if drillCell}
      <CellDrill cell={drillCell} onClose={() => (drillCell = null)} />
    {/if}
  </aside>
</section>

<style>
  .progress {
    display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: flex-start;
    justify-content: center; max-width: 1120px; margin: 1.5rem auto; padding: 0 1rem;
  }
  .grid { flex: 1 1 460px; }
  .side { flex: 0 1 260px; display: flex; flex-direction: column; gap: 0.7rem; text-align: left; }
  h2 { margin: 0; font-size: 1.05rem; }
  .buckets { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0; }
  .buckets div {
    border: 1px solid var(--border); border-radius: var(--r-sm);
    padding: 0.3rem 0.5rem; min-width: 4.4rem;
  }
  dt { font-size: 0.7rem; color: var(--text); }
  dd { margin: 0; font-weight: 700; color: var(--text-h); }
  .recent, .bankroll { font-size: 0.85rem; margin: 0; }
  .recent b, .bankroll b { color: var(--text-h); }
  .hint { font-size: 0.75rem; opacity: 0.75; margin: 0; }
</style>
