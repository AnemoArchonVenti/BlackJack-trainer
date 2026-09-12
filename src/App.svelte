<script>
  // Minimal app shell hosting Mode 1 (SPEC §11). #10 later replaces this with the real
  // nav/dashboard shell and consolidates tokens/motion — not a hard dependency.
  import Table from './lib/Table.svelte';
</script>

<main>
  <h1>Blackjack Trainer</h1>
  <Table />
</main>

<style>
  main { padding: 0 1rem 2rem; }
  h1 { text-align: center; color: var(--text-h); font-size: 1.4rem; margin: 1rem 0 0; }
</style>
