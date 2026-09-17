<script>
  // Minimal app shell hosting Mode 1 + the progress view (SPEC §11). #10 later replaces this with
  // the real nav/dashboard shell and consolidates tokens/motion — not a hard dependency.
  import Table from './lib/Table.svelte';
  import Progress from './lib/Progress.svelte';

  let view = $state('play');
  const VIEWS = [['play', 'Play'], ['progress', 'Progress']];
</script>

<main>
  <h1>Blackjack Trainer</h1>
  <nav>
    {#each VIEWS as [id, label] (id)}
      <button class:on={view === id} onclick={() => (view = id)}>{label}</button>
    {/each}
  </nav>

  {#if view === 'play'}<Table />{:else}<Progress />{/if}
</main>

<style>
  main { padding: 0 1rem 2rem; }
  h1 { text-align: center; color: var(--text-h); font-size: 1.4rem; margin: 1rem 0 0; }
  nav { display: flex; gap: 0.3rem; justify-content: center; margin-top: 0.8rem; }
  nav button {
    padding: 0.35rem 0.9rem; border: 1px solid var(--border); background: none; color: inherit;
    border-radius: var(--r-sm); cursor: pointer; font: inherit; font-size: 0.85rem;
  }
  nav button.on { background: var(--accent-bg); border-color: var(--accent-border); color: var(--text-h); }
</style>
